"""Optional Rhubarb Lip Sync adapter. Uses local CLI if installed.
See https://github.com/DanielSWolf/rhubarb-lip-sync
"""
import json, shutil, subprocess
from pathlib import Path

def mouth_cues(audio_path, output_path):
    binary=shutil.which("rhubarb")
    if not binary:
        return None
    audio_path=Path(audio_path)
    output_path=Path(output_path)
    subprocess.run([binary,"-f","json","-o",str(output_path),str(audio_path)],
                   check=True,timeout=120,capture_output=True,text=True)
    data=json.loads(output_path.read_text(encoding="utf-8"))
    cues=data.get("mouthCues",[])
    if not isinstance(cues,list):
        raise ValueError("Invalid Rhubarb mouthCues")
    return cues
