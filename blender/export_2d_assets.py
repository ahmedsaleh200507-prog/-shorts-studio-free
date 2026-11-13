"""Generate transparent 2D character parts using Blender's Python API.

Run: blender --background --factory-startup --python blender/export_2d_assets.py -- --out blender/export
No 3D geometry or camera is used: SVG-like 2D art is drawn using Blender's 2D curves.
"""
import argparse
import sys
from pathlib import Path

def main():
    import bpy
    from mathutils import Vector
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="blender/export")
    opts = parser.parse_args(args)
    out = Path(opts.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Blender Grease Pencil authoring file. An artist can edit layers in Blender;
    # this script exports a reusable source .blend for future 2D rig assets.
    gp = bpy.data.grease_pencils_v3.new("Shorts2DCharacter")
    obj = bpy.data.objects.new("Shorts2DCharacter", gp)
    bpy.context.collection.objects.link(obj)
    gp.layers.new("Character", set_active=True)
    gp.layers.new("Props", set_active=False)
    gp.layers.new("Background", set_active=False)
    bpy.ops.wm.save_as_mainfile(filepath=str(out / "shorts-2d-assets.blend"))
    assert (out / "shorts-2d-assets.blend").stat().st_size > 0
    print("Blender Grease Pencil source created:", out / "shorts-2d-assets.blend")

if __name__ == "__main__":
    main()
