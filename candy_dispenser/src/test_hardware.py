#!/usr/bin/env python3
"""
test_hardware.py - Interactive Hardware Diagnostic & Calibration Tool for Pi 5.
Verifies ULN2003 wiring sequence, LED indicators, rotation angles, and coil shutoff.
"""

import sys
import time
from dispenser import CandyDispenser, STEPS_PER_REV

def print_menu():
    print("\n" + "=" * 55)
    print("  RETRO CANDY DISPENSER - HARDWARE DIAGNOSTICS")
    print("=" * 55)
    print(" [1] Individual Coil Test (Lights A -> B -> C -> D LEDs)")
    print(" [2] Quarter Turn (90 deg / 1024 steps)")
    print(" [3] Half Turn (180 deg / 2048 steps)")
    print(" [4] Full Revolution (360 deg / 4096 steps)")
    print(" [5] Anti-Jam Wiggle Routine (Clears crimped wrappers)")
    print(" [6] Continuous Slow Rotation (Drum alignment check)")
    print(" [7] Immediate Coil Power-Down (Emergency release)")
    print(" [0] Exit Diagnostics")
    print("=" * 55)

def run_coil_test(dispenser):
    print("\n[TEST 1] Testing individual coil phases...")
    print("Watch the 4 red LEDs on the ULN2003 driver board:")
    names = ["A (IN1/GPIO17)", "B (IN2/GPIO18)", "C (IN3/GPIO27)", "D (IN4/GPIO22)"]
    
    for cycle in range(3):
        print(f"  Cycle {cycle + 1}/3:")
        for idx in range(4):
            pattern = [0, 0, 0, 0]
            pattern[idx] = 1
            print(f"    Energizing Phase {names[idx]}...")
            dispenser._set_pins(pattern)
            time.sleep(0.4)
            
    dispenser.release_coils()
    print("  [OK] Coil test finished. All coils released.")

def main():
    mock_mode = "--mock" in sys.argv
    dispenser = CandyDispenser(mock=mock_mode)

    try:
        while True:
            print_menu()
            choice = input("Select diagnostic routine (0-7): ").strip()

            if choice == "1":
                run_coil_test(dispenser)
            elif choice == "2":
                print("\n[TEST 2] Rotating 90 degrees (1024 half-steps)...")
                dispenser.step_motor(1024)
                print("  [OK] Done. Coils off.")
            elif choice == "3":
                print("\n[TEST 3] Rotating 180 degrees (2048 half-steps)...")
                dispenser.step_motor(2048)
                print("  [OK] Done. Coils off.")
            elif choice == "4":
                print("\n[TEST 4] Rotating 360 degrees (4096 half-steps)...")
                dispenser.dispense_single()
                print("  [OK] Done. Coils off.")
            elif choice == "5":
                print("\n[TEST 5] Executing anti-jam wiggle...")
                dispenser.anti_jam_wiggle()
                print("  [OK] Done. Coils off.")
            elif choice == "6":
                print("\n[TEST 6] Continuous rotation. Press Ctrl+C to stop.")
                try:
                    while True:
                        dispenser.step_motor(512)
                except KeyboardInterrupt:
                    dispenser.release_coils()
                    print("\n  [STOPPED] Coils released immediately.")
            elif choice == "7":
                dispenser.release_coils()
                print("\n  [OK] Coils de-energized immediately.")
            elif choice == "0":
                print("\nExiting diagnostics.")
                break
            else:
                print("Invalid choice, please enter 0 through 7.")
    finally:
        dispenser.cleanup()

if __name__ == "__main__":
    main()
