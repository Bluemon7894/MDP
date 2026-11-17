#!/usr/bin/env python3
"""
api_server.py - Lightweight HTTP Server for Remote Candy Dispensing.
Allows cat.io web game or mobile browser to trigger candy dispensing via HTTP requests.
Zero extra dependencies (uses Python standard library http.server).
"""

import sys
import json
import queue
import threading
import logging
from urllib.parse import urlparse, parse_qs
from http.server import HTTPServer, BaseHTTPRequestHandler
from dispenser import CandyDispenser

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DispenserAPI")

dispenser_instance = None
job_queue = queue.Queue()


def worker_loop():
    while True:
        count, reason = job_queue.get()
        try:
            logger.info(f"Executing dispense job: count={count}, reason={reason}")
            dispenser_instance.dispense_many(count=count)
        except Exception as e:
            logger.error(f"Dispense worker failed: {e}")
            dispenser_instance.release_coils()
        finally:
            job_queue.task_done()


class DispenserHTTPHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode("utf-8"))

    def do_OPTIONS(self):
        self._send_json(200, {"status": "ok"})

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/status":
            self._send_json(200, {
                "device": "Retro Candy Dispenser",
                "status": "ready",
                "motor": "28BYJ-48",
                "driver": "ULN2003",
                "mock_mode": dispenser_instance.mock,
                "queued": job_queue.qsize(),
            })
        elif parsed.path == "/dispense":
            qs = parse_qs(parsed.query)
            try:
                count = max(1, min(5, int(qs.get("count", ["1"])[0])))
            except ValueError:
                count = 1
            logger.info(f"GET /dispense received (count={count}).")
            job_queue.put((count, "http_get"))
            self._send_json(200, {"status": "queued", "count": count})
        else:
            self._send_json(404, {"error": "Not Found. Use /dispense or /status"})

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
                self._send_json(200, {"status": "skipped", "count": 0})
                return
            count = max(1, min(5, count))
            reason = str(body.get("reason", "victory"))
            logger.info(f"POST /dispense received (count={count}, reason={reason}).")
            job_queue.put((count, reason))
            self._send_json(200, {"status": "queued", "count": count, "reason": reason})
        elif parsed.path == "/wiggle":
            logger.info("POST /wiggle received.")
            dispenser_instance.anti_jam_wiggle()
            self._send_json(200, {"status": "wiggled"})
        else:
            self._send_json(404, {"error": "Not Found"})

    def log_message(self, format, *args):
        logger.info(f"{self.address_string()} - {format % args}")


def run_server(port=8080, mock=False):
    global dispenser_instance
    dispenser_instance = CandyDispenser(mock=mock)
    threading.Thread(target=worker_loop, daemon=True).start()
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, DispenserHTTPHandler)
    logger.info(f"Dispenser API Server running at http://0.0.0.0:{port}/")
    logger.info("Endpoints: POST/GET http://<pi-ip>:8080/dispense | GET http://<pi-ip>:8080/status")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down API server...")
    finally:
        dispenser_instance.cleanup()
        httpd.server_close()


if __name__ == "__main__":
    port = 8080
    mock = "--mock" in sys.argv
    for arg in sys.argv:
        if arg.startswith("--port="):
            port = int(arg.split("=")[1])
    run_server(port=port, mock=mock)
