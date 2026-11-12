#!/usr/bin/env python3
"""
merge_assembly_stl.py - Fast Binary STL Merger for Assembled Dispenser
Properly parses ASCII or Binary component STLs, transforms each to its exact assembly
position, and writes out a single unified 3D assembly STL file for 3D viewers/slicers.
"""

import os
import struct
import math

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
STL_DIR = os.path.join(ROOT_DIR, "stl")
OUTPUT_STL = os.path.join(STL_DIR, "assembled_candy_dispenser_complete.stl")

def load_stl(fpath):
    """Detects ASCII vs Binary STL and parses triangles reliably."""
    with open(fpath, "rb") as f:
        prefix = f.read(5)

    if prefix == b"solid":
        # ASCII STL
        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        tris = []
        curr_v = []
        curr_n = (0.0, 0.0, 0.0)
        for line in lines:
            parts = line.strip().split()
            if not parts:
                continue
            if parts[0] == "facet" and len(parts) >= 5 and parts[1] == "normal":
                curr_n = (float(parts[2]), float(parts[3]), float(parts[4]))
                curr_v = []
            elif parts[0] == "vertex" and len(parts) >= 4:
                curr_v.append((float(parts[1]), float(parts[2]), float(parts[3])))
                if len(curr_v) == 3:
                    tris.append((curr_n, curr_v[0], curr_v[1], curr_v[2], 0))
                    curr_v = []
        return tris
    else:
        # Binary STL
        with open(fpath, "rb") as f:
            header = f.read(80)
            tri_bytes = f.read(4)
            if len(tri_bytes) < 4:
                return []
            count = struct.unpack("<I", tri_bytes)[0]
            triangles = []
            for _ in range(count):
                data = f.read(50)
                if len(data) < 50:
                    break
                vals = struct.unpack("<3f3f3f3fH", data)
                norm = vals[0:3]
                v1 = vals[3:6]
                v2 = vals[6:9]
                v3 = vals[9:12]
                attr = vals[12]
                triangles.append((norm, v1, v2, v3, attr))
            return triangles

def transform_pt(p, rot, trans):
    """Applies Euler rotation [rx, ry, rz] in degrees, then translation [tx, ty, tz]."""
    x, y, z = p
    rx, ry, rz = [math.radians(a) for a in rot]

    # Rotate X
    if rx != 0:
        c, s = math.cos(rx), math.sin(rx)
        y, z = y * c - z * s, y * s + z * c

    # Rotate Y
    if ry != 0:
        c, s = math.cos(ry), math.sin(ry)
        x, z = x * c + z * s, -x * s + z * c

    # Rotate Z
    if rz != 0:
        c, s = math.cos(rz), math.sin(rz)
        x, y = x * c - y * s, x * s + y * c

    # Translate
    return (x + trans[0], y + trans[1], z + trans[2])

def main():
    parts = [
        # (filename, rotation, translation)
        ("base_chassis.stl",   [0, 0, 0],   [0, 0, 0]),
        ("mid_housing.stl",    [0, 0, 0],   [0, 0, 45.0]),
        ("drum_dispenser.stl",   [0, 90, 0],  [10.0, 70.0, 97.0]),
        ("drum_bearing_cap.stl", [0, -90, 0], [0.0, 70.0, 97.0]),
        ("service_panel.stl",    [90, 0, 0],  [75.0, 135.0, 53.0]),
        ("top_hopper.stl",     [0, 0, 0],   [0, 0, 140.0]),
        ("top_lid.stl",        [0, 0, 0],   [6.35, 8.35, 221.0]),
    ]

    all_triangles = []

    print("[MERGE] Loading components and applying assembly matrices...")
    for fname, rot, trans in parts:
        fpath = os.path.join(STL_DIR, fname)
        if not os.path.exists(fpath):
            alt_name = fname.replace(".stl", "(완료).stl")
            alt_path = os.path.join(STL_DIR, alt_name)
            if os.path.exists(alt_path):
                fpath = alt_path
                fname = alt_name
            else:
                print(f"  [MISSING] {fname}")
                continue

        tris = load_stl(fpath)
        print(f"  * {fname:20s}: {len(tris):6d} triangles -> Pos: {trans}, Rot: {rot}")

        for norm, v1, v2, v3, attr in tris:
            tv1 = transform_pt(v1, rot, trans)
            tv2 = transform_pt(v2, rot, trans)
            tv3 = transform_pt(v3, rot, trans)

            # Recompute normal
            ux, uy, uz = tv2[0] - tv1[0], tv2[1] - tv1[1], tv2[2] - tv1[2]
            vx, vy, vz = tv3[0] - tv1[0], tv3[1] - tv1[1], tv3[2] - tv1[2]
            nx = uy * vz - uz * vy
            ny = uz * vx - ux * vz
            nz = ux * vy - uy * vx
            nlen = math.sqrt(nx*nx + ny*ny + nz*nz)
            if nlen > 1e-9:
                tnorm = (nx/nlen, ny/nlen, nz/nlen)
            else:
                tnorm = norm

            all_triangles.append((tnorm, tv1, tv2, tv3, attr))

    # Calculate bounding box
    all_x = [v[0] for t in all_triangles for v in t[1:4]]
    all_y = [v[1] for t in all_triangles for v in t[1:4]]
    all_z = [v[2] for t in all_triangles for v in t[1:4]]

    min_x, max_x = min(all_x), max(all_x)
    min_y, max_y = min(all_y), max(all_y)
    min_z, max_z = min(all_z), max(all_z)

    print("\n[VERIFICATION] Transformed Assembly Bounding Box:")
    print(f"  X: {min_x:.1f} to {max_x:.1f} mm (Size: {max_x - min_x:.1f} mm)")
    print(f"  Y: {min_y:.1f} to {max_y:.1f} mm (Size: {max_y - min_y:.1f} mm)")
    print(f"  Z: {min_z:.1f} to {max_z:.1f} mm (Size: {max_z - min_z:.1f} mm)")

    # Write unified binary STL
    print(f"\n[OUTPUT] Writing unified binary STL ({len(all_triangles)} total triangles)...")
    header_str = b"Antigravity Unified Complete Retro Candy Dispenser Assembly STL\0"
    header_bytes = header_str.ljust(80, b"\0")

    with open(OUTPUT_STL, "wb") as f:
        f.write(header_bytes)
        f.write(struct.pack("<I", len(all_triangles)))
        for norm, v1, v2, v3, attr in all_triangles:
            data = struct.pack(
                "<3f3f3f3fH",
                norm[0], norm[1], norm[2],
                v1[0], v1[1], v1[2],
                v2[0], v2[1], v2[2],
                v3[0], v3[1], v3[2],
                attr
            )
            f.write(data)

    size_mb = os.path.getsize(OUTPUT_STL) / (1024 * 1024)
    print(f"[SUCCESS] Unified STL created: {OUTPUT_STL} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    main()
