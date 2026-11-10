import os, sys, io, re, zipfile, json
import cv2
import numpy as np
from build_dataset import resolve_english_label, process_drawing

def extract_features(norm128):
    # Extract 16x16 spatial density grid (256 values)
    grid16 = cv2.resize(norm128, (16, 16), interpolation=cv2.INTER_AREA)
    vec = (grid16.astype(np.float32) / 255.0).flatten()
    norm = np.linalg.norm(vec)
    if norm > 1e-6:
        vec = vec / norm
    
    # Hu moments
    moments = cv2.moments(norm128)
    hu = cv2.HuMoments(moments).flatten()
    # Log transform for Hu moments
    hu_log = []
    for h in hu:
        if abs(h) > 1e-15:
            hu_log.append(float(-1 * np.sign(h) * np.log10(abs(h))))
        else:
            hu_log.append(0.0)
            
    return {
        "grid": [round(float(v), 4) for v in vec],
        "hu": [round(v, 3) for v in hu_log]
    }

def main():
    print("[1/4] Scanning zip files...")
    category_samples = {} # en_label -> list of features
    
    zips = ["MDP 그림.zip", "그림.zip"]
    total_found = 0
    total_matched = 0
    
    for zpath in zips:
        if not os.path.exists(zpath): continue
        with zipfile.ZipFile(zpath, "r") as z:
            for info in z.infolist():
                if info.is_dir() or not info.filename.lower().endswith(".png"):
                    continue
                total_found += 1
                try:
                    name = info.filename.encode("cp437").decode("euc-kr")
                except:
                    name = info.filename
                base = os.path.basename(name)
                stem = os.path.splitext(base)[0].strip()
                
                en_label = resolve_english_label(stem)
                if not en_label:
                    continue
                
                total_matched += 1
                data = z.read(info.filename)
                res = process_drawing(data)
                if res is None:
                    continue
                    
                norm128, norm256 = res
                feats = extract_features(norm128)
                
                if en_label not in category_samples:
                    category_samples[en_label] = []
                category_samples[en_label].append({
                    "feats": feats,
                    "norm256": norm256
                })

    print(f"Total images found: {total_found}, successfully mapped: {total_matched}")
    print(f"Unique categories covered: {len(category_samples)}")
    
    # [2/4] Compute centroid model for each category
    model_database = {}
    ai_img_dir = "src/img/ai"
    os.makedirs(ai_img_dir, exist_ok=True)
    
    saved_ai_count = 0
    for en_label, samples in category_samples.items():
        # Average the grid vectors
        grids = np.array([s["feats"]["grid"] for s in samples])
        centroid_grid = np.mean(grids, axis=0)
        c_norm = np.linalg.norm(centroid_grid)
        if c_norm > 1e-6:
            centroid_grid = centroid_grid / c_norm
            
        # Average hu moments
        hus = np.array([s["feats"]["hu"] for s in samples])
        centroid_hu = np.mean(hus, axis=0)
        
        model_database[en_label] = {
            "grid": [round(float(v), 4) for v in centroid_grid],
            "hu": [round(float(v), 3) for v in centroid_hu],
            "sample_count": len(samples)
        }
        
        # Save highest quality sample to src/img/ai/<en_label>.png for Super AI drawing!
        best_norm256 = samples[0]["norm256"]
        # Invert so black stroke on transparent or white background
        clean_canvas = 255 - best_norm256 # 255 = white, 0 = black stroke
        clean_path = os.path.join(ai_img_dir, f"{en_label.replace(' ', '_')}.png")
        cv2.imwrite(clean_path, clean_canvas)
        saved_ai_count += 1

    print(f"[3/4] Saved {saved_ai_count} hand-drawn master reference sketches to {ai_img_dir}")
    
    # Save model database to JSON
    json_path = "src/constants/friendsDrawingsSignatures.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(model_database, f, separators=(',', ':'))
        
    size_kb = os.path.getsize(json_path) / 1024.0
    print(f"[4/4] Generated lightweight AI recognition signature model: {json_path} ({size_kb:.1f} KB)")
    print("\n[SUCCESS] Custom friend drawing AI dataset and signature model built successfully!")

if __name__ == "__main__":
    main()
