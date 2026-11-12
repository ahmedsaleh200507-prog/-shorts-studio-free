"""Generate a separate German TTS clip for each animation scene.
Measure MP3 lengths using mutagen, then write Remotion frame boundaries.
"""
import asyncio
import base64
import json
import math
from pathlib import Path
import edge_tts
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
    for i, sentence in enumerate(SENTENCES):
        target = OUT / f"scene-{i}.mp3"
        await edge_tts.Communicate(sentence, "de-DE-KatjaNeural").save(str(target))
        if target.stat().st_size < 1000:
            raise RuntimeError(f"Empty narration for scene {i}")
        audio_uris.append('data:audio/mpeg;base64,' + base64.b64encode(target.read_bytes()).decode('ascii'))
        seconds = MP3(target).info.length
        if not math.isfinite(seconds) or seconds <= 0:
            raise RuntimeError(f"Invalid narration duration: {seconds}")
        # Small trailing buffer avoids cutting off the last spoken syllable.
        frames.append(max(1, math.ceil((seconds + 0.18) * FPS)))
        print(f"Scene {i+1}: {seconds:.2f}s, {frames[-1]} frames", flush=True)
    (BASE / "narration-audio.mjs").write_text(
        "export const narrationAudio = " + json.dumps(audio_uris) + ";\n", encoding="utf-8"
    )
    (BASE / "narration-plan.mjs").write_text(
        "export const narrationFrames = " + repr(frames) + ";\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    asyncio.run(main())
