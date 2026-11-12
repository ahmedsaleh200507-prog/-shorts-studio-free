"""Optional remote ComfyUI image generation for each narrated 2D scene.

Requires a reachable ComfyUI server with a loaded checkpoint and GPU.
No GPU or paid service is provisioned by this module.
"""
import json, os, time, urllib.request, urllib.parse

def request(url, data=None, timeout=45):
    headers={"User-Agent":"ShortsStudio/1.0"}
    token=os.getenv("COMFYUI_API_TOKEN","").strip()
    if token: headers["Authorization"]="Bearer "+token
    if data is not None:
        data=json.dumps(data).encode("utf-8")
        headers["Content-Type"]="application/json"
    with urllib.request.urlopen(urllib.request.Request(url,data=data,headers=headers),timeout=timeout) as r:
        return r.read()

def generate(sentence, destination, index):
    base=os.getenv("COMFYUI_URL","").strip().rstrip("/")
    workflow_file=os.getenv("COMFYUI_WORKFLOW","").strip()
    if not base or not workflow_file:
        return False
    with open(workflow_file,encoding="utf-8") as f: graph=json.load(f)
    # The workflow must contain CLIPTextEncode nodes with one positive prompt.
    prompt=("High quality cinematic 2D hand-drawn animation frame, layered illustration, "
            "expressive characters, detailed environment, dynamic composition, no text, "
            "vertical 9:16. Scene: "+sentence)
    positive_nodes=[v for v in graph.values() if v.get("class_type")=="CLIPTextEncode" and isinstance(v.get("inputs",{}).get("text"),str)]
    if not positive_nodes: raise ValueError("ComfyUI workflow needs a CLIPTextEncode text node")
    positive_nodes[0]["inputs"]["text"]=prompt
    for v in graph.values():
        if v.get("class_type") in ("KSampler","KSamplerAdvanced") and "seed" in v.get("inputs",{}):
            v["inputs"]["seed"]=int(time.time_ns()% (2**32))+index
    response=json.loads(request(base+"/prompt",{"prompt":graph}))
    job=response["prompt_id"]
    deadline=time.monotonic()+180
    while time.monotonic()<deadline:
        history=json.loads(request(base+"/history/"+urllib.parse.quote(job)))
        record=history.get(job)
        if record:
            for node in record.get("outputs",{}).values():
                for img in node.get("images",[]):
                    params=urllib.parse.urlencode({"filename":img["filename"],"subfolder":img.get("subfolder",""),"type":img.get("type","output")})
                    destination.write_bytes(request(base+"/view?"+params))
                    return True
            raise RuntimeError("ComfyUI completed without an image output")
        time.sleep(3)
    raise TimeoutError("ComfyUI image generation exceeded 180 seconds")
