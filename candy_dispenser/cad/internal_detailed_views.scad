// ==============================================================================
// CANDY DISPENSER - DETAILED INTERNAL STRUCTURE VIEWS
// ==============================================================================
// Slices and sections the retro candy dispenser to reveal exact internal mechanisms:
// 1. "candy_path": Cross-section through the candy feeding path (Hopper -> Drum -> Chute -> Tray)
// 2. "electronics": Interior view of the electronics bay (Motor, Pi 5, ULN2003, Wiring)
// 3. "front_cross_section": Slices the machine in half to show food vs electronics side-by-side
// ==============================================================================

include <config.scad>;
use <assembly_preview.scad>;

view_mode = "candy_path"; // "candy_path", "electronics", "front_cross_section", "translucent"

module candy_path_section() {
    // Shows the candy feeding journey: Hopper -> 21mm Throat -> Drum V-Pocket -> 45 deg Chute -> Base Tray
    difference() {
        full_dispenser_assembly();

        // Remove electronics bay (X > 68) to focus strictly on candy path
        translate([divider_x + 0.1, -10, -10])
            cube([machine_wid, machine_depth + 20, 300]);

        // Cut away the front-left outer wall (Y < 65) to reveal drum pocket and chute interior!
        translate([-10, -10, -10])
            cube([divider_x + 10, 75, 300]);
    }
}

module electronics_section() {
    // Shows the electronics bay: 28BYJ-48 motor on divider, Pi 5 standoffs, ULN2003, rear I/O
    difference() {
        full_dispenser_assembly();

        // Remove candy path (X < 68)
        translate([-10, -10, -10])
            cube([divider_x + 10, machine_depth + 20, 300]);

        // Cut away right outer wall and front wall (X > 100, Y < 80) to expose Pi 5 & driver
        translate([85, -10, -10])
            cube([80, 85, 300]);
            
        // Cut away top hopper right roof
        translate([divider_x, -10, base_height + mid_height])
            cube([machine_wid, machine_depth + 20, 150]);
    }
}

module front_cross_section() {
    // Slices front half (Y < 70) completely, exposing BOTH food bay and electronics bay side-by-side!
    difference() {
        full_dispenser_assembly();

        translate([-10, -10, -10])
            cube([machine_wid + 20, 80, 300]);
    }
}

if (view_mode == "candy_path") {
    candy_path_section();
} else if (view_mode == "electronics") {
    electronics_section();
} else if (view_mode == "front_cross_section") {
    front_cross_section();
} else {
    full_dispenser_assembly();
}
