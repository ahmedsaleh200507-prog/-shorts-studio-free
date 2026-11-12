"""Fast deterministic animation regression checks (no TTS/GPU needed)."""
import sys, tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from motion2d import frame, write_frames, FPS

def main():
    cases=[
        "Die Stadt wird dunkel. Ein Mann läuft durch die Straße.",
        "Ein Mann kauft Obst im Supermarkt.",
        "Die Ärztin arbeitet im Krankenhaus.",
        "Der Bus fährt zum Bahnhof."
    ]
    for i,script in enumerate(cases):
        first=frame(script,i,len(cases),0.0,2.0)
        second=frame(script,i,len(cases),1.0,2.0)
        assert first.size==(540,960)
        assert first.tobytes()!=second.tobytes(),f"Scene {i+1} is static"
    with tempfile.TemporaryDirectory() as tmp:
        count=write_frames(cases[0],0,4,0.3,tmp)
        assert count>=3 and len(list(Path(tmp).glob('frame_*.png')))==count
    print(f"PASS: {len(cases)} animated scene categories, {FPS} fps, non-static frames")

if __name__=="__main__":main()
