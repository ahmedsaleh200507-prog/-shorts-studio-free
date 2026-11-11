# Shorts Studio 2D Cloud V2 — implementation plan

Status: planning only. The production site on main is unchanged.

## User experience
- iPhone Safari: write German/English script, tap Generate, track job status, download one narrated 9:16 MP4.
- Never ask the user to copy commands or configure a local machine.
- Preserve existing Worker authentication until a secure replacement is tested.

## Free-first architecture
1. Scene planner (CPU): parse sentences, locations, entities, actions, transitions, and durations into structured JSON. Validate JSON before rendering.
2. 2D assets: start with licensed open-source SVG/PNG character rigs and backgrounds. Asset provenance and license must be recorded. No arbitrary copyrighted downloads.
3. Motion renderer (CPU): Remotion compositions with character rig movement, foreground/background parallax, camera cuts, captions and timing. Godot is optional for reusable character rigs, not required for initial deployment.
4. Voice: edge-tts per scene with bounded retries and actionable failures.
5. Encoding: FFmpeg H.264 video + AAC audio, 9:16, verify streams, nonzero duration, and A/V synchronization.
6. Delivery: GitHub Actions workflow + Cloudflare Worker status/artifact endpoints. Verify Safari-compatible download.

## Optional AI image path
- ComfyUI requires a separately available GPU endpoint. A free, always-on GPU is NOT assumed.
- Image generation must be optional and must fail over to high-quality licensed 2D assets.
- Never expose tokens or keys to browser code.

## Milestones and acceptance
M1: 10–15 second two-scene German narrated demo, character motion + camera motion + synchronized subtitles, playable MP4 artifact.
M2: English demo, 3+ distinct scenes, no repeated generic city/character fallback when relevant assets exist.
M3: end-to-end Worker job, artifact download, iPhone Safari verification.
M4: optional ComfyUI GPU integration with clear quota and availability feedback.

## Guardrails
- Keep main stable; develop on shorts-studio-2d-cloud-v2.
- Do not claim any milestone passed without a rendered artifact and verified logs.
- Free services have usage quotas; avoid promises of unlimited or always-available GPU compute.
