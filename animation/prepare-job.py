"""Prepare measured speech, real Edge word boundaries and a shared scene plan.

Piper is an explicitly configured offline alternative, with estimated word timing.
A target duration is a pacing goal; narration is never silently cut to fit it.
"""
import asyncio
import json
import math
import os
import re
import shutil
import subprocess
from pathlib import Path

from mutagen.mp3 import MP3
from speech_timing import edge_speech, estimate_words, validate_words, rhubarb_cues

ROOT = Path(__file__).resolve().parent
FPS = 24
VOICES = {'de': {'female': 'de-DE-KatjaNeural', 'male': 'de-DE-ConradNeural'},
          'en': {'female': 'en-US-JennyNeural', 'male': 'en-US-GuyNeural'}}




async def main():
    script = os.environ.get('SCRIPT', '').strip()
    for marker in ('[[VECTOR_2D]]', '[[ASPECT_16_9]]'):
        if script.startswith(marker):
            script = script[len(marker):].strip()
            if marker == '[[ASPECT_16_9]]':
                os.environ['ASPECT_RATIO'] = '16:9'
    lang = os.environ.get('LANGUAGE', 'de')
    aspect = os.environ.get('ASPECT_RATIO', '9:16')
    gender = os.environ.get('VOICE', 'female')
    engine = os.environ.get('TTS_ENGINE', 'edge')
    target_duration = os.environ.get('TARGET_DURATION', 'auto')
    if aspect not in ('9:16', '16:9') or lang not in VOICES or gender not in ('male', 'female'):
        raise ValueError('Invalid language, aspect ratio or voice')
    if target_duration not in ('auto', '15', '30', '60', '180', '300', '600'):
        raise ValueError('Invalid target duration')
    if not script or len(script) > 12000:
        raise ValueError('Script must contain 1–12000 characters')
    # Use exactly the same splitter as the renderer, never silently truncate.
    result = subprocess.run(['node', '--input-type=module', '-e',
        "import {splitScript} from './scene-plan.mjs'; let s=''; for await(const c of process.stdin)s+=c; console.log(JSON.stringify(splitScript(s)));"],
        input=script, text=True, capture_output=True, check=True, cwd=ROOT)
    sentences = json.loads(result.stdout)
    if not 1 <= len(sentences) <= 180:
        raise ValueError('Invalid number of scenes')
    if engine not in ('edge', 'piper'):
        raise ValueError('Unsupported TTS engine')
    piper_model = os.environ.get('PIPER_MODEL', '')
    if engine == 'piper' and (not shutil.which('piper') or not Path(piper_model).is_file()):
        raise RuntimeError('Offline TTS requires piper and PIPER_MODEL (.onnx plus .onnx.json)')
    out = ROOT / 'public' / 'audio'
    out.mkdir(parents=True, exist_ok=True)
    durations, paths, timings = [], [], []
    for i, sentence in enumerate(sentences):
        file = out / f'job-{i}.mp3'
        words = []
        if engine == 'piper':
            wav = out / f'job-{i}.wav'
            subprocess.run(['piper', '--model', piper_model, '--output_file', str(wav)],
                           input=sentence + '\n', text=True, check=True, timeout=180)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav),
                            '-codec:a', 'libmp3lame', '-q:a', '3', str(file)], check=True, timeout=90)
            wav.unlink(missing_ok=True)
        else:
            for attempt in range(3):
                try:
                    words = await asyncio.wait_for(edge_speech(sentence, VOICES[lang][gender], file), timeout=90)
                    if file.stat().st_size < 1000:
                        raise RuntimeError('Empty audio')
                    break
                except Exception:
                    if attempt == 2:
                        raise RuntimeError('Edge TTS unavailable; configure local Piper as the free offline alternative') from None
                    await asyncio.sleep(2 * (attempt + 1))
        seconds = MP3(file).info.length
        if not math.isfinite(seconds) or seconds <= 0:
            raise RuntimeError('Invalid narration')
        source = 'edge-word-boundary' if words else 'estimated'
        if not words:
            words = estimate_words(sentence, seconds)
        validate_words(words, seconds)
        cues = rhubarb_cues(file, out / f'mouth-{i}.json')
        timings.append({'source': source, 'words': words, 'audioSeconds': seconds,
                        'mouthSource': 'rhubarb-phonetic' if cues else 'word-envelope', 'mouthCues': cues})
        durations.append(max(1, math.ceil((seconds + .2) * FPS)))
        paths.append('/audio/' + file.name)
        print(f'Speech {i+1}/{len(sentences)}: {seconds:.2f}s ({source})', flush=True)
    total_seconds = sum(durations) / FPS
    if total_seconds > 660:
        raise ValueError('Narration exceeds 11 minutes; shorten the script')
    # External static assets avoid embedding all long-form audio in the JS bundle.
    (ROOT / 'narration-audio.mjs').write_text('export const narrationAudio = ' + json.dumps(paths) + ';\n')
    (ROOT / 'narration-plan.mjs').write_text('export const narrationFrames = ' + json.dumps(durations) + ';\n')
    (ROOT / 'narration-timings.mjs').write_text('export const narrationTimings = ' + json.dumps(timings, ensure_ascii=False) + ';\n', encoding='utf-8')
    plan_code = """import {makeScenePlan} from './scene-plan.mjs';
let s=''; for await(const c of process.stdin)s+=c;
const {script,frames,aspect}=JSON.parse(s);
console.log(JSON.stringify(makeScenePlan(script,{durationsFrames:frames,aspectRatio:aspect})));"""
    plan = subprocess.run(['node', '--input-type=module', '-e', plan_code], cwd=ROOT,
                          input=json.dumps({'script': script, 'frames': durations, 'aspect': aspect}),
                          text=True, capture_output=True, check=True)
    (ROOT / 'job-plan.json').write_text(plan.stdout, encoding='utf-8')
    warning = []
    if target_duration != 'auto' and abs(total_seconds - int(target_duration)) > max(3, int(target_duration) * .15):
        warning.append('Narration differs from pacing goal; edit script length. Audio was not cut or stretched.')
    actual_gender = gender if engine == 'edge' else os.environ.get('PIPER_ACTUAL_GENDER', 'unknown')
    if engine == 'piper' and actual_gender != gender:
        warning.append(f'Piper fallback voice gender: {actual_gender}; requested: {gender}. Selected voice is not guaranteed by the offline model.')
    report = {'language': lang, 'requestedVoiceGender': gender, 'actualVoiceGender': actual_gender, 'voice': VOICES[lang][gender] if engine == 'edge' else Path(piper_model).name,
              'ttsEngine': engine, 'timingSource': sorted({t['source'] for t in timings}),
              'mouthSources': sorted({t['mouthSource'] for t in timings}),
              'durationSeconds': total_seconds, 'targetDuration': target_duration, 'warnings': warning}
    (ROOT / 'narration-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    entry = """import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {ShortsComposition} from './ShortsComposition.mjs';
import {makeScenePlan} from './scene-plan.mjs';
import {narrationFrames} from './narration-plan.mjs';
const script=SCRIPT_VALUE;
const aspectRatio=ASPECT_VALUE;
const plan=makeScenePlan(script,{durationsFrames:narrationFrames,aspectRatio});
registerRoot(()=>React.createElement(Composition,{
 id:'ShortsJob',component:ShortsComposition,
 durationInFrames:plan.totalFrames,fps:plan.fps,
 width:plan.width,height:plan.height,
 defaultProps:{script,narration:true,durationsFrames:narrationFrames,aspectRatio}
}));
""".replace('SCRIPT_VALUE', json.dumps(script, ensure_ascii=False)).replace('ASPECT_VALUE', json.dumps(aspect))
    (ROOT / 'job-entry.mjs').write_text(entry, encoding='utf-8')
    print('Prepared', len(sentences), 'scenes,', sum(durations), 'frames', flush=True)


if __name__ == '__main__':
    asyncio.run(main())
