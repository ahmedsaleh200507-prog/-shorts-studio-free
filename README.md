# Shorts Studio Free

Free 2D video experiments. The current Remotion renderer produces narrated videos using deterministic scene templates. **It does not yet generate arbitrary AI images or guarantee cinematic character animation.**

## Local render (no GitHub Actions daily quota)

Requires Python 3.12, Node.js 22+, FFmpeg, and internet access for the current Edge TTS narration. Local rendering has no app-imposed daily video count limit; your computer's resources and external TTS availability still apply.

Windows PowerShell (from the repository directory):

```powershell
py -3.12 local-render.py --setup
py -3.12 local-render.py --language de --text "Ein Mann geht in den Supermarkt. Er kauft einen Apfel."
```

For a script file:

```powershell
py -3.12 local-render.py --language en --file .\story.txt --output .\output\my-video.mp4
```

Output is saved in `output/` unless `--output` is supplied. Current implementation supports up to 3000 characters and 60 scenes per render. Each invocation makes one video; there is no software-enforced daily count. This is **not** a fully offline system because Edge TTS currently needs internet.

## Quality roadmap

1. Verify local render end-to-end on the target Windows PC.
2. Replace keyword-only scene matching with general semantic scene planning.
3. Add optional local AI image generation, with realistic RAM/CPU performance checks.
4. Add character identity references and proper rigged animation.
5. Add offline speech synthesis (e.g. Piper), visual quality checks, and one-button UI integration.

No paid API or subscription should be silently invoked. Free third-party services may have quotas.
