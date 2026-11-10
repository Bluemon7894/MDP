// ==============================================================================
// CANDY DISPENSER - ROTATING METERING DRUM (V-TAPER SCOOP & AGITATOR RIBS)
// ==============================================================================
// Designed for: Xiao Ke Ao La Candy (32 x 20 x 7 mm)
// Actuator: 28BYJ-48 Stepper Motor D-shaft (5.2mm dia, 3.0mm flat, 7.5mm len)
// Features: V-taper funnel mouth (26mm -> 21mm), anti-jam chamfer, agitation ribs
// ==============================================================================

include <config.scad>;

module motor_d_shaft_cut() {
    shaft_dia = motor_bore_dia;
    flat_w    = motor_bore_flat;
    depth     = motor_shaft_len + 1.5; // 9.0mm depth
    
    union() {
        intersection() {
            cylinder(d = shaft_dia, h = depth, center = false);
            translate([-shaft_dia/2, -flat_w/2, 0])
                cube([shaft_dia, flat_w, depth]);
        }
        // Funnel-shaped entry chamfer to guide shaft into the D-slot easily
        translate([0, 0, depth - 1.2])
            cylinder(d1 = shaft_dia, d2 = shaft_dia + 1.2, h = 1.3, center = false);
    }
}

module drum_dispenser() {
    pocket_r = drum_dia / 2;
    pocket_l = candy_pocket_len;     // 36.0 mm
    mouth_w  = candy_pocket_mouth_w; // 26.0 mm (wide opening)
    bot_w    = candy_pocket_bot_w;   // 21.0 mm (snug bottom)
    pocket_d = candy_pocket_depth;   // 10.0 mm

    difference() {
        union() {
            // Main drum cylinder body
            cylinder(d = drum_dia, h = drum_len, center = false);

            // Motor-side coupling hub (protrudes into divider wall socket)
            translate([0, 0, drum_len])
                cylinder(d = 16.0, h = drum_shaft_hub_len, center = false);

            // Opposite side pivot boss (fits into left outer wall bearing socket)
            translate([0, 0, -6.0])
                cylinder(d = 12.0, h = 6.0, center = false);

            // ------------------------------------------------------------------
            // External Agitator Ribs (Gently jostles candies to prevent bridging)
            // ------------------------------------------------------------------
            for (ang = [135, 225]) {
                rotate([0, 0, ang])
                translate([pocket_r - 0.5, -2.5, 6])
                    hull() {
                        translate([0, 2.5, 0]) cylinder(r = 2.0, h = drum_len - 12);
                        translate([2.0, 2.5, 0]) cylinder(r = 1.0, h = drum_len - 12);
                    }
            }
        }

        // ----------------------------------------------------------------------
        // 1. CANDY POCKET (V-Tapered Scoop for High Capture Probability)
        // ----------------------------------------------------------------------
        // Axially centered along drum_len
        translate([0, 0, (drum_len - pocket_l) / 2]) {
            hull() {
                // Wide top funnel mouth at surface
                translate([pocket_r - 1.0, -mouth_w / 2, 0])
                    cube([2.0, mouth_w, pocket_l]);

                // Snug bottom cavity preventing 2nd candy
                translate([pocket_r - pocket_d, -bot_w / 2, 0])
                    cube([2.0, bot_w, pocket_l]);
            }
        }

        // 2. Anti-jam Chamfer on the leading edge of pocket (30 degrees)
        translate([0, 0, (drum_len - pocket_l) / 2 - 0.5]) {
            rotate([0, 0, 28])
            translate([pocket_r - 7, -mouth_w/2 - 4, 0])
                cube([14, 10, pocket_l + 1.0]);
        }

        // 3. Smooth exit ramp on trailing edge for clean gravity drop
        translate([0, 0, (drum_len - pocket_l) / 2 - 0.5]) {
            rotate([0, 0, -25])
            translate([pocket_r - 6, mouth_w/2 - 5, 0])
                cube([12, 10, pocket_l + 1.0]);
        }

        // 4. Motor D-Shaft Bore in hub
        translate([0, 0, drum_len + drum_shaft_hub_len - (motor_shaft_len + 1.5)])
            motor_d_shaft_cut();

        // 5. Set Screw Thread Hole (M3/M4 locking screw)
        translate([0, 0, drum_len + drum_shaft_hub_len - motor_shaft_len / 2])
            rotate([0, 90, 0])
                cylinder(d = 3.2, h = 12.0, center = false);

        // 6. Weight/Material reduction hollows on solid back side
        for (a = [100, 180, 260]) {
            rotate([0, 0, a])
            translate([18, 0, 6])
                cylinder(d = 11.0, h = drum_len - 12, center = false);
        }
    }
}

// Standalone render
drum_dispenser();
