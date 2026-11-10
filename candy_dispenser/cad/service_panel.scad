// ==============================================================================
// CANDY DISPENSER - REAR SERVICE & VENTILATION PANEL (20-SERIES M4 FASTENERS)
// ==============================================================================
// Removable access panel with 20-Series M4 clearance holes and head counterbores.
// Integrated cooling louvers and bottom external 5V motor power cable notch.
// ==============================================================================

include <config.scad>;

module service_panel() {
    panel_w = 69.0;
    panel_h = 87.0;
    panel_t = 3.5; // Slightly thickened for M4 counterbore strength

    difference() {
        // ----------------------------------------------------------------------
        // 1. MAIN PANEL BODY
        // ----------------------------------------------------------------------
        hull() {
            translate([3, 3, 0]) cylinder(r = 3, h = panel_t);
            translate([panel_w - 3, 3, 0]) cylinder(r = 3, h = panel_t);
            translate([panel_w - 3, panel_h - 3, 0]) cylinder(r = 3, h = panel_t);
            translate([3, panel_h - 3, 0]) cylinder(r = 3, h = panel_t);
        }

        // ----------------------------------------------------------------------
        // 2. 4X 20-SERIES M4 CORNER MOUNTING SCREW HOLES
        // ----------------------------------------------------------------------
        for (pos = [[5.0, 6.0], [panel_w - 5.0, 6.0], [5.0, panel_h - 6.0], [panel_w - 5.0, panel_h - 6.0]]) {
            // M4 clearance hole (4.5mm)
            translate([pos[0], pos[1], -1])
                cylinder(d = m4_clearance_dia, h = panel_t + 2);
            // M4 button/socket head counterbore (8.5mm)
            translate([pos[0], pos[1], panel_t - 2.0])
                cylinder(d = m4_head_dia, h = 3.0);
        }

        // ----------------------------------------------------------------------
        // 3. COOLING VENTILATION LOUVERS
        // ----------------------------------------------------------------------
        for (y = [20:7:panel_h - 20]) {
            translate([10, y, -1])
                cube([panel_w - 20, 3.5, panel_t + 2]);
        }

        // ----------------------------------------------------------------------
        // 4. EXTERNAL 5V POWER CABLE PASS-THROUGH NOTCH
        // ----------------------------------------------------------------------
        translate([panel_w / 2 - 5, -1, -1])
            cube([10, 8, panel_t + 2]);
    }
}

// Standalone render
service_panel();
