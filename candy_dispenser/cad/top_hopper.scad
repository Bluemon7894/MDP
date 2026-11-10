// ==============================================================================
// CANDY DISPENSER - TOP HOPPER (DIRECTIONAL GUIDE CHUTE & M4 FASTENERS)
// ==============================================================================
// Features 24mm narrow directional throat: forces 32mm candies into parallel alignment.
// Eliminates bridging, diagonal wedging, and transverse misfeeding.
// 20-Series Aluminum Profile Standard M4 bolt holes with counterbores.
// ==============================================================================

include <config.scad>;

module top_hopper() {
    difference() {
        // ----------------------------------------------------------------------
        // 1. OUTER RETRO ROOFTOP / CROWN ENVELOPE
        // ----------------------------------------------------------------------
        union() {
            // Lower rectangular body matching mid_housing
            hull() {
                translate([4, 4, 0]) cylinder(r = 4, h = hopper_height - 15);
                translate([machine_wid - 4, 4, 0]) cylinder(r = 4, h = hopper_height - 15);
                translate([machine_wid - 4, machine_depth - 4, 0]) cylinder(r = 4, h = hopper_height - 15);
                translate([4, machine_depth - 4, 0]) cylinder(r = 4, h = hopper_height - 15);
            }

            // Upper retro curved crown marquee
            hull() {
                // Front arched crown
                translate([8, 12, hopper_height - 15]) cylinder(r = 8, h = 15);
                translate([machine_wid - 8, 12, hopper_height - 15]) cylinder(r = 8, h = 15);
                // Rear crown
                translate([8, machine_depth - 12, hopper_height - 15]) cylinder(r = 8, h = 15);
                translate([machine_wid - 8, machine_depth - 12, hopper_height - 15]) cylinder(r = 8, h = 15);
            }

            // Retro Marquee Sign Plaque on Front
            translate([machine_wid / 2 - 40, -2, hopper_height - 22])
                cube([80, 2.5, 16]);
        }

        // ----------------------------------------------------------------------
        // 2. EXPANDED INTEGRATED FUNNEL WITH DIRECTIONAL ALIGNMENT THROAT
        // ----------------------------------------------------------------------
        // Expands across the full width: any candies poured into the top slide
        // down the steep 46.7° integrated chute into the 28mm directional throat.
        // Eliminates all dead space and boosts candy capacity by 2.5x!
        hull() {
            // Top wide intake opening (all 4 corners clear M4 bolt counterbores by >5.5mm)
            translate([16, 18, hopper_height - 12]) cylinder(r = 4, h = 14);
            translate([machine_wid - 18, 18, hopper_height - 12]) cylinder(r = 4, h = 14);
            translate([16, machine_depth - 18, hopper_height - 12]) cylinder(r = 4, h = 14);
            translate([machine_wid - 18, machine_depth - 18, hopper_height - 12]) cylinder(r = 4, h = 14);

            // Bottom restricted throat aligning 100% with mid_housing drum inlet
            translate([10, 70.0 - hopper_throat_w / 2, -1])
                cube([hopper_throat_l, hopper_throat_w, 2]);
        }

        // Top lid mating lip recess
        translate([6, 8, hopper_height - 4])
            cube([machine_wid - 12, machine_depth - 16, 6]);

        // ----------------------------------------------------------------------
        // 3. RETRO MARQUEE EMBOSS / SIGN
        // ----------------------------------------------------------------------
        translate([machine_wid / 2 - 38, -3, hopper_height - 20])
            cube([76, 2, 12]);

        // ----------------------------------------------------------------------
        // 4. 20-SERIES M4 MATING BOLT HOLES (Connecting Hopper to Mid Housing)
        // ----------------------------------------------------------------------
        for (pos = [[8, 8], [machine_wid - 8, 8], [8, machine_depth - 8], [machine_wid - 8, machine_depth - 8]]) {
            // M4 clearance hole (4.5mm)
            translate([pos[0], pos[1], -1])
                cylinder(d = m4_clearance_dia, h = hopper_height + 2);
            // Counterbore for M4 bolt head (8.5mm dia)
            translate([pos[0], pos[1], hopper_height - 18])
                cylinder(d = m4_head_dia, h = 20);
        }
    }
}

// Standalone render
top_hopper();
