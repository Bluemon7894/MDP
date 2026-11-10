// ==============================================================================
// CANDY DISPENSER - COMPLETE 3D ASSEMBLY PREVIEW & EXPLODED VIEW
// ==============================================================================
// Visualizes the complete retro vending machine assembly with all 6 printed
// components plus simulated Raspberry Pi 5, 28BYJ-48 motor, ULN2003 PCB & candy.
// ==============================================================================

include <config.scad>;
use <base_chassis.scad>;
use <mid_housing.scad>;
use <drum_dispenser.scad>;
use <top_hopper.scad>;
use <top_lid.scad>;
use <service_panel.scad>;

explode_z = 0; // Default 0 for assembled view; overridden by -D explode_z=45

module dummy_candy() {
    color([0.95, 0.2, 0.2, 0.9]) {
        // Candy body
        cube([candy_length - 8, candy_width - 4, candy_thickness], center = true);
        // Crimped wrapper ends
        translate([(candy_length - 8)/2 + 2, 0, 0])
            cube([4, candy_width, 1.0], center = true);
        translate([-(candy_length - 8)/2 - 2, 0, 0])
            cube([4, candy_width, 1.0], center = true);
    }
}

module dummy_stepper_motor() {
    // 28BYJ-48 Stepper Motor
    color([0.2, 0.5, 0.8]) {
        // Cylindrical motor body
        cylinder(d = motor_body_dia, h = motor_body_depth, center = true);
        // Mounting ears
        translate([0, 0, motor_body_depth / 2 - 1])
            cube([motor_ears_spacing + 7, 7, 1.5], center = true);
    }
    // Brass D-shaft
    color([0.85, 0.75, 0.2]) {
        translate([0, motor_eccentric_dist, motor_body_depth / 2])
            cylinder(d = motor_shaft_dia_actual, h = motor_shaft_len);
    }
}

module dummy_pi5() {
    // Raspberry Pi 5 Board
    color([0.1, 0.55, 0.2]) {
        cube([pi_wid, pi_len, pi_pcb_thick]);
    }
    // Silver USB & Ethernet Shield Cans
    color([0.8, 0.8, 0.85]) {
        translate([8, pi_len - 18, pi_pcb_thick])
            cube([16, 21, 14]); // Ethernet
        translate([27, pi_len - 15, pi_pcb_thick])
            cube([14, 17, 16]); // Dual USB 3
        translate([43, pi_len - 15, pi_pcb_thick])
            cube([14, 17, 16]); // Dual USB 2
    }
}

module dummy_uln2003() {
    // ULN2003 PCB
    color([0.15, 0.35, 0.7]) {
        cube([uln_pcb_len, uln_pcb_wid, 1.6]);
    }
    // Stepper connector & IC
    color([0.9, 0.9, 0.9]) {
        translate([12, 10, 1.6]) cube([15, 8, 8]);
    }
}

module full_dispenser_assembly(translucent = false) {
    shell_alpha = translucent ? 0.35 : 1.0;

    // 1. Base Chassis (Mint Green)
    color([0.3, 0.65, 0.65, shell_alpha])
        base_chassis();

    // Electronics components seated inside base
    // Raspberry Pi 5 (flush against right and rear outer walls for direct cable access)
    translate([90.0, 46.0, floor_thick + pi_standoff_h + (explode_z > 0 ? 12 : 0)])
        dummy_pi5();

    // ULN2003 Driver Board (located conveniently in front of Pi GPIO)
    translate([divider_x + 5.0, 10.0, floor_thick + uln_standoff_h + (explode_z > 0 ? 12 : 0)])
        dummy_uln2003();

    // 2. Mid Housing (Cream / Retro Ivory) - lifts vertically
    translate([0, 0, base_height + explode_z]) {
        color([0.96, 0.92, 0.82, shell_alpha])
            mid_housing();

        // Rotating Metering Drum - pulls out to the LEFT (-X) in exploded view
        translate([10.0 - (explode_z > 0 ? 55 : 0), 70.0, 52.0])
            rotate([0, 90, 0])
                color([1.0, 1.0, 1.0, 0.95])
                    drum_dispenser();

        // 28BYJ-48 Motor - pulls out to the RIGHT (+X) in exploded view
        translate([divider_x + 2.0 + (explode_z > 0 ? 45 : 0), 70.0 - motor_eccentric_dist, 52.0 - 8.0])
            rotate([0, 90, 0])
                dummy_stepper_motor();

        // Sample Candy in Drum Pocket
        translate([10.0 + drum_len / 2 - (explode_z > 0 ? 55 : 0), 70.0, 52.0 + drum_dia / 2 - candy_pocket_depth / 2 + (explode_z > 0 ? 18 : 0)])
            dummy_candy();

        // Rear Service Panel - pulls out to the REAR (+Y) in exploded view
        translate([divider_x + wall_thick + 4, machine_depth + (explode_z > 0 ? 40 : 0), 8])
            rotate([90, 0, 0])
                color([0.2, 0.2, 0.22, shell_alpha])
                    service_panel();
    }

    // 3. Top Hopper (Cardinal Red / Retro Coral) - lifts vertically
    translate([0, 0, base_height + mid_height + 2 * explode_z]) {
        color([0.85, 0.28, 0.25, shell_alpha])
            top_hopper();

        // Sample Candies inside Hopper showing flow along the new 46.7° sloped chute
        if (explode_z == 0) {
            // Candy sliding down right chute
            translate([96.0, 70.0, 42.0])
                rotate([0, -45, 0])
                    dummy_candy();

            // Candy queued at throat entry
            translate([32.0, 70.0, 14.0])
                dummy_candy();
        }

        // 4. Top Lid (Retro Chrome / Silver) - lifts above hopper
        translate([6 + tol, 8 + tol, hopper_height - 4 + explode_z])
            color([0.88, 0.88, 0.90, shell_alpha])
                top_lid();
    }

    // Sample Dispensed Candy in Front Collection Tray
    if (explode_z == 0) {
        translate([32.0, 22.0, 10.0])
            rotate([12, 0, 0])
                dummy_candy();
    }
}

// Render complete assembly
full_dispenser_assembly();
