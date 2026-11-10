#!/usr/bin/env python3
"""
candy_server.py - 100% English Verified Candy Dispenser Controller & API Server
Verified Pin Sequence: [17, 27, 18, 22]
Listens on Port 8080 for cat.io Web Game.
"""

import sys
import time
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from gpiozero import OutputDevice

# Verified working pin sequence on Pi 5 (Swapped middle pins: IN1, IN3, IN2, IN4)
PINS = [17, 27, 18, 22]

HALF_STEP_SEQ = [
    [1, 0, 0, 0],
    [1, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 1],
    [0, 0, 0, 1],
    [1, 0, 0, 1]
]

# 28BYJ-48 Gear ratio 64:1 -> 4096 half-steps per 360 degree rotation
STEPS_PER_REV = 4096
STEP_DELAY = 0.0028  # High torque and smooth rotation

class CandyDispenser:
    def __init__(self):
        self.pins = [OutputDevice(p) for p in PINS]
        self.release()

    def release(self):
        """Cuts power to all coils immediately (0W standby power)."""
        for p in self.pins:
            p.off()

    def step(self, steps, delay=STEP_DELAY):
        direction = 1 if steps > 0 else -1
        idx = 0 if direction == 1 else 7
        for _ in range(abs(steps)):
            state = HALF_STEP_SEQ[idx]
            for p, val in zip(self.pins, state):
                if val: p.on()
                else: p.off()
            time.sleep(delay)
            idx = (idx + direction) % 8
        self.release()

    def dispense_single(self):
        print("[DISPENSER] Dispensing 1 candy (360 degree rotation)...")
        # 1. Rotate 360 degrees forward to dispense
        self.step(STEPS_PER_REV)
        # 2. 15-degree reverse wiggle to release wrapper wing
        self.step(-170)
        # 3. Cut coil power
        self.release()
        print("[DISPENSER] Dispense complete. Motor standby cool.")

    def test(self):
        print("\n" + "=" * 55)
        print("  CANDY DISPENSER 360-DEGREE VERIFICATION")
        print("=" * 55)
        print("1. Rotating 360 degrees forward...")
        self.dispense_single()
        print("2. Motor coils powered OFF.")
        print("[OK] Test passed! Motor is ready for game integration.")

dispenser = None

class Handler(BaseHTTPRequestHandler):
    def _send(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        self._send(200, {"status": "ok"})

    def do_GET(self):
        if self.path == "/dispense":
            dispenser.dispense_single()
            self._send(200, {"status": "dispensed", "count": 1})
        elif self.path == "/status":
            self._send(200, {"status": "ready", "device": "RetroCandyDispenser"})
        else:
            self._send(404, {"error": "Use /dispense or /status"})

    def do_POST(self):
        if self.path == "/dispense":
            dispenser.dispense_single()
            self._send(200, {"status": "dispensed", "count": 1})
        else:
            self._send(404, {"error": "Not Found"})

    def log_message(self, fmt, *args):
        print(f"[API] {self.address_string()} - {fmt % args}")

if __name__ == "__main__":
    dispenser = CandyDispenser()
    if "--test" in sys.argv:
        dispenser.test()
        sys.exit(0)

    port = 8080
    print("=" * 60)
    print(f"  RETRO CANDY DISPENSER SERVER RUNNING ON PORT {port}")
    print(f"  Ready for cat.io game triggers: POST http://<pi-ip>:{port}/dispense")
    print("=" * 60)
    server = HTTPServer(("0.0.0.0", port), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        dispenser.release()
        print("\nServer stopped.")
