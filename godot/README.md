# Godot + Blender Grease Pencil migration

This is an **experimental, native 2D** replacement for the current PixiJS/SVG renderer. It does not yet replace production rendering.

## Design
- Blender Grease Pencil: author layered 2D characters, props and backgrounds; export transparent PNG sequences or SVG/PNG assets for Godot.
- Godot 2D: scene graph, character rigging, 2D motion and object interactions; render deterministic frames.
- Edge TTS / Piper: keep the existing narration.
- FFmpeg / Remotion: keep subtitles, compositing, H.264/AAC and MP4 download.
- Cloudflare Worker and GitHub Pages: unchanged.

## Try the native Godot prototype
Install Godot 4.x and run:

```bash
godot --headless --path godot -- --action=brush --place=bathroom --frames=72 --out=/tmp/shorts-godot-frames
ffmpeg -y -framerate 24 -i /tmp/shorts-godot-frames/frame_%05d.png -c:v libx264 -pix_fmt yuv420p /tmp/shorts-godot-demo.mp4
```

Actions currently prototyped: wake, brush, pick, travel, carry. This is a simple geometry proof of concept, **not a professional Grease Pencil asset library or a complete production integration**. Rendering, rigging, scene planning, audio synchronization, iPhone delivery and free cloud quotas need separate validation before switching the production workflow.

Do not delete the old renderer until the Godot render passes automated MP4 and visual regression tests.
