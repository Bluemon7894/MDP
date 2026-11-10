#!/usr/bin/env python3
"""
render_perspectives.py - Generates ultra-clean 3D perspective and cutaway renderings
of the newly updated retro candy dispenser.
"""

import os
import subprocess

OPENSCAD = r"C:\Program Files\OpenSCAD\openscad.com"
SCAD_FILE = r"candy_dispenser\cad\cutaway_view.scad"
ARTIFACT_DIR = r"C:\Users\User\.gemini\antigravity\brain\33631793-d550-4917-9555-80fee120b379"

views = [
    # (output_filename, cut_mode, camera_params, description)
    (
        "perspective_1_front_cross_section.png",
        "front_half",
        "75,70,115,80,0,0,550",
        "정면 중앙 수직 단면 투시도 (호퍼 슬라이드 -> 드럼 포켓 -> 배출구 직결 흐름)"
    ),
    (
        "perspective_2_iso_cutaway.png",
        "front_half",
        "75,70,115,62,0,315,620",
        "3D 아이소메트릭 내부 단면 투시도 (식품부/전자부 입체 구조)"
    ),
    (
        "perspective_3_quarter_cutaway.png",
        "quarter",
        "75,70,115,60,0,325,650",
        "우측 전장실 및 드럼 포켓 입체 절개 투시도"
    ),
    (
        "perspective_4_xray_translucent.png",
        "xray",
        "75,70,115,60,0,320,680",
        "외관 반투명 엑스레이(X-Ray) 전체 투시도 (외피 투과 내부 메커니즘)"
    ),
    (
        "perspective_5_hopper_top_view.png",
        "front_half",
        "75,70,140,40,0,330,550",
        "상단 호퍼 깔때기 상공 투시도 (46.7도 미끄럼틀 경사면 집중)"
    ),
]

for fname, mode, cam, desc in views:
    out_path = os.path.join(ARTIFACT_DIR, fname)
    cmd = [
        OPENSCAD,
        "-o", out_path,
        "-D", f'cut_mode="{mode}"',
        "--imgsize=1600,1200",
        "--colorscheme=Solarized",
        "--camera=" + cam,
        SCAD_FILE
    ]
    print(f"Rendering {fname} ({desc})...")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode == 0 and os.path.exists(out_path):
        size_kb = os.path.getsize(out_path) / 1024.0
        print(f"  [OK] {fname} ({size_kb:.1f} KB)")
    else:
        print(f"  [FAIL] {fname}: {res.stderr}")

print("\nAll perspective renderings completed!")
