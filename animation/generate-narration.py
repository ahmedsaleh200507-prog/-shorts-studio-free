"""Generate a separate German TTS clip for each animation scene.
Measure MP3 lengths using mutagen, then write Remotion frame boundaries.
"""
import asyncio
import base64
import json
import math
from pathlib import Path
from speech_timing import edge_speech, estimate_words, validate_words, rhubarb_cues
from mutagen.mp3 import MP3

SENTENCES = [
    "Ein Mann wacht morgens auf.",
    "Er putzt seine Zähne.",
    "Er nimmt einen Apfel.",
    "Er bezahlt an der Kasse.",
]
FPS = 24
BASE = Path(__file__).resolve().parent
OUT = BASE / "public" / "audio"

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    frames = []
    audio_uris = []
    timings = []
    for i, sentence in enumerate(SENTENCES):
        target = OUT / f"scene-{i}.mp3"
        words = await edge_speech(sentence, "de-DE-KatjaNeural", target)
        if target.stat().st_size < 1000:
            raise RuntimeError(f"Empty narration for scene {i}")
        audio_uris.append('data:audio/mpeg;base64,' + base64.b64encode(target.read_bytes()).decode('ascii'))
        seconds = MP3(target).info.length
        if not math.isfinite(seconds) or seconds <= 0:
            raise RuntimeError(f"Invalid narration duration: {seconds}")
        source = 'edge-word-boundary' if words else 'estimated'
        words = words or estimate_words(sentence, seconds)
        validate_words(words, seconds)
        cues = rhubarb_cues(target, OUT / f'mouth-demo-{i}.json')
        timings.append({'source': source, 'words': words, 'audioSeconds': seconds,
                        'mouthCues': cues, 'mouthSource': 'rhubarb-phonetic' if cues else 'word-envelope'})
        # Small trailing buffer avoids cutting off the last spoken syllable.
        frames.append(max(1, math.ceil((seconds + 0.18) * FPS)))
        print(f"Scene {i+1}: {seconds:.2f}s, {frames[-1]} frames", flush=True)
    (BASE / "narration-timings.mjs").write_text(
        "export const narrationTimings = " + json.dumps(timings, ensure_ascii=False) + ";\n", encoding="utf-8")
    (BASE / "narration-audio.mjs").write_text(
        "export const narrationAudio = " + json.dumps(audio_uris) + ";\n", encoding="utf-8"
    )
    (BASE / "narration-plan.mjs").write_text(
        "export const narrationFrames = " + repr(frames) + ";\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    asyncio.run(main())
