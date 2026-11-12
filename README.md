# Shorts Studio Free

German/English scripts become narrated **2D** MP4s using the existing React/Remotion
pipeline. Two engines share the scene registry, action timeline, captions and audio:

- **2D animation:** SVG characters with articulated limbs and object actions; no image API.
- **AI Video:** optional animated 2D AI illustrations, with a reported vector fallback.
  This mode does **not** generate native AI motion video. No paid API is required.

The local scene analyzer composes supported DE/EN actions and retains basic character,
object and setting continuity. It is a bounded parser, not general language intelligence.
Unsupported actions and provider limitations appear in the plan/report.

## Render locally

Requirements: Python 3.12, Node.js 22+, FFmpeg/FFprobe. Edge TTS needs internet.

```sh
python local-render.py --setup
python local-render.py --language de --mode vector --voice male --aspect 9:16 \
  --text "Ein Mann bekommt eine Nachricht. Er nimmt sein Handy und liest sie. Danach verlässt er das Haus."
python local-render.py --language en --file story.txt --aspect 16:9 --output output/my-video.mp4
```

Up to 12,000 characters, 180 scenes, and 11 minutes of measured narration are accepted.
`--duration 15|30|60|180|300|600` is a pacing goal: script length determines spoken duration.
Audio is never silently shortened to fit it. Output defaults to 540×960 or 960×540 at
24fps, H.264/yuv420p + AAC. The renderer can produce full resolution via
`python animation/render-job.py --scale 1` after preparation.

For offline narration install `piper-tts` and a compatible ONNX voice **plus its
.onnx.json config**, then use `--piper-model /path/voice.onnx`. Check each voice model's
license. Piper word timing is estimated and labeled. The optional MIT Rhubarb 1.14 CLI
on PATH supplies phonetic mouth cues; without it, mouth motion follows word envelopes.
Its phonetic accuracy is not guaranteed, particularly for German.

Optional image generation reads `POLLINATIONS_KEY` only on the server, is capped to
18 requests by default, and stops on quota/auth failures. Each generated image belongs
to one scene; other scenes use vectors. Provider capacity is not promised free or
unlimited. Use `--mode vector` for image-API-free operation.

## Validate and deploy

```sh
npm ci --prefix animation
npm test --prefix animation
python -m unittest discover -s animation -p 'test_*.py' -v
node backend/worker.test.mjs
node backend/ui.test.mjs
```

`render-job.py` renders bounded parts, muxes original audio once, and runs actual
FFmpeg/FFprobe validation. Reports include per-scene visual provenance, timing source,
actual voice, motion samples and manual-review limits. No microphone is used.

See [backend setup](backend/README.md) for Worker secrets and the v2 API. Workflow,
Worker and UI must be deployed together; a Git commit does not deploy Cloudflare.
Mobile Safari reconnects to server work rather than depending on background JavaScript.
ZIP extraction currently needs browser memory and is capped at 120 MiB; artifacts
expire after 3 days. The app does not claim unlimited free hosted rendering.

See [current limits and continuation](docs/implementation-status.md),
[technology/license evaluation](docs/technology-evaluation.md), and
[verified test results](docs/validation-results.md). Physical iPhone 16 Pro Max testing
and the full 3/5/10-minute render matrix remain outstanding. No reference MP4s were
available for style analysis in this session.
