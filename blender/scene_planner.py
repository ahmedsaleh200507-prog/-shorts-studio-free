"""Small deterministic German/English scene planner for the Blender pilot.

This is intentionally limited to three illustrated scene families. Unknown text
is reported as unsupported instead of silently generating unrelated imagery.
"""
import json
import re
import sys

PATTERNS = {
    "city": r"\b(?:stadt|städte|city|town|blackout|stromausfall|power outage|gebäude|buildings?)\b",
    "phone": r"\b(?:telefon|handy|smartphone|phone|warnung|warning|alarm|notfall|emergency|nachricht|message)\b",
    "map": r"\b(?:karte|stadtplan|map|route|weg|straße|strasse|street|road|navigation)\b",
}

def plan(script):
    script = script.strip()
    if not script or len(script) > 3000:
        raise ValueError("Script must be 1–3000 characters")
    sentences = [s.strip() for s in re.findall(r"[^.!?\n]+[.!?]?", script) if s.strip()]
    if len(sentences) > 60:
        raise ValueError("Maximum 60 sentences")
    result = []
    for sentence in sentences:
        scores = {kind: len(re.findall(pattern, sentence, flags=re.I)) for kind, pattern in PATTERNS.items()}
        best = max(scores, key=scores.get)
        result.append({"text": sentence, "visual": best if scores[best] else "unsupported",
                       "supported": bool(scores[best])})
    return {"scenes": result, "all_supported": all(s["supported"] for s in result)}

if __name__ == "__main__":
    source = sys.stdin.read()
    print(json.dumps(plan(source), ensure_ascii=False, indent=2))
