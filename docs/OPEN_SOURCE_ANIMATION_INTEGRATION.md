# Shorts Studio — open-source animation integration

## Verified candidates
- Remotion: https://github.com/remotion-dev/remotion — React-based programmatic video rendering. Check its current licensing terms before production deployment.
- PixiJS: https://github.com/pixijs/pixijs — high-performance 2D scene graph and WebGL renderer.
- Motion Canvas: https://github.com/motion-canvas/motion-canvas — TypeScript 2D timeline animations.
- Lottie-web: https://github.com/airbnb/lottie-web — playback of authored Lottie animations, not text-to-animation generation.

## Recommended architecture
1. Convert German/English script to a **validated scene plan**: characters, location, props, actions, timestamps, continuity, camera.
2. Use PixiJS to render scene plan in browser for interactive preview.
3. Use the **same scene plan and assets** in Remotion for MP4; never implement two unrelated scene renderers.
4. Keep the existing Edge TTS and FFmpeg path until Remotion output is validated.
5. Build a deterministic CPU fallback for zero-cost operation. AI image generation only when a genuinely available GPU endpoint is configured.
6. Verify each scene has visible subject/action, narration and captions, and that preview matches exported MP4.
7. Keep third-party notices and license requirements with any vendored code/assets.

## Migration milestones
- [ ] Create schema and tests for scene plan; include verbs, objects, and recurring characters.
- [ ] Introduce shared PixiJS components and scene camera.
- [ ] Add Remotion composition and GitHub Actions export.
- [ ] Compare preview and rendered frames from identical timestamps.
- [ ] Add rigged character sprites and state-based action animation.
- [ ] Connect optional free GPU provider when actually available.
- [ ] Replace legacy canvas only after end-to-end video export is tested.

**Important:** These projects are candidates, not yet installed or integrated. They cannot by themselves turn arbitrary text into reference-quality animation, nor provide unlimited free GPU rendering.
