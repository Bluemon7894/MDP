#!/usr/bin/env python3
"""
render_views.py - Generates 4 high-definition multi-angle realistic renders of the
assembled retro candy dispenser for visual inspection.
"""

import os
import subprocess

OPENSCAD = r"C:\Program Files\OpenSCAD\openscad.com"
SCAD_FILE = r"candy_dispenser\cad\assembly_preview.scad"
ARTIFACT_DIR = r"C:\Users\User\.gemini\antigravity\brain\33631793-d550-4917-9555-80fee120b379"

views = [
    # (output_filename, camera_params, explode_val)
    ("render_front_retro.png", "75,67.5,112.5,70,0,325,600", 0),   # Front-Right: Coin slot, Vending bezel, Tray
    ("render_front_window.png", "75,67.5,112.5,65,0,35,620", 0),    # Front-Left: Display window, Drum, Candy Tray
    ("render_rear_service.png", "75,67.5,112.5,65,0,215,620", 0),   # Rear: Service panel, Pi 5 ports, Ventilation
    ("render_assembled_iso.png", "75,67.5,112.5,60,0,310,650", 0),  # Full Isometric 3D
    ("render_exploded_3d.png", "75,67.5,112.5,60,0,320,850", 45),   # Exploded Assembly
]

for fname, cam, exp in views:
    out_path = os.path.join(ARTIFACT_DIR, fname)
    cmd = [
        OPENSCAD,
        "-o", out_path,
        "-D", f"explode_z={exp}",
        "--imgsize=1600,1200",
        "--colorscheme=Solarized",
        "--camera=" + cam,
        SCAD_FILE
    ]
    print(f"Rendering {fname} (camera={cam}, explode={exp})...")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode == 0 and os.path.exists(out_path):
        size_kb = os.path.getsize(out_path) / 1024.0
        print(f"  [OK] {fname} ({size_kb:.1f} KB)")
    else:
        print(f"  [FAIL] {fname}: {res.stderr}")

print("\nAll renders completed!")
