"""Bounded server render with validated narration and explicit provenance report.

For long films Chromium is restarted per 45-second part. Audio is muxed once
from the original speech clips, avoiding AAC priming drift at chunk boundaries.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent


def run(command, **kwargs):
    subprocess.run(command, check=True, cwd=ROOT, **kwargs)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT.parent / 'output' / 'final.mp4')
    parser.add_argument('--browser', help='Existing Chromium executable for local tests')
    parser.add_argument('--scale', type=float, default=.5)
    parser.add_argument('--chunk-seconds', type=int, default=45)
    args = parser.parse_args()
    if not 0 < args.scale <= 1 or not 1 <= args.chunk_seconds <= 120:
        parser.error('Invalid render scale or chunk duration')
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    plan = json.loads((ROOT / 'job-plan.json').read_text())
    work = output.parent / ('parts-' + output.stem)
    # Resume only when every input, renderer source and encode setting matches.
    digest = hashlib.sha256(json.dumps([plan, args.scale, args.chunk_seconds], sort_keys=True).encode())
    for source in sorted(ROOT.glob('*.mjs')) + sorted((ROOT / 'public' / 'audio').glob('job-*.mp3')) + sorted((ROOT / 'public' / 'ai-scenes').glob('*')):
        if not source.is_file():
            continue
        digest.update(str(source.relative_to(ROOT)).encode())
        digest.update(source.read_bytes())
    fingerprint = digest.hexdigest()
    marker = work / 'fingerprint'
    if work.exists() and (not marker.exists() or marker.read_text() != fingerprint):
        shutil.rmtree(work)
    work.mkdir(exist_ok=True)
    marker.write_text(fingerprint)
    step = args.chunk_seconds * plan['fps']
    parts = []
    for index, start in enumerate(range(0, plan['totalFrames'], step)):
        end = min(plan['totalFrames'], start + step) - 1
        part = work / f'part-{index:04d}.mp4'
        command = ['npx', 'remotion', 'render', 'job-entry.mjs', 'ShortsJob', str(part),
                   '--codec', 'h264', '--pixel-format', 'yuv420p', '--color-space', 'bt709', '--image-format', 'png', '--crf', '26', '--concurrency', '1', '--scale', str(args.scale),
                   '--frames', f'{start}-{end}', '--muted']
        if args.browser:
            command.extend(['--browser-executable', args.browser])
        if part.exists():
            probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
                '-show_entries', 'stream=duration,width,height,codec_name', '-of', 'json', str(part)],
                capture_output=True, text=True)
            try:
                stream = json.loads(probe.stdout)['streams'][0]
                valid = (stream['codec_name'] == 'h264' and
                         abs(float(stream['duration']) - (end - start + 1) / plan['fps']) < .05 and
                         stream['width'] == round(plan['width'] * args.scale) and
                         stream['height'] == round(plan['height'] * args.scale))
            except (ValueError, KeyError, IndexError):
                valid = False
            if valid:
                print(f'Reusing verified part {index+1}', flush=True)
                parts.append(part)
                continue
        print(f'Rendering part {index+1}: frames {start}–{end}', flush=True)
        # Retry one failed render from scratch; successful chunks remain on disk.
        for attempt in range(2):
            try:
                run(command, timeout=1200)
                break
            except (subprocess.SubprocessError, OSError):
                if attempt:
                    raise
                part.unlink(missing_ok=True)
        parts.append(part)
    listing = work / 'video.txt'
    # Paths are generated filenames under work. Quoting user-controlled paths is avoided.
    listing.write_text(''.join(f"file '{p.name}'\n" for p in parts))
    video = work / 'video.mp4'
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '1', '-i', str(listing),
         '-c', 'copy', str(video)], timeout=180)
    # Pad/trim each original narration clip to the scene's exact sample count.
    audio_parts = []
    for index, scene in enumerate(plan['scenes']):
        wav = work / f'audio-{index:04d}.wav'
        frames = scene['endFrame'] - scene['startFrame']
        samples = round(frames / plan['fps'] * 48000)
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'public' / 'audio' / f'job-{index}.mp3'),
             '-af', f'aresample=48000,apad,atrim=end_sample={samples},asetpts=PTS-STARTPTS', '-ar', '48000',
             '-ac', '1', '-c:a', 'pcm_s16le', str(wav)], timeout=60)
        audio_parts.append(wav)
    audio_list = work / 'audio.txt'
    audio_list.write_text(''.join(f"file '{p.name}'\n" for p in audio_parts))
    seconds = plan['totalFrames'] / plan['fps']
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(video), '-f', 'concat', '-safe', '1',
         '-i', str(audio_list), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
         '-c:a', 'aac', '-b:a', '128k', '-t', str(seconds), '-movflags', '+faststart', str(output)], timeout=180)
    quality_file = output.parent / 'quality-report.json'
    run([sys.executable, str(ROOT / 'verify-video.py'), str(output), '--aspect',
         '16:9' if plan['width'] > plan['height'] else '9:16', '--expected-duration', str(seconds),
         '--plan', str(ROOT / 'job-plan.json'), '--audio-dir', str(ROOT / 'public' / 'audio'), '--report', str(quality_file)], timeout=180)
    visual = json.loads((ROOT / 'visual-report.json').read_text())
    speech = json.loads((ROOT / 'narration-report.json').read_text())
    image_count = visual.get('imageCount', 0)
    report = {**visual, **speech, 'warnings': visual.get('warnings', []) + speech.get('warnings', []), 'quality': json.loads(quality_file.read_text()),
              'visualSource': 'vector' if not image_count else 'ai-illustration' if image_count == len(plan['scenes']) else 'mixed',
              'aiImageCount': image_count, 'width': round(plan['width'] * args.scale),
              'height': round(plan['height'] * args.scale), 'renderParts': len(parts)}
    (output.parent / 'render-report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    shutil.copy(ROOT / 'job-plan.json', output.parent / 'scene-plan.json')
    shutil.rmtree(work)
    print('Verified MP4:', output, flush=True)


if __name__ == '__main__':
    main()
