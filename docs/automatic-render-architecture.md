# Automatic voice/video generation architecture

The static GitHub Pages site cannot safely call GitHub Actions with a secret token embedded in JavaScript. Do not add a personal access token to client code.

## Render worker
Use a GitHub Actions workflow on manual dispatch initially, or an authenticated backend trigger later.
- Input: arbitrary German/English script, validated and limited in size.
- Python edge-tts produces a WAV/MP3 file (third-party network service; availability not guaranteed).
- FFmpeg renders 540x960 H.264/AAC MP4 with subtitles and verifies both streams with ffprobe.
- Artifacts uploaded to GitHub Actions with limited retention.

## Required for true one-tap mobile UI
A trusted backend must authenticate and rate-limit render requests, enqueue jobs, and provide download URLs. Never expose GITHUB_TOKEN, API keys, or PATs in GitHub Pages. A GitHub Actions workflow by itself does not implement one-tap requests from the public page.

## User experience
One text box, one Generate button, progress and MP4 download. No voice upload or microphone permissions. If the backend is unavailable, show an explicit error rather than a silent MP4.
