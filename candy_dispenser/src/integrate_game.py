import os

app_path = r"c:\Users\User\Desktop\학교\2학년\MDP\cat.io\src\App.tsx"

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# Normalize line endings to avoid matching issues
has_crlf = "\r\n" in content
lines = content.splitlines()

# 1. Add import
import_idx = -1
for i, line in enumerate(lines):
    if "import { postArcade, onArcade" in line:
        import_idx = i
        break

if import_idx != -1 and "candyDispenser" not in content:
    lines.insert(import_idx + 1, "import { dispenseCandy } from './utils/candyDispenser'")

# 2. Add dispense calls in finishGameAndSaveRanking
new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    
    # Solo complete
    if "const r1 = saveRecord(p1Name, finalP1Score, 'solo', '1P')" in line:
        new_lines.append("    dispenseCandy('solo_complete')")
        
    # AI win
    elif "const isWin = finalP1Score > finalP2Score" in line:
        pass
    elif "const result = finalP1Score > finalP2Score ? 'AI를 이겼습니다.' :" in line:
        # insert win dispense check before result
        new_lines.insert(len(new_lines) - 1, "    if (finalP1Score > finalP2Score) dispenseCandy('beat_ai')")
        
    # PVP win
    elif "const winner = finalP1Score > finalP2Score ? `${p1Name}님 승리`" in line:
        new_lines.insert(len(new_lines) - 1, "    if (finalP1Score !== finalP2Score) dispenseCandy('pvp_winner')")

    # Coop complete
    elif "const team = `${p1Name} & ${p2Name}`" in line:
        new_lines.append("    dispenseCandy('coop_complete')")

sep = "\r\n" if has_crlf else "\n"
output_content = sep.join(new_lines) + sep

with open(app_path, "w", encoding="utf-8") as f:
    f.write(output_content)

print("[SUCCESS] Game logic integration into App.tsx completed!")
