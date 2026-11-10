// ==============================================================================
// CANDY DISPENSER - CUTAWAY & PERSPECTIVE INTERNAL VIEWS
// ==============================================================================
// 1. "quarter": Front-right cutaway exposing drum, motor, Pi 5, chute
// 2. "front_half": Front half sliced at Y=70 exposing full food/electronics flow
// 3. "xray": Full translucent 3D perspective with see-through outer shells
// ==============================================================================

include <config.scad>;
use <assembly_preview.scad>;

cut_mode = "front_half"; // "quarter", "front_half", "xray"

module cutaway_assembly() {
    if (cut_mode == "xray") {
        full_dispenser_assembly(translucent = true);
    } else if (cut_mode == "quarter") {
        difference() {
            full_dispenser_assembly();
            // Cut away front-right section
            translate([45, -5, -5])
                cube([machine_wid, 75, 250]);
        }
    } else if (cut_mode == "front_half") {
        difference() {
            full_dispenser_assembly();
            // Cut away front half (Y < 70) right through the centerline
            translate([-10, -10, -10])
                cube([machine_wid + 20, 80, 260]);
        }
    }
}

cutaway_assembly();
