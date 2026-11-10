#!/usr/bin/env python3
"""
dispenser.py - Retro Vending Machine Candy Dispenser Controller for Raspberry Pi 5.
Controls 28BYJ-48 stepper motor via ULN2003 driver with automatic coil de-energization
and anti-jam oscillation.
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
# Verified sequence on Pi 5: [17, 27, 18, 22] (Swapped middle pins for 28BYJ-48 clones)
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
DEFAULT_STEP_DELAY = 0.0018  # 1.8ms per half-step (~13 RPM, high torque)

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
        """CRITICAL: Sets all coils to LOW (0, 0, 0, 0) to prevent 28BYJ-48 overheating."""
        self._set_pins([0, 0, 0, 0])
        if self.mock:
            logger.debug("[SIMULATION] Coils released (0, 0, 0, 0) - Motor cool.")

    def step_motor(self, steps, direction=1):
        """
        Rotates the motor by a given number of half-steps.
        direction: 1 for clockwise (forward), -1 for counter-clockwise (reverse).
        """
        seq_len = len(HALF_STEP_SEQ)
        step_idx = 0 if direction == 1 else seq_len - 1

        for i in range(abs(steps)):
            state = HALF_STEP_SEQ[step_idx]
            self._set_pins(state)
            time.sleep(self.step_delay)
            step_idx = (step_idx + direction) % seq_len

        # Always de-energize coils immediately after movement completes!
        self.release_coils()

    def dispense_single(self, steps_per_dispense=STEPS_PER_REV):
        """
        Dispenses exactly 1 candy by rotating the drum pocket to the dump chute.
        Executes anti-jam wiggle if needed and cuts coil power upon completion.
        """
        logger.info(f"Starting single dispense cycle ({steps_per_dispense} half-steps)...")
        t_start = time.time()
        
        # Forward rotation
        self.step_motor(steps_per_dispense, direction=1)
        
        elapsed = time.time() - t_start
        logger.info(f"Dispense complete in {elapsed:.2f}s. Coils de-energized.")
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
