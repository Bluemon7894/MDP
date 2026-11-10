// ==============================================================================
// CANDY DISPENSER - TOP LID (REMOVABLE REFILL COVER)
// ==============================================================================
// Dust cover and refill access for the candy hopper.
// Features retro stepped crown styling and recessed finger handle.
// Nests cleanly into the top hopper rim with 0.4mm slip clearance.
// Prints flat on print bed with zero support material required.
// ==============================================================================

include <config.scad>;

module top_lid() {
    lid_w = machine_wid - 12 - 2 * tol;     // Fits inside hopper recess
    lid_d = machine_depth - 16 - 2 * tol;
    lid_t = 3.0; // Plate thickness
    lip_h = 4.0; // Insert rim depth

    union() {
        // Main top plate with vintage stepped bevel
        hull() {
            translate([4, 4, 0]) cylinder(r = 4, h = lid_t);
            translate([lid_w - 4, 4, 0]) cylinder(r = 4, h = lid_t);
            translate([lid_w - 4, lid_d - 4, 0]) cylinder(r = 4, h = lid_t);
            translate([4, lid_d - 4, 0]) cylinder(r = 4, h = lid_t);
        }

        // Stepped decorative top dome
        translate([8, 8, lid_t]) {
            hull() {
                translate([4, 4, 0]) cylinder(r = 4, h = 3);
                translate([lid_w - 24, 4, 0]) cylinder(r = 4, h = 3);
                translate([lid_w - 24, lid_d - 24, 0]) cylinder(r = 4, h = 3);
                translate([4, lid_d - 24, 0]) cylinder(r = 4, h = 3);
            }
        }

        // Retro handle / grip knob on top
        translate([lid_w / 2 - 20, lid_d / 2 - 6, lid_t + 3]) {
            hull() {
                cylinder(r = 4, h = 8);
                translate([40, 0, 0]) cylinder(r = 4, h = 8);
            }
        }

        // Downward insert rim (guides lid into hopper opening)
        translate([3.0, 3.0, -lip_h]) {
            difference() {
                hull() {
                    translate([3, 3, 0]) cylinder(r = 3, h = lip_h);
                    translate([lid_w - 9, 3, 0]) cylinder(r = 3, h = lip_h);
                    translate([lid_w - 9, lid_d - 9, 0]) cylinder(r = 3, h = lip_h);
                    translate([3, lid_d - 9, 0]) cylinder(r = 3, h = lip_h);
                }
                // Hollow center of insert rim
                translate([2.5, 2.5, -0.5])
                    cube([lid_w - 11, lid_d - 11, lip_h + 1.0]);
            }
        }
    }
}

// Standalone render
top_lid();
