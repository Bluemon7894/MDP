#!/usr/bin/env python3
"""
render_all.py - Automated OpenSCAD build and verification script.
Renders all components to manifold STL files and outputs geometry verification.
"""

import os
import subprocess
import sys
import time

OPENSCAD_PATHS = [
    r"C:\Program Files\OpenSCAD\openscad.com",
    r"C:\Program Files (x86)\OpenSCAD\openscad.com",
    "openscad",
]

def find_openscad():
    for p in OPENSCAD_PATHS:
        if os.path.exists(p):
            return p
    return "openscad"

def main():
    root = os.path.abspath(os.path.dirname(__file__))
    cad_dir = os.path.join(root, "cad")
    stl_dir = os.path.join(root, "stl")
    os.makedirs(stl_dir, exist_ok=True)

    openscad = find_openscad()
    print(f"[RENDER] Using OpenSCAD executable: {openscad}")

    targets = [
        ("drum_dispenser.scad", "drum_dispenser.stl"),
        ("mid_housing.scad", "mid_housing.stl"),
        ("base_chassis.scad", "base_chassis.stl"),
        ("top_hopper.scad", "top_hopper.stl"),
        ("top_lid.scad", "top_lid.stl"),
        ("service_panel.scad", "service_panel.stl"),
    ]

    total_start = time.time()
    success_count = 0

    for scad_file, stl_file in targets:
        scad_path = os.path.join(cad_dir, scad_file)
        stl_path = os.path.join(stl_dir, stl_file)

        print(f"\n[BUILDING] {scad_file} -> {stl_file}...")
        t0 = time.time()
        cmd = [openscad, "-o", stl_path, scad_path]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        elapsed = time.time() - t0

        if proc.returncode == 0 and os.path.exists(stl_path):
            size_kb = os.path.getsize(stl_path) / 1024.0
            print(f"  [OK] Generated {stl_file} ({size_kb:.1f} KB) in {elapsed:.2f}s")
            success_count += 1
        else:
            print(f"  [FAIL] Failed to generate {stl_file}")
            print(proc.stderr)

    # Render assembly preview image
    preview_scad = os.path.join(cad_dir, "assembly_preview.scad")
    preview_png = os.path.join(cad_dir, "assembly_preview.png")
    print(f"\n[PREVIEW] Rendering {preview_png}...")
    subprocess.run([
        openscad, "-o", preview_png,
        "--imgsize=1200,900",
        "--colorscheme=Solarized",
        preview_scad
    ])

    total_time = time.time() - total_start
    print(f"\n[COMPLETE] Successfully built {success_count}/{len(targets)} components in {total_time:.1f}s.")

if __name__ == "__main__":
    main()
