// ==============================================================================
// CANDY DISPENSER - MID HOUSING (DRUM CHAMBER, DIRECTIONAL INLET & M4 BOLTS)
// ==============================================================================
// Features 24mm directional inlet matching hopper throat for 100% candy alignment.
// Complete food/electronics physical isolation wall.
// 20-Series M4 clearance holes for corner columns & service panel.
// ==============================================================================

include <config.scad>;

drum_center_y = 70.0;
drum_center_z = 52.0;
drum_chamber_r = drum_dia / 2 + drum_wall_gap;

module mid_housing() {
    difference() {
        // ----------------------------------------------------------------------
        // 1. OUTER RETRO HOUSING ENVELOPE
        // ----------------------------------------------------------------------
        union() {
            hull() {
                translate([4, 4, 0]) cylinder(r = 4, h = mid_height);
                translate([machine_wid - 4, 4, 0]) cylinder(r = 4, h = mid_height);
                translate([machine_wid - 4, machine_depth - 4, 0]) cylinder(r = 4, h = mid_height);
                translate([4, machine_depth - 4, 0]) cylinder(r = 4, h = mid_height);
            }

            // Retro Front Styling ribs
            for (rz = [20:10:70]) {
                translate([divider_x + 6, -1.5, rz])
                    cube([machine_wid - divider_x - 14, 2, 4]);
            }

            // Retro Coin Slot Bezel
            translate([divider_x + 15, -2, 75]) {
                cube([30, 2.5, 12]);
            }
        }

        // ----------------------------------------------------------------------
        // 2. CANDY ZONE HOLLOWING (Left Bay)
        // ----------------------------------------------------------------------
        // Drum cylinder cavity
        translate([3.5, drum_center_y, drum_center_z])
            rotate([0, 90, 0])
                cylinder(r = drum_chamber_r, h = divider_x - 3.5);

        // Top directional inlet opening (24mm wide matching hopper throat)
        translate([10.0, drum_center_y - hopper_throat_w / 2, drum_center_z])
            cube([hopper_throat_l, hopper_throat_w, mid_height - drum_center_z + 1]);

        // Bottom candy drop chute (slopes forward and down toward front tray)
        hull() {
            // Under drum opening
            translate([8.0, drum_center_y - 14, drum_center_z - drum_chamber_r])
                cube([drum_len - 4, 28, 2]);

            // Exit chute opening at bottom front
            translate([8.0, 15, -1])
                cube([drum_len - 4, 45, 2]);
        }

        // Left wall pivot bearing socket for drum left boss
        translate([-1, drum_center_y, drum_center_z])
            rotate([0, 90, 0])
                cylinder(d = 12.8, h = 6.0);

        // Front Retro Display Window cutout
        translate([12, -2, 35])
            cube([42, 8, 48]);

        // Window Bezel Recess
        translate([10, 1.5, 33])
            cube([46, 1.8, 52]);

        // ----------------------------------------------------------------------
        // 3. DIVIDER WALL PASS-THROUGH & MOTOR MOUNT
        // ----------------------------------------------------------------------
        // Drum shaft collar pass-through
        translate([divider_x - 1, drum_center_y, drum_center_z])
            rotate([0, 90, 0])
                cylinder(d = 17.5, h = wall_thick + 2);

        // 28BYJ-48 Stepper Motor Mount on Electronics side of divider
        // Ear holes sized 4.2mm (fits M4 or M3 bolts)
        // 28BYJ-48 ears sit on the BODY center line, which is motor_eccentric_dist (8mm)
        // below the shaft, so the holes go 8mm under the drum axis (same as the body pocket below)
        translate([divider_x - 1, drum_center_y - 17.5, drum_center_z - motor_eccentric_dist])
            rotate([0, 90, 0])
                cylinder(d = motor_ear_hole_dia, h = wall_thick + 2);

        translate([divider_x - 1, drum_center_y + 17.5, drum_center_z - motor_eccentric_dist])
            rotate([0, 90, 0])
                cylinder(d = motor_ear_hole_dia, h = wall_thick + 2);

        // Motor body clearance pocket
        translate([divider_x + 1.2, drum_center_y, drum_center_z - motor_eccentric_dist])
            rotate([0, 90, 0])
                cylinder(d = 29.5, h = 5);

        // ----------------------------------------------------------------------
        // 4. ELECTRONICS ZONE HOLLOWING (Right Bay)
        // ----------------------------------------------------------------------
        translate([divider_x + wall_thick, wall_thick, -1])
            cube([machine_wid - divider_x - 2 * wall_thick, machine_depth - 2 * wall_thick, mid_height + 2]);

        // Retro Coin Slot cutout
        translate([divider_x + 28, -3, 79])
            cube([4, 6, 18]);

        // Coin Return button recess
        translate([divider_x + 48, -2, 50])
            rotate([-90, 0, 0])
                cylinder(d = 14, h = 4);

        // Rear Service Access Door Opening
        translate([divider_x + wall_thick + 4, machine_depth - wall_thick - 1, 8])
            cube([machine_wid - divider_x - wall_thick - 18, wall_thick + 3, mid_height - 16]);

        // Service Door 20-Series M4 Screw Pilot Holes on Rear Flange (3.8mm tap)
        translate([divider_x + wall_thick + 8, machine_depth - wall_thick - 1, 14])
            rotate([-90, 0, 0]) cylinder(d = m4_tap_dia, h = wall_thick + 3);
        translate([machine_wid - 18, machine_depth - wall_thick - 1, 14])
            rotate([-90, 0, 0]) cylinder(d = m4_tap_dia, h = wall_thick + 3);
        translate([divider_x + wall_thick + 8, machine_depth - wall_thick - 1, mid_height - 14])
            rotate([-90, 0, 0]) cylinder(d = m4_tap_dia, h = wall_thick + 3);
        translate([machine_wid - 18, machine_depth - wall_thick - 1, mid_height - 14])
            rotate([-90, 0, 0]) cylinder(d = m4_tap_dia, h = wall_thick + 3);

        // ----------------------------------------------------------------------
        // 5. 20-SERIES M4 ASSEMBLY MATING SCREW HOLES
        // ----------------------------------------------------------------------
        for (pos = [[8, 8], [machine_wid - 8, 8], [8, machine_depth - 8], [machine_wid - 8, machine_depth - 8]]) {
            translate([pos[0], pos[1], -1])
                cylinder(d = m4_clearance_dia, h = mid_height + 2); // 4.5mm M4 clearance
        }

        // Stepper motor wiring pass-down notch into base chassis
        translate([divider_x + 10, machine_depth - 15, -1])
            cube([25, 12, 10]);
    }
}

// Standalone render
mid_housing();
