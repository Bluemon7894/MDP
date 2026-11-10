#!/usr/bin/env python3
"""
api_server.py - Lightweight HTTP Server for Remote Candy Dispensing.
Allows cat.io web game or mobile browser to trigger candy dispensing via HTTP requests.
Zero extra dependencies (uses Python standard library http.server).
"""

import sys
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from dispenser import CandyDispenser

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DispenserAPI")

dispenser_instance = None

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
        if self.path == "/status":
            self._send_json(200, {
                "device": "Retro Candy Dispenser",
                "status": "ready",
                "motor": "28BYJ-48",
                "driver": "ULN2003",
                "mock_mode": dispenser_instance.mock
            })
        elif self.path == "/dispense":
            logger.info("GET /dispense received.")
            dispenser_instance.dispense_single()
            self._send_json(200, {"status": "dispensed", "count": 1})
        else:
            self._send_json(404, {"error": "Not Found. Use /dispense or /status"})

    def do_POST(self):
        if self.path == "/dispense":
            logger.info("POST /dispense received.")
            dispenser_instance.dispense_single()
            self._send_json(200, {"status": "dispensed", "count": 1})
        elif self.path == "/wiggle":
            logger.info("POST /wiggle received.")
            dispenser_instance.anti_jam_wiggle()
            self._send_json(200, {"status": "wiggled"})
        else:
            self._send_json(404, {"error": "Not Found"})

    def log_message(self, format, *args):
        # Clean logging
        logger.info(f"{self.address_string()} - {format % args}")

def run_server(port=8080, mock=False):
    global dispenser_instance
    dispenser_instance = CandyDispenser(mock=mock)
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
