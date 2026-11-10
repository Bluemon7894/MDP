// ==============================================================================
// CANDY DISPENSER - BASE CHASSIS (FLUSH I/O, 20-SERIES M4 & PROFILE MOUNTS)
// ==============================================================================
// 20-Series M4 corner tap holes (3.8mm pilot for direct M4 self-threading).
// Added bottom 2020 Aluminum Profile M4 mounting slots (for T-nut frame attachment).
// Direct external access ports for Pi 5 USB-C, Dual Micro-HDMI, 4x USB & Ethernet.
// ==============================================================================

include <config.scad>;

module base_chassis() {
    pi_pcb_x_min = 146.0 - 56.0; // 90.0 mm
    pi_pcb_y_min = 131.0 - 85.0; // 46.0 mm

    pi_hole_1_x = pi_pcb_x_min + 3.5;       // 93.5 mm (left front)
    pi_hole_1_y = pi_pcb_y_min + 3.5;       // 49.5 mm
    pi_hole_2_x = pi_hole_1_x + 49.0;       // 142.5 mm (right front)
    pi_hole_2_y = pi_hole_1_y;              // 49.5 mm
    pi_hole_3_x = pi_hole_1_x;              // 93.5 mm (left rear)
    pi_hole_3_y = pi_hole_1_y + 58.0;       // 107.5 mm
    pi_hole_4_x = pi_hole_2_x;              // 142.5 mm (right rear)
    pi_hole_4_y = pi_hole_3_y;              // 107.5 mm

    uln_base_x = divider_x + 5.0; // 73.0 mm
    uln_base_y = 10.0;

    difference() {
        // ----------------------------------------------------------------------
        // 1. OUTER CHASSIS SOLID ENVELOPE (With Standoffs merged in Union)
        // ----------------------------------------------------------------------
        union() {
            // Main rounded rectangular perimeter
            hull() {
                translate([4, 4, 0]) cylinder(r = 4, h = base_height);
                translate([machine_wid - 4, 4, 0]) cylinder(r = 4, h = base_height);
                translate([machine_wid - 4, machine_depth - 4, 0]) cylinder(r = 4, h = base_height);
                translate([4, machine_depth - 4, 0]) cylinder(r = 4, h = base_height);
            }

            // Retro Front Base Foot (overlapping 1mm into hull)
            translate([0, -1.0, 0])
                cube([machine_wid, 3.0, 8.0]);

            // Pi 5 Standoff Bosses (dia 6.5mm, height 5mm)
            translate([pi_hole_1_x, pi_hole_1_y, floor_thick - 0.1])
                cylinder(d = pi_standoff_dia, h = pi_standoff_h + 0.1);
            translate([pi_hole_2_x, pi_hole_2_y, floor_thick - 0.1])
                cylinder(d = pi_standoff_dia, h = pi_standoff_h + 0.1);
            translate([pi_hole_3_x, pi_hole_3_y, floor_thick - 0.1])
                cylinder(d = pi_standoff_dia, h = pi_standoff_h + 0.1);
            translate([pi_hole_4_x, pi_hole_4_y, floor_thick - 0.1])
                cylinder(d = pi_standoff_dia, h = pi_standoff_h + 0.1);

            // ULN2003 Standoff Bosses (dia 6mm, height 4mm)
            translate([uln_base_x, uln_base_y, floor_thick - 0.1])
                cylinder(d = 6.0, h = uln_standoff_h + 0.1);
            translate([uln_base_x + uln_hole_dist_x, uln_base_y, floor_thick - 0.1])
                cylinder(d = 6.0, h = uln_standoff_h + 0.1);
            translate([uln_base_x, uln_base_y + uln_hole_dist_y, floor_thick - 0.1])
                cylinder(d = 6.0, h = uln_standoff_h + 0.1);
            translate([uln_base_x + uln_hole_dist_x, uln_base_y + uln_hole_dist_y, floor_thick - 0.1])
                cylinder(d = 6.0, h = uln_standoff_h + 0.1);
        }

        // ----------------------------------------------------------------------
        // 2. CANDY RETRIEVAL TRAY HOLLOWING (Left Bay)
        // ----------------------------------------------------------------------
        translate([8, 6, floor_thick]) {
            hull() {
                cube([divider_x - 14, 55, 1.0]);
                translate([0, 10, 18.0])
                    cube([divider_x - 14, 45, 1.0]);
            }
        }

        translate([8, 6, 12])
            cube([divider_x - 14, 55, base_height]);

        // Front finger scoop opening
        translate([14, -4, 8]) {
            hull() {
                translate([4, 0, 4]) rotate([-90, 0, 0]) cylinder(r = 4, h = 10);
                translate([divider_x - 22, 0, 4]) rotate([-90, 0, 0]) cylinder(r = 4, h = 10);
                translate([divider_x - 22, 0, 24]) rotate([-90, 0, 0]) cylinder(r = 4, h = 10);
                translate([4, 0, 24]) rotate([-90, 0, 0]) cylinder(r = 4, h = 10);
            }
        }

        // Left rear dead space hollowing
        translate([8, 68, floor_thick])
            cube([divider_x - 14, machine_depth - 76, base_height + 2]);

        // ----------------------------------------------------------------------
        // 3. ELECTRONICS BAY HOLLOWING (Right Bay)
        // ----------------------------------------------------------------------
        translate([divider_x + wall_thick, wall_thick, floor_thick])
            cube([machine_wid - divider_x - 2 * wall_thick, machine_depth - 2 * wall_thick, base_height + 2]);

        // ----------------------------------------------------------------------
        // 4. STANDOFF PILOT HOLES
        // ----------------------------------------------------------------------
        // Pi 5 M2.5 screw holes
        translate([pi_hole_1_x, pi_hole_1_y, floor_thick - 1.0])
            cylinder(d = pi_hole_dia, h = pi_standoff_h + 2.0);
        translate([pi_hole_2_x, pi_hole_2_y, floor_thick - 1.0])
            cylinder(d = pi_hole_dia, h = pi_standoff_h + 2.0);
        translate([pi_hole_3_x, pi_hole_3_y, floor_thick - 1.0])
            cylinder(d = pi_hole_dia, h = pi_standoff_h + 2.0);
        translate([pi_hole_4_x, pi_hole_4_y, floor_thick - 1.0])
            cylinder(d = pi_hole_dia, h = pi_standoff_h + 2.0);

        // ULN2003 M3/M4 screw holes
        translate([uln_base_x, uln_base_y, floor_thick - 1.0])
            cylinder(d = uln_hole_dia, h = uln_standoff_h + 2.0);
        translate([uln_base_x + uln_hole_dist_x, uln_base_y, floor_thick - 1.0])
            cylinder(d = uln_hole_dia, h = uln_standoff_h + 2.0);
        translate([uln_base_x, uln_base_y + uln_hole_dist_y, floor_thick - 1.0])
            cylinder(d = uln_hole_dia, h = uln_standoff_h + 2.0);
        translate([uln_base_x + uln_hole_dist_x, uln_base_y + uln_hole_dist_y, floor_thick - 1.0])
            cylinder(d = uln_hole_dia, h = uln_standoff_h + 2.0);

        // ----------------------------------------------------------------------
        // 5. RASPBERRY PI 5 DIRECT EXTERNAL CABLE I/O PORTS
        // ----------------------------------------------------------------------
        // USB-C Power Port on Right Outer Wall
        translate([machine_wid - wall_thick - 1, pi_pcb_y_min + 4.5, floor_thick + pi_standoff_h + 0.8])
            cube([wall_thick + 4, 15, 10]);

        // Micro-HDMI 0 on Right Outer Wall
        translate([machine_wid - wall_thick - 1, pi_pcb_y_min + 20.0, floor_thick + pi_standoff_h + 0.8])
            cube([wall_thick + 4, 11, 8]);

        // Micro-HDMI 1 on Right Outer Wall
        translate([machine_wid - wall_thick - 1, pi_pcb_y_min + 34.0, floor_thick + pi_standoff_h + 0.8])
            cube([wall_thick + 4, 11, 8]);

        // Rear Ports: Dual USB 3.0, Dual USB 2.0 & Gigabit Ethernet (Rear Wall)
        translate([pi_pcb_x_min + 1.0, machine_depth - wall_thick - 1, floor_thick + pi_standoff_h + 0.5])
            cube([54.0, wall_thick + 4, 21.0]);

        // MicroSD Card Finger Access Opening on Floor
        translate([pi_pcb_x_min + 20.0, pi_pcb_y_min - 4.0, -1])
            cube([16.0, 14.0, floor_thick + 2]);

        // ----------------------------------------------------------------------
        // 6. VENTILATION SLOTS
        // ----------------------------------------------------------------------
        for (vy = [98:7:122]) {
            translate([machine_wid - wall_thick - 1, vy, 14])
                cube([wall_thick + 4, 3.5, 16]);
        }

        for (vx = [divider_x + 6:6:86]) {
            translate([vx, machine_depth - wall_thick - 1, 14])
                cube([3.5, wall_thick + 4, 16]);
        }

        for (by = [65:8:95]) {
            translate([105, by, -1])
                cube([25, 4, floor_thick + 2]);
        }

        // ----------------------------------------------------------------------
        // 7. 20-SERIES M4 ASSEMBLY CORNER TAP HOLES (Connecting Base to Mid)
        // ----------------------------------------------------------------------
        for (pos = [[8, 8], [machine_wid - 8, 8], [8, machine_depth - 8], [machine_wid - 8, machine_depth - 8]]) {
            translate([pos[0], pos[1], -1])
                cylinder(d = m4_tap_dia, h = base_height + 2); // 3.8mm M4 tap pilot
        }

        // ----------------------------------------------------------------------
        // 8. 2020 ALUMINUM PROFILE M4 MOUNTING SLOTS (For T-Nut Framing)
        // ----------------------------------------------------------------------
        // Standard 20mm pitch slots along the rear bottom edge
        for (slot_x = [divider_x + 15, divider_x + 35, divider_x + 55]) {
            translate([slot_x, machine_depth - 12, -1])
                hull() {
                    cylinder(d = m4_clearance_dia, h = floor_thick + 2);
                    translate([0, 5, 0]) cylinder(d = m4_clearance_dia, h = floor_thick + 2);
                }
        }
    }
}

// Standalone render
base_chassis();
