# Reference comparison and acceptance plan (2026-11-10)

## Grounded technical measurements
Local exported shorts-studio(6).mp4: 512x910 H.264, 20.033 seconds, **no audio stream**.
Four supplied reference MP4s: 512x910 H.264 video, AAC audio; durations 66.382, 102.002, 71.933, and 91.438 seconds.
These numbers are container ffprobe measurements. The original clips are not bundled or redistributed.

## Priority 0: reliable audio MP4
The production index.html captures canvas.captureStream only. Device speechSynthesis output is not a MediaStream audio track. Adding a MediaStreamAudioDestinationNode without routing real generated audio through it cannot fix the issue.
Generate downloadable PCM/WAV using a compatible TTS engine; use its measured duration as the single source of truth for the storyboard timeline. Feed the same decoded audio through Web Audio into a destination stream, combine audio and canvas tracks, select an actually supported MP4 MIME, and validate an audio track in the output. Never label silent/WebM output as audible MP4. Physical iPhone Safari acceptance required. GitHub Pages cannot execute server TTS or FFmpeg.

## Priority 1: 2D visual quality
Replace flat placeholder shapes with a reusable SVG/Canvas 2D character rig and detailed scene assets. Keep consistent character identities across sentences. Represent actions with poses/keyframes rather than generic bobbing. Use varied shot sizes and transitions, with legible subtitle animation. No 3D rendering.
The current keyword classifier is not an unrestricted text-to-animation engine. Unknown concepts must be reported as unsupported rather than claimed as accurate.

## Priority 2: synchronization and mobile
Each sentence requires an audio segment duration and corresponding scene start/end. Animation, subtitle highlighting and progress must be derived from the same clock. Test pause/resume, interruption, text change, stale download, empty/long text, MP4 MIME and audio stream, iPhone Safari and first-run TTS model download.

## Acceptance criteria
1. iPhone Safari can generate and download a playable MP4 with verified H.264 video and AAC audio; speech is audible.
2. Video contains all original text spoken in order; captions are readable and synchronized.
3. Waking, bathroom walking, tooth brushing, bus boarding and supermarket entry are distinguishable actions in the demo story.
4. Export failure never presents a success link.
5. All user-facing media is 2D, not 3D.
6. Run real-device tests before marking any criterion passed.

Status: this is a plan and comparison record, **not** a declaration that these criteria are met.
