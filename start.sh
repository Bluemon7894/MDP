#!/bin/bash
cd "$(dirname "$0")"

echo "========================================================"
echo "  Starting cat.io Arcade & Candy Dispenser System..."
echo "========================================================"
echo ""

# Check node_modules and install if missing
if [ ! -d "node_modules" ]; then
    echo "[INFO] Dependencies not found. Installing packages..."
    if command -v pnpm &> /dev/null; then
        pnpm install
    elif command -v npm &> /dev/null; then
        npm install
    else
        echo "[ERROR] Node.js is not installed!"
        echo "Please install Node.js first (e.g. sudo apt install -y nodejs npm)"
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo ""
fi

# Run Candy Dispenser API Server in background (Port 8080)
if [ -f "candy_server.py" ]; then
    pkill -f "candy_server.py" 2>/dev/null
    echo "[INFO] Starting Candy Dispenser hardware server (port 8080)..."
    python3 candy_server.py --port=8080 > /dev/null 2>&1 &
fi

# Detect Raspberry Pi IP Address
IP_ADDR=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$IP_ADDR" ]; then
    IP_ADDR="localhost"
fi

echo "========================================================"
echo "  [Arcade Server Online]"
echo "  - Local Browser : http://localhost:5199"
echo "  - Network Access: http://$IP_ADDR:5199"
echo "  - 1P Screen     : http://$IP_ADDR:5199/?screen=a"
echo "  - 2P / Ranking  : http://$IP_ADDR:5199/?screen=b"
echo "  - Dispenser API : http://$IP_ADDR:8080/status"
echo "========================================================"
echo ""

if command -v pnpm &> /dev/null; then
    pnpm dev --port 5199 --host 0.0.0.0
else
    npm run dev -- --port 5199 --host 0.0.0.0
fi
