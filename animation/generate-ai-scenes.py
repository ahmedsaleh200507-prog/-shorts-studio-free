"""Optional, bounded 2D AI illustrations; this does not generate native AI video.

One image belongs to one scene. Scenes beyond the image budget use articulated
vectors instead of silently repeating unrelated stills. A provider failure stops
further requests for this job and produces an explicit provenance report.
"""
import json
import os
import pathlib
import re
import struct
import subprocess
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
# Output roots may be redirected by tests; imports always use the real source.
SOURCE_DIR = pathlib.Path(os.path.abspath(__file__)).parent
script = os.environ.get("SCRIPT", "").strip()
mode = os.environ.get("VIDEO_MODE", "ai")
if mode not in ("ai", "vector"):
    raise SystemExit("VIDEO_MODE must be ai or vector")
vector_mode = mode == "vector" or script.startswith("[[VECTOR_2D]]")
if script.startswith("[[VECTOR_2D]]"):
    script = script[len("[[VECTOR_2D]]"):].strip()
landscape = os.environ.get("ASPECT_RATIO", "9:16") == "16:9"
if script.startswith("[[ASPECT_16_9]]"):
    script = script[len("[[ASPECT_16_9]]"):].strip()
    landscape = True

key = os.environ.get("POLLINATIONS_KEY", "").strip()
if not script or len(script) > 12000:
    raise SystemExit("Invalid script: maximum 12000 characters / 180 scenes")
try:
    planning = subprocess.run(["node", "--input-type=module", "-e",
        "import {splitScript,makeScenePlan} from './scene-plan.mjs';let s='';for await (const c of process.stdin)s+=c;const sentences=splitScript(s);console.log(JSON.stringify({sentences,registry:sentences.length?makeScenePlan(s).registry:{}}));"],
        input=script, text=True, capture_output=True, cwd=SOURCE_DIR, check=True, timeout=15)
    planning = json.loads(planning.stdout)
    sentences = planning["sentences"]
    registry = planning.get("registry") or {}
except (OSError, ValueError, KeyError, subprocess.SubprocessError):
    raise SystemExit("Shared scene planning failed; maximum 180 scenes, Node.js required") from None
if not sentences or len(sentences) > 180:
    raise SystemExit("Invalid script: maximum 12000 characters / 180 scenes")
try:
    max_images = max(0, min(24, int(os.environ.get("AI_MAX_IMAGES", "18"))))
except ValueError:
    raise SystemExit("AI_MAX_IMAGES must be an integer") from None
models = [m.strip() for m in os.environ.get(
    "AI_IMAGE_MODELS", "black-forest-labs/flux.1-schnell"
).split(",") if m.strip()][:3]
width, height = (1024, 576) if landscape else (576, 1024)
out = ROOT / "public" / "ai-scenes"
out.mkdir(parents=True, exist_ok=True)
reason = ("vector-selected" if vector_mode else "missing-provider-key" if not key
          else "image-budget-zero" if not max_images else "no-model-configured" if not models else None)
ai_enabled = reason is None
manifest = [None] * len(sentences)
metadata = [{"sceneId": f"scene-{i+1}", "engine": "vector-2d", "reason": reason or "image-budget",
             "nativeAiVideo": False, "verified2D": True} for i in range(len(sentences))]
requests_made = 0
warnings = []


def image_dimensions(data, mime):
    """Verify actual file signature and dimensions, rejecting HTML with image MIME."""
    if mime == "image/png" and data.startswith(b"\x89PNG\r\n\x1a\n") and data[12:16] == b"IHDR":
        if b"IEND" not in data[-20:]:
            raise RuntimeError("Truncated PNG")
        return struct.unpack(">II", data[16:24])
    if mime == "image/jpeg" and data.startswith(b"\xff\xd8") and data.endswith(b"\xff\xd9"):
        offset = 2
        while offset + 4 <= len(data):
            if data[offset] != 255:
                break
            while offset < len(data) and data[offset] == 255:
                offset += 1
            marker = data[offset]
            offset += 1
            if marker in (0xD8, 0xD9):
                continue
            length = int.from_bytes(data[offset:offset+2], "big")
            if length < 2 or offset + length > len(data):
                break
            if marker in (0xC0, 0xC1, 0xC2):
                h, w = struct.unpack(">HH", data[offset+3:offset+7])
                return w, h
            offset += length
    if mime == "image/webp" and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        if int.from_bytes(data[4:8], "little") + 8 > len(data):
            raise RuntimeError("Truncated WebP")
        if data[12:16] == b"VP8X" and len(data) >= 30:
            return int.from_bytes(data[24:27], "little") + 1, int.from_bytes(data[27:30], "little") + 1
        if data[12:16] == b"VP8 " and data[23:26] == b"\x9d\x01\x2a":
            w, h = struct.unpack("<HH", data[26:30])
            return w & 0x3fff, h & 0x3fff
        if data[12:16] == b"VP8L" and data[20:21] == b"\x2f":
            bits = int.from_bytes(data[21:25], "little")
            return (bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1
    raise RuntimeError("Image MIME/signature mismatch or unsupported image header")


def fetch_image(prompt, seed=42):
    """No quota retry, no key rotation, and total HTTP requests <= image budget."""
    global requests_made
    for model in models:
        if requests_made >= max_images:
            raise RuntimeError("Image request budget exhausted")
        query = urllib.parse.urlencode({"model": model, "width": width, "height": height, "seed": seed})
        url = "https://gen.pollinations.ai/image/" + urllib.parse.quote(prompt, safe="") + "?" + query
        req = urllib.request.Request(url, headers={"Authorization": "Bearer " + key,
            "Accept": "image/*", "User-Agent": "ShortsStudioFree/2.0"})
        requests_made += 1
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = resp.read(12_000_001)
                mime = resp.headers.get("Content-Type", "").split(";")[0].strip().lower()
            if not 100 <= len(data) <= 12_000_000:
                raise RuntimeError("Invalid image byte size")
            try:
                w, h = image_dimensions(data, mime)
            except (IndexError, struct.error, ValueError):
                raise RuntimeError("Malformed or truncated image header") from None
            if min(w, h) < 256 or max(w, h) > 8192 or abs(w / h - width / height) > 0.025:
                raise RuntimeError("Image dimensions/aspect ratio do not match requested format")
            return data, mime, model, [w, h]
        except urllib.error.HTTPError as exc:
            if exc.code in (401, 402, 403, 429):
                raise RuntimeError(f"provider-auth-or-quota-http-{exc.code}") from None
            if exc.code not in (400, 404, 500, 502, 503, 504) or model == models[-1]:
                raise RuntimeError(f"provider-http-{exc.code}") from None
    raise RuntimeError("No image generated")


# The same deterministic registry used by the vector engine provides a visual
# bible. Reference-free text prompts encourage, but cannot guarantee, identity.
bible = "Recurring main actor: clean outlined 2D adult; teal jacket, dark trousers, short dark hair."
if registry.get("characters"):
    bible = "Locked recurring character registry: " + json.dumps(registry["characters"], ensure_ascii=False)[:2400]

image_count = min(len(sentences), max_images)
slots = [i * len(sentences) // image_count for i in range(image_count)] if image_count else []
for i in slots:
    if not ai_enabled:
        continue
    current = sentences[i]
    no_sun = bool(re.search(r"(?:sonne|sun).{0,90}(?:verschwind|weg|erlisch|gone|disappear|vanish|goes out|went out)", current, re.I))
    sky_rule = "The Sun is absent; no glowing solar disc. " if no_sun else "Never add celestial bodies unless mentioned. "
    prompt = ("Wide horizontal 16:9. " if landscape else "Vertical 9:16. ") + (
        "Professional strictly 2D hand-painted animation illustration, clean linework, expressive poses, "
        "rich flat illustrated environment, coherent light and cinematic color palette, readable silhouette, "
        "negative space in bottom 20 percent for captions. No 3D, no photorealism, no text, no watermark. "
        + sky_rule + bible + ". Keep returning faces, hair and costumes identical. "
        + "Previous context (do not combine scenes): " + (sentences[i-1][-250:] if i else "start of story")
        + ". Depict ONLY this current event: " + current[:1400])
    try:
        data, mime, model, dimensions = fetch_image(prompt, seed=42 + i * 7919)
        ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[mime]
        filename = f"scene-{i}.{ext}"
        (out / filename).write_bytes(data)
        manifest[i] = "/ai-scenes/" + filename
        metadata[i] = {"sceneId": f"scene-{i+1}", "engine": "animated-ai-illustration", "reason": None,
            "model": model, "dimensions": dimensions, "nativeAiVideo": False, "verified2D": False,
            "verification": "Image header and aspect checked; 2D style and semantic correctness require visual review",
            "identityConsistency": "prompt-guided-unverified", "reused": False}
        print(f"AI illustration for scene {i+1}/{len(sentences)} ready", flush=True)
    except (urllib.error.URLError, TimeoutError, RuntimeError, OSError) as exc:
        reason = str(exc)
        # Do not log request URLs (which contain private script text) or headers.
        if not isinstance(exc, RuntimeError):
            reason = "provider-network-error"
        warnings.append(reason)
        ai_enabled = False
        for item in metadata:
            if item["engine"] == "vector-2d" and item["reason"] == "image-budget":
                item["reason"] = reason
        print("AI service unavailable; continuing with free 2D vectors", flush=True)

(ROOT / "ai-scene-images.mjs").write_text("export const aiSceneImages = " + json.dumps(manifest) + ";\n", encoding="utf-8")
(ROOT / "ai-scene-metadata.mjs").write_text("export const aiSceneMetadata = " + json.dumps(metadata) + ";\n", encoding="utf-8")
report = {"requestedMode": "vector" if vector_mode else "ai", "nativeAiVideo": False,
    "imageCount": sum(x is not None for x in manifest), "vectorSceneCount": sum(x is None for x in manifest),
    "requestCount": requests_made, "requestBudget": max_images, "warnings": warnings,
    "limitations": ["AI images are animated illustrations, not generated video.",
        "Prompt-based identity and 2D style require visual review; no semantic vision classifier is installed.",
        "Provider credits/availability are external and not guaranteed free or unlimited."], "scenes": metadata}
(ROOT / "visual-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Prepared {len(sentences)} scenes: {report['imageCount']} AI illustrations, {report['vectorSceneCount']} vector scenes", flush=True)
