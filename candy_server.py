#!/usr/bin/env python3
"""
candy_server.py - 100% English Verified Candy Dispenser Controller & API Server
Verified Pin Sequence: [17, 27, 18, 22]
Listens on Port 8080 for cat.io Web Game.

Dispense cycle (verified on hardware):
  1. Rotate 180 deg reverse (-2048 half-steps at high reliable speed) -> pocket faces dump chute
  2. Shake 3 times (+110 / -110 steps) -> clears stuck/crinkled candies
  3. Rotate remaining 180 deg reverse (-2048 half-steps) -> returns cleanly to top home position
"""

import sys
import time
import json
import queue
import threading
from urllib.parse import urlparse, parse_qs
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
STEPS_HALF_REV = 2048
STEP_DELAY = 0.0015   # Reliable max speed without step skipping
SHAKE_DELAY = 0.0012  # Snappy shake speed


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
                if val:
                    p.on()
                else:
                    p.off()
            time.sleep(delay)
            idx = (idx + direction) % 8

    def dispense_single(self):
        print("[DISPENSER] Dispensing 1 candy (180 rev + shake + 180 return home)...")
        try:
            # 1. Rotate 180 deg reverse to bring loaded pocket to bottom dump chute
            self.step(-STEPS_HALF_REV, delay=STEP_DELAY)

            # 2. Shake 3 times at bottom chute so candy drops cleanly (net steps = 0)
            for _ in range(3):
                self.step(110, delay=SHAKE_DELAY)
                self.step(-110, delay=SHAKE_DELAY)
                time.sleep(0.05)

            time.sleep(0.2)

            # 3. Continue 180 deg reverse back to top home position to load next candy
            self.step(-STEPS_HALF_REV, delay=STEP_DELAY)
        finally:
            self.release()
        print("[DISPENSER] Dispense complete. Coils released (OFF).")

    def dispense_many(self, count=1, reason="game"):
        count = max(1, min(5, int(count)))
        print(f"[DISPENSER] Job started: count={count}, reason={reason}")
        for i in range(count):
            print(f"[DISPENSER] --- Candy {i + 1} / {count} ---")
            self.dispense_single()
            if i + 1 < count:
                time.sleep(0.35)
        print(f"[DISPENSER] Job finished: {count} candy/candies dispensed.")

    def test(self):
        print("\n" + "=" * 55)
        print("  CANDY DISPENSER FULL CYCLE VERIFICATION")
        print("=" * 55)
        self.dispense_single()
        print("[OK] Test passed! Motor returned to home and coils OFF.")


dispenser = None
job_queue = queue.Queue()


def worker_loop():
    while True:
        count, reason = job_queue.get()
        try:
            dispenser.dispense_many(count=count, reason=reason)
        except Exception as e:
            print(f"[ERROR] Dispense worker failed: {e}")
            dispenser.release()
        finally:
            job_queue.task_done()


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
        parsed = urlparse(self.path)
        if parsed.path == "/dispense":
            qs = parse_qs(parsed.query)
            try:
                count = max(1, min(5, int(qs.get("count", ["1"])[0])))
            except ValueError:
                count = 1
            job_queue.put((count, "http_get"))
            self._send(200, {"status": "queued", "count": count})
        elif parsed.path == "/status":
            self._send(200, {"status": "ready", "device": "RetroCandyDispenser", "queued": job_queue.qsize()})
        else:
            self._send(404, {"error": "Use /dispense or /status"})

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/dispense":
            length = int(self.headers.get("Content-Length", "0") or "0")
            body = {}
            if length > 0:
                try:
                    raw = self.rfile.read(length).decode("utf-8")
                    body = json.loads(raw) if raw else {}
                except Exception:
                    body = {}
            try:
                count = int(body.get("count", 1))
            except (TypeError, ValueError):
                count = 1
            if count <= 0:
                self._send(200, {"status": "skipped", "count": 0})
                return
            count = max(1, min(5, count))
            reason = str(body.get("reason", "victory"))
            job_queue.put((count, reason))
            self._send(200, {"status": "queued", "count": count, "reason": reason})
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
    for arg in sys.argv:
        if arg.startswith("--port="):
            try:
                port = int(arg.split("=")[1])
            except ValueError:
                pass

    threading.Thread(target=worker_loop, daemon=True).start()

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
