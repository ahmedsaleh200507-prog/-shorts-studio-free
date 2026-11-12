"""Generate real AI scene artwork with Pollinations, only when a server-side key is configured."""
import json, os, pathlib, re, urllib.parse, urllib.request, urllib.error
ROOT=pathlib.Path(__file__).resolve().parent
script=os.environ.get("SCRIPT","").strip()
key=os.environ.get("POLLINATIONS_KEY","").strip()
if not key.startswith("sk_"):
    raise SystemExit("AI image mode requires a Pollinations sk_ key in GitHub Actions secret POLLINATIONS_KEY.")
sentences=[s.strip() for s in re.findall(r"[^.!?\n]+[.!?]?",script) if s.strip()]
if not sentences or len(sentences)>60: raise SystemExit("Invalid script")
out=ROOT/"public"/"ai-scenes";out.mkdir(parents=True,exist_ok=True)
uris=[]
# Shared visual bible for the whole story; this improves prompt consistency,
# but does not guarantee identity without image-reference support.
story_context=script[:1400]
character_bible=("Keep one recurring protagonist across scenes: same face, hairstyle, "
                  "clothes, age and proportions, unless the script explicitly changes them. ")
previous_scene=""
for i,sentence in enumerate(sentences):
    prompt=("Vertical 9:16, richly detailed hand-painted 2D animated film still, flat illustrated 2D only, "
            "cohesive character design, expressive cinematic lighting, vivid environment, clean outlines, "
            "no letters, no subtitles, no watermarks, no 3D, no photorealism. Scene: "+sentence)
    prompt += (" Entire story context: "+story_context+
               ". "+character_bible+
               (" Previous scene: "+previous_scene+". Preserve visual continuity." if previous_scene else ""))
    previous_scene=sentence
    models=[m.strip() for m in os.environ.get("AI_IMAGE_MODELS","black-forest-labs/flux.1-schnell").split(",") if m.strip()][:3]
    if not models: raise SystemExit("No image model configured")
    query=urllib.parse.urlencode({"model":models[0],"width":576,"height":1024,"seed":42})
    url="https://gen.pollinations.ai/image/"+urllib.parse.quote(prompt,safe="")+"?"+query
    req=urllib.request.Request(url,headers={"Authorization":"Bearer "+key,"Accept":"image/*","User-Agent":"ShortsStudioFree/1.0"})
    try:
        with urllib.request.urlopen(req,timeout=180) as resp:
            data=resp.read(12_000_001)
            mime=resp.headers.get("Content-Type","").split(";")[0].strip().lower()
    except urllib.error.HTTPError as exc:
        if exc.code in (401,402,403,429):
            raise SystemExit(f"AI provider unavailable (HTTP {exc.code}); check key, balance or quota.") from None
        if exc.code not in (400,404,500,502,503,504) or len(models)<2: raise
        data=None
        for fallback in models[1:]:
            print(f"Model unavailable (HTTP {exc.code}); trying {fallback}",flush=True)
            query=urllib.parse.urlencode({"model":fallback,"width":576,"height":1024,"seed":42})
            url="https://gen.pollinations.ai/image/"+urllib.parse.quote(prompt,safe="")+"?"+query
            req=urllib.request.Request(url,headers={"Authorization":"Bearer "+key,"Accept":"image/*","User-Agent":"ShortsStudioFree/1.0"})
            try:
                with urllib.request.urlopen(req,timeout=180) as resp:
                    data=resp.read(12_000_001)
                    mime=resp.headers.get("Content-Type","").split(";")[0].strip().lower()
                break
            except urllib.error.HTTPError as fallback_exc:
                if fallback_exc.code in (401,402,403,429):
                    raise SystemExit(f"AI provider unavailable (HTTP {fallback_exc.code}); quota or key issue.") from None
                if fallback_exc.code not in (400,404,500,502,503,504): raise
        if data is None: raise SystemExit("All configured image models failed")
    if len(data)>12_000_000 or len(data)<1000 or mime not in ("image/jpeg","image/png","image/webp"):
        raise SystemExit(f"Invalid AI image response for scene {i+1}: {mime}")
    ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[mime]
    filename=f"scene-{i}.{ext}"
    (out/filename).write_bytes(data)
    uris.append("/ai-scenes/"+filename)
(ROOT/"ai-scene-images.mjs").write_text("export const aiSceneImages = "+json.dumps(uris)+";\n",encoding="utf-8")
print("Generated",len(uris),"real AI images",flush=True)
