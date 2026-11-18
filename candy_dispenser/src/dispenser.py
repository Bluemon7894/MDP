#!/usr/bin/env python3
"""
dispenser.py - 라즈베리 파이 5용 사탕 디스펜서 모터 제어 (28BYJ-48 + ULN2003).
움직인 뒤에는 코일 전원을 끄고, 사탕이 걸리면 앞뒤로 흔들어 뺀다.
"""

import sys
import time
import argparse
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CandyDispenser")

# ==============================================================================
# PIN ASSIGNMENTS (BCM GPIO Numbers for Raspberry Pi 5)
# ==============================================================================
# 핀 순서 [17, 27, 18, 22]: 가운데 두 핀을 바꿔 28BYJ-48 코일 순서에 맞춘다
DEFAULT_PIN_IN1 = 17  # Pi 5 Pin 11 -> ULN2003 IN1
DEFAULT_PIN_IN2 = 27  # Pi 5 Pin 13 -> ULN2003 IN3
DEFAULT_PIN_IN3 = 18  # Pi 5 Pin 12 -> ULN2003 IN2
DEFAULT_PIN_IN4 = 22  # Pi 5 Pin 15 -> ULN2003 IN4

# ==============================================================================
# 28BYJ-48 STEPPING CONSTANTS
# ==============================================================================
# 8-step half-stepping sequence provides maximum torque and smooth motion
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

# Total half-steps for 1 full 360-degree rotation of 28BYJ-48 output shaft
# (Internal motor 64 steps * 64 gear reduction = 4096 half-steps/rev)
STEPS_PER_REV = 4096
STEPS_HALF_REV = 2048
DEFAULT_STEP_DELAY = 0.0015  # 하프스텝당 1.5ms (이보다 빠르면 스텝이 빠질 수 있음)
SHAKE_STEP_DELAY = 0.0012    # 흔들기는 조금 더 빠르게

class CandyDispenser:
    """Controls single candy dispensing operations with safety power-down."""

    def __init__(self, in1=DEFAULT_PIN_IN1, in2=DEFAULT_PIN_IN2,
                 in3=DEFAULT_PIN_IN3, in4=DEFAULT_PIN_IN4,
                 step_delay=DEFAULT_STEP_DELAY, mock=False):
        self.pins = [in1, in2, in3, in4]
        self.step_delay = step_delay
        self.mock = mock
        self.gpio_outputs = []

        if not self.mock:
            try:
                # gpiozero is the official recommended GPIO library on Pi 5 (Bookworm)
                from gpiozero import OutputDevice
                self.gpio_outputs = [OutputDevice(pin) for pin in self.pins]
                logger.info(f"Initialized gpiozero with pins: IN1={in1}, IN2={in2}, IN3={in3}, IN4={in4}")
            except (ImportError, Exception) as e:
                logger.warning(f"Failed to initialize real hardware ({e}). Falling back to simulation mode.")
                self.mock = True

        if self.mock:
            logger.info(f"[SIMULATION] Mock dispenser active on virtual pins: {self.pins}")

        # Ensure coils start de-energized
        self.release_coils()

    def _set_pins(self, states):
        """Applies states [A, B, C, D] to the 4 driver pins."""
        if not self.mock:
            for out, val in zip(self.gpio_outputs, states):
                if val:
                    out.on()
                else:
                    out.off()

    def release_coils(self):
        """코일 4개를 모두 끈다 (계속 켜 두면 모터가 뜨거워진다)."""
        self._set_pins([0, 0, 0, 0])
        if self.mock:
            logger.debug("[SIMULATION] Coils released (0, 0, 0, 0) - Motor cool.")

    def step_motor(self, steps, direction=1, delay=None, release=True):
        """
        Rotates the motor by a given number of half-steps.
        direction: 1 for clockwise (forward), -1 for counter-clockwise (reverse).
        """
        seq_len = len(HALF_STEP_SEQ)
        step_idx = 0 if direction == 1 else seq_len - 1
        step_delay = self.step_delay if delay is None else delay

        for i in range(abs(steps)):
            state = HALF_STEP_SEQ[step_idx]
            self._set_pins(state)
            time.sleep(step_delay)
            step_idx = (step_idx + direction) % seq_len

        if release:
            # Always de-energize coils immediately after movement completes!
            self.release_coils()

    def dispense_single(self, steps_per_dispense=STEPS_PER_REV):
        """
        Dispenses exactly 1 candy:
          1. Rotate 180 deg reverse (-2048 steps) to dump chute
          2. Shake 3 times (+110 / -110 steps) so candy drops cleanly
          3. Continue 180 deg reverse (-2048 steps) back to top home position
        """
        logger.info("Starting single dispense cycle (180 rev + shake + 180 return)...")
        t_start = time.time()

        try:
            self.step_motor(STEPS_HALF_REV, direction=-1, delay=self.step_delay, release=False)
            for _ in range(3):
                self.step_motor(110, direction=1, delay=SHAKE_STEP_DELAY, release=False)
                self.step_motor(110, direction=-1, delay=SHAKE_STEP_DELAY, release=False)
                time.sleep(0.05)
            time.sleep(0.2)
            self.step_motor(STEPS_HALF_REV, direction=-1, delay=self.step_delay, release=False)
        finally:
            self.release_coils()

        elapsed = time.time() - t_start
        logger.info(f"Dispense complete in {elapsed:.2f}s. Coils de-energized.")
        return True

    def dispense_many(self, count=1):
        count = max(1, min(5, int(count)))
        for i in range(count):
            logger.info(f"Dispensing candy {i + 1}/{count}...")
            self.dispense_single()
            if i + 1 < count:
                time.sleep(0.35)
        return True

    def anti_jam_wiggle(self, angle_degrees=20):
        """
        Oscillates drum back and forth slightly to clear crinkled wrapper jams.
        """
        wiggle_steps = int((angle_degrees / 360.0) * STEPS_PER_REV)
        logger.warning(f"Executing anti-jam wiggle ({angle_degrees} deg, {wiggle_steps} steps)...")
        
        # Reverse slightly
        self.step_motor(wiggle_steps, direction=-1)
        time.sleep(0.1)
        # Advance forward slightly past original point
        self.step_motor(int(wiggle_steps * 1.5), direction=1)
        self.release_coils()
        logger.info("Anti-jam routine completed.")

    def cleanup(self):
        """Safely de-energizes pins and closes GPIO resources."""
        self.release_coils()
        if not self.mock and self.gpio_outputs:
            for out in self.gpio_outputs:
                out.close()
        logger.info("GPIO resources cleaned up.")


def main():
    parser = argparse.ArgumentParser(description="Retro Candy Dispenser Controller")
    parser.add_argument("--dispense", action="store_true", help="Dispense 1 candy")
    parser.add_argument("--steps", type=int, default=0, help="Rotate specific number of half-steps")
    parser.add_argument("--angle", type=float, default=0.0, help="Rotate specific angle in degrees")
    parser.add_argument("--wiggle", action="store_true", help="Perform anti-jam oscillation")
    parser.add_argument("--release", action="store_true", help="Immediately de-energize all coils")
    parser.add_argument("--mock", action="store_true", help="Run in mock/simulation mode without Pi GPIO")
    parser.add_argument("--delay", type=float, default=DEFAULT_STEP_DELAY, help="Step delay in seconds")

    args = parser.parse_args()

    dispenser = CandyDispenser(step_delay=args.delay, mock=args.mock)

    try:
        if args.dispense:
            dispenser.dispense_single()
        elif args.wiggle:
            dispenser.anti_jam_wiggle()
        elif args.angle > 0:
            steps = int((args.angle / 360.0) * STEPS_PER_REV)
            logger.info(f"Rotating {args.angle} degrees ({steps} half-steps)...")
            dispenser.step_motor(steps)
        elif args.steps != 0:
            dir = 1 if args.steps > 0 else -1
            logger.info(f"Rotating {args.steps} steps...")
            dispenser.step_motor(abs(args.steps), direction=dir)
        elif args.release:
            dispenser.release_coils()
            logger.info("Coils released.")
        else:
            parser.print_help()
    finally:
        dispenser.cleanup()

if __name__ == "__main__":
    main()
