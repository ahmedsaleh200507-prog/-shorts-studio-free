"""Prepare dynamic Remotion narration and composition for the actual web-app job."""
import asyncio, base64, json, math, os, re, shutil, subprocess
from pathlib import Path
import edge_tts
from mutagen.mp3 import MP3

ROOT=Path(__file__).resolve().parent
FPS=24
async def main():
    script=os.environ.get('SCRIPT','').strip()
    if script.startswith('[[VECTOR_2D]]'):
        script=script[len('[[VECTOR_2D]]'):].strip()
    lang=os.environ.get('LANGUAGE','de')
    aspect=os.environ.get('ASPECT_RATIO','9:16')
    if script.startswith('[[ASPECT_16_9]]'):
        aspect='16:9'
        script=script[len('[[ASPECT_16_9]]'):].strip()
    if script.startswith('[[VECTOR_2D]]'):
        script=script[len('[[VECTOR_2D]]'):].strip()
    if aspect not in ('9:16','16:9'): raise ValueError('Invalid aspect ratio')
    if not script or len(script)>12000: raise ValueError('Script must contain 1–12000 characters')
    if lang not in ('de','en'): raise ValueError('Unsupported language')
    sentences=[s.strip() for s in re.findall(r'[^.!?\n]+[.!?]?',script) if s.strip()]
    if not sentences or len(sentences)>180: raise ValueError('Invalid number of scenes')
    voice={'de':'de-DE-KatjaNeural','en':'en-US-JennyNeural'}[lang]
    offline=os.environ.get('TTS_ENGINE','edge')=='piper'
    piper_model=os.environ.get('PIPER_MODEL','')
    if offline:
        if not shutil.which('piper'): raise RuntimeError('Offline TTS requires the piper executable on PATH')
        if not piper_model or not Path(piper_model).is_file(): raise RuntimeError('PIPER_MODEL must point to a downloaded .onnx voice model')
        if not shutil.which('ffmpeg'): raise RuntimeError('FFmpeg required for offline Piper conversion')
    out=ROOT/'public'/'audio';out.mkdir(parents=True,exist_ok=True)
    durations=[];uris=[];word_alignments=[]
    for i,sentence in enumerate(sentences):
        file=out/f'job-{i}.mp3'
        words=[]
        if offline:
            wav=out/f'job-{i}.wav'
            subprocess.run(['piper','--model',piper_model,'--output_file',str(wav)],
                           input=sentence+'\\n',text=True,check=True,timeout=180)
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),
                            '-codec:a','libmp3lame','-q:a','3',str(file)],check=True,timeout=90)
            wav.unlink(missing_ok=True)
            if file.stat().st_size<1000: raise RuntimeError('Empty offline narration')
        else:
            for attempt in range(3):
                try:
                    words=[]
                    async def synthesize():
                        with file.open('wb') as stream:
                            async for chunk in edge_tts.Communicate(sentence,voice).stream():
                                if chunk['type']=='audio':
                                    stream.write(chunk['data'])
                                elif chunk['type']=='WordBoundary':
                                    words.append({'word':chunk['text'],
                                                  'start':round(chunk['offset']/10_000_000,4),
                                                  'end':round((chunk['offset']+chunk['duration'])/10_000_000,4)})
                    await asyncio.wait_for(synthesize(),timeout=90)
                    if file.stat().st_size<1000: raise RuntimeError('Empty audio')
                    break
                except Exception:
                    if attempt==2: raise
                    await asyncio.sleep(2*(attempt+1))
        seconds=MP3(file).info.length
        if not math.isfinite(seconds) or seconds<=0: raise RuntimeError('Invalid narration')
        durations.append(max(1,math.ceil((seconds+0.2)*FPS)))
        word_alignments.append(words)
        uris.append('data:audio/mpeg;base64,'+base64.b64encode(file.read_bytes()).decode('ascii'))
    total_seconds=sum(durations)/FPS
    if total_seconds>660: raise ValueError('Narration exceeds 11 minutes; shorten the script')
    (out/'word-timings.json').write_text(json.dumps(word_alignments,ensure_ascii=False),encoding='utf-8')
    (ROOT/'narration-audio.mjs').write_text('export const narrationAudio = '+json.dumps(uris)+';\n',encoding='utf-8')
    (ROOT/'narration-plan.mjs').write_text('export const narrationFrames = '+json.dumps(durations)+';\n',encoding='utf-8')
    entry="""import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {ShortsComposition} from './ShortsComposition.mjs';
import {makeScenePlan} from './scene-plan.mjs';
import {narrationFrames} from './narration-plan.mjs';
const script=SCRIPT_VALUE;
const plan=makeScenePlan(script,{durationsFrames:narrationFrames,aspectRatio:ASPECT_VALUE});
registerRoot(()=>React.createElement(Composition,{
 id:'ShortsJob',component:ShortsComposition,
 durationInFrames:plan.totalFrames,fps:plan.fps,
 width:plan.width,height:plan.height,
 defaultProps:{script,narration:true,durationsFrames:narrationFrames,aspectRatio:ASPECT_VALUE}
}));
""".replace('SCRIPT_VALUE',json.dumps(script,ensure_ascii=False)).replace('ASPECT_VALUE',json.dumps(aspect))
    (ROOT/'job-entry.mjs').write_text(entry,encoding='utf-8')
    print('Prepared',len(sentences),'scenes,',sum(durations),'frames',flush=True)
if __name__=='__main__':asyncio.run(main())
