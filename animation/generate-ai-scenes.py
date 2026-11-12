"""Generate a bounded number of AI illustrations for a narrated short or long film.

The scene-to-image manifest repeats each generated illustration across its story
segment. This limits free-tier image calls; it is not native AI video generation.
"""
import json
import math
import os
import pathlib
import re
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
script = os.environ.get("SCRIPT", "").strip()
landscape = os.environ.get("ASPECT_RATIO", "9:16") == "16:9"
if script.startswith("[[ASPECT_16_9]]"):
    script = script[len("[[ASPECT_16_9]]"):].strip()
    landscape = True

key = os.environ.get("POLLINATIONS_KEY", "").strip()
if not key.startswith("sk_"):
    raise SystemExit("Missing POLLINATIONS_KEY GitHub Actions secret")

sentences = [s.strip() for s in re.findall(r"[^.!?\n]+[.!?]?", script) if s.strip()]
if not sentences or len(sentences) > 180 or len(script) > 12000:
    raise SystemExit("Invalid script: maximum 12000 characters / 180 scenes")

max_images = max(1, min(24, int(os.environ.get("AI_MAX_IMAGES", "18"))))
image_count = min(len(sentences), max_images)
models = [m.strip() for m in os.environ.get(
    "AI_IMAGE_MODELS", "black-forest-labs/flux.1-schnell"
).split(",") if m.strip()][:3]
if not models:
    raise SystemExit("No image models configured")

width, height = (1024, 576) if landscape else (576, 1024)
out = ROOT / "public" / "ai-scenes"
out.mkdir(parents=True, exist_ok=True)
manifest = []
context = script[:1200]
prior_segment = ""

def fetch_image(prompt, seed=42):
    """Try alternative models only on model/server errors, never on quotas."""
    for index, model in enumerate(models):
        query = urllib.parse.urlencode({
            "model": model, "width": width, "height": height, "seed": seed
        })
        url = "https://gen.pollinations.ai/image/" + urllib.parse.quote(
            prompt, safe=""
        ) + "?" + query
        req = urllib.request.Request(url, headers={
            "Authorization": "Bearer " + key,
            "Accept": "image/*",
            "User-Agent": "ShortsStudioFree/1.0",
        })
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = resp.read(12_000_001)
                mime = resp.headers.get("Content-Type", "").split(";")[0].strip().lower()
            if len(data) < 1000 or len(data) > 12_000_000:
                raise RuntimeError("Invalid image size")
            if mime not in ("image/jpeg", "image/png", "image/webp"):
                raise RuntimeError("AI provider did not return an image")
            return data, mime
        except urllib.error.HTTPError as exc:
            if exc.code in (401, 402, 403, 429):
                raise SystemExit(
                    f"AI quota/auth error HTTP {exc.code}; no key rotation or retries"
                ) from None
            if exc.code not in (400, 404, 500, 502, 503, 504) or index == len(models) - 1:
                raise
            print(f"Model error HTTP {exc.code}; trying another configured model", flush=True)
    raise RuntimeError("No image generated")

for i in range(image_count):
    start = i * len(sentences) // image_count
    end = (i + 1) * len(sentences) // image_count
    segment = " ".join(sentences[start:end])
    # Keep the image aligned with the CURRENT segment, not a generic scene
    # suggested by an earlier sentence in a long script.
    lower_segment = segment.casefold()
    no_sun = bool(re.search(
        r"(?:sonne|sun).{0,90}(?:verschwind|weg|erlisch|gone|disappear|vanish|goes out|went out)"
        r"|(?:verschwind|weg|erlisch|gone|disappear|vanish).{0,90}(?:sonne|sun)",
        lower_segment
    ))
    sky_rule = (
        "The Sun is ABSENT from the sky in this scene. "
        "Show darkness and consequences, no visible sun, no glowing solar disc, "
        "no duplicate suns, no moon mistaken for a sun. "
        if no_sun else
        "Depict celestial bodies only if the current story segment calls for them; "
        "never add duplicate suns or moons. "
    )
    prompt = (
        ("Wide horizontal 16:9 cinematic composition. " if landscape else
         "Vertical 9:16 cinematic composition. ")
        + "Rich hand-painted 2D animation still, flat illustrated 2D only, "
        "expressive characters, detailed scenery, coherent lighting, clean outlines, "
        "no text, no subtitles, no watermark, no 3D, no photorealism. "
        + sky_rule
        + "One continuous story with recurring character appearance, same facial "
        "features, hairstyle, costume and proportions when the character returns. "
        "Only change location when the story does. Overall context: "
        + context + ". "
        + ("Previous story segment: " + prior_segment[-320:] + ". " if prior_segment else "")
        + "Current story segment: " + segment[:1200]
    )
    data, mime = fetch_image(prompt, seed=42 + i * 7919)
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[mime]
    filename = f"scene-{i}.{ext}"
    (out / filename).write_bytes(data)
    manifest.extend(["/ai-scenes/" + filename] * (end - start))
    prior_segment = segment
    print(f"AI illustration {i+1}/{image_count} ready", flush=True)

if len(manifest) != len(sentences):
    raise RuntimeError("Scene manifest mismatch")
(ROOT / "ai-scene-images.mjs").write_text(
    "export const aiSceneImages = " + json.dumps(manifest) + ";\n",
    encoding="utf-8",
)
print(f"Generated {image_count} AI images for {len(sentences)} scenes", flush=True)
