// ==============================================================================
// CANDY DISPENSER - DRUM BEARING CAP (LEFT WALL ACCESS & PIVOT BEARING)
// ==============================================================================
// Solves the physical assembly constraint: allows 66mm rotating drum to slide
// into mid_housing from the left side, then seals and secures the 12mm pivot boss.
// Fastened by 2x 20-Series M4 bolts into mid_housing left wall.
// Allows instant 10-second drum removal for cleaning & maintenance!
// ==============================================================================

include <config.scad>;

module drum_bearing_cap() {
    cap_thick   = 3.5;  // Main flange thickness
    boss_thick  = 2.2;  // Centering shoulder thickness
    boss_dia    = 72.4; // Fits into mid_housing 73.0mm opening with 0.3mm radial clearance
    pivot_hole  = 12.8; // Slip-fit for 12.0mm drum pivot boss
    ear_span    = 90.0; // Distance between M4 bolt centers (45mm each side)

    difference() {
        union() {
            // 1. Retro Flange Body with two M4 mounting ears
            hull() {
                // Center circular flange
                cylinder(d = 80.5, h = cap_thick);
                // Front M4 ear
                translate([-ear_span / 2, 0, 0])
                    cylinder(d = 16.0, h = cap_thick);
                // Rear M4 ear
                translate([ear_span / 2, 0, 0])
                    cylinder(d = 16.0, h = cap_thick);
            }

            // 2. Centering Shoulder Boss (Plugs into mid_housing 73mm opening)
            translate([0, 0, cap_thick])
                cylinder(d = boss_dia, h = boss_thick);

            // Retro decorative ring on outside face
            translate([0, 0, -0.8])
                difference() {
                    cylinder(d = 48.0, h = 0.8);
                    translate([0, 0, -0.1]) cylinder(d = 40.0, h = 1.0);
                }
        }

        // 3. Central Pivot Bearing Socket (Blind hole receiving drum left 12mm boss)
        // Extends through boss and into flange (total depth 5.2mm)
        translate([0, 0, 0.8])
            cylinder(d = pivot_hole, h = cap_thick + boss_thick + 1.0);

        // Entry chamfer for smooth drum pivot insertion
        translate([0, 0, cap_thick + boss_thick - 0.8])
            cylinder(d1 = pivot_hole, d2 = pivot_hole + 2.0, h = 1.0);

        // 4. 2x M4 Bolt Clearance Holes with Counterbores (Front and Rear ears)
        for (dx = [-ear_span / 2, ear_span / 2]) {
            // M4 clearance hole (4.5mm)
            translate([dx, 0, -1])
                cylinder(d = m4_clearance_dia, h = cap_thick + boss_thick + 3);
            // M4 button/socket head counterbore (8.5mm dia, 2.2mm depth)
            translate([dx, 0, -1])
                cylinder(d = m4_head_dia, h = 3.2);
        }
    }
}

// Standalone render
drum_bearing_cap();
