"""Create editable Grease Pencil v3 2D character source in Blender 4.3+.

Run: blender --background --factory-startup --python blender/export_2d_assets.py -- --out blender/export
This produces an editable .blend source asset, NOT a fully rigged animation.
"""
import argparse
import sys
from pathlib import Path

def main():
    import bpy
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="blender/export")
    opts = parser.parse_args(args)
    if bpy.app.version < (4, 3, 0):
        raise RuntimeError(f"Grease Pencil v3 requires Blender >=4.3; found {bpy.app.version_string}")
    out = Path(opts.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    gp = bpy.data.grease_pencils_v3.new("Shorts2DCharacter")
    obj = bpy.data.objects.new("Shorts2DCharacter", gp)
    bpy.context.collection.objects.link(obj)
    for name in ("Character", "Props", "Background"):
        gp.layers.new(name, set_active=(name == "Character"))
    bpy.ops.wm.save_as_mainfile(filepath=str(out / "shorts-2d-assets.blend"))
    if (out / "shorts-2d-assets.blend").stat().st_size < 100:
        raise RuntimeError("Blender source asset missing or empty")
    print("Editable Grease Pencil source:", out / "shorts-2d-assets.blend")

if __name__ == "__main__":
    main()
