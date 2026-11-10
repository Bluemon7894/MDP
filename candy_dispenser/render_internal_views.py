#!/usr/bin/env python3
"""
render_internal_views.py - Generates ultra-detailed internal section renderings
showing exact mechanical and electrical placement inside the dispenser.
"""

import os
import subprocess

OPENSCAD = r"C:\Program Files\OpenSCAD\openscad.com"
SCAD_FILE = r"candy_dispenser\cad\internal_detailed_views.scad"
ARTIFACT_DIR = r"C:\Users\User\.gemini\antigravity\brain\33631793-d550-4917-9555-80fee120b379"

views = [
    # (filename, view_mode, camera_params)
    (
        "detail_1_candy_path.png",
        "candy_path",
        "35,70,110,65,0,325,500"  # Zoomed into Left Candy Path: Hopper -> Drum -> Chute -> Tray
    ),
    (
        "detail_2_electronics_bay.png",
        "electronics",
        "110,70,85,60,0,315,520"  # Zoomed into Right Electronics Bay: Motor on Divider, Pi 5, ULN2003
    ),
    (
        "detail_3_front_cross_section.png",
        "front_cross_section",
        "75,70,110,75,0,0,550"    # Front direct cross-section showing Food Bay | Divider Wall | Electronics Bay
    ),
    (
        "detail_4_internal_iso.png",
        "front_cross_section",
        "75,70,110,60,0,315,600"  # Isometric 3D view of the internal cross section
    ),
]

for fname, mode, cam in views:
    out_path = os.path.join(ARTIFACT_DIR, fname)
    cmd = [
        OPENSCAD,
        "-o", out_path,
        "-D", f'view_mode="{mode}"',
        "--imgsize=1600,1200",
        "--colorscheme=Solarized",
        "--camera=" + cam,
        SCAD_FILE
    ]
    print(f"Rendering {fname} (mode={mode}, camera={cam})...")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode == 0 and os.path.exists(out_path):
        size_kb = os.path.getsize(out_path) / 1024.0
        print(f"  [OK] {fname} ({size_kb:.1f} KB)")
    else:
        print(f"  [FAIL] {fname}: {res.stderr}")

print("\nInternal detail renders completed!")
