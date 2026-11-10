// ==============================================================================
// RETRO VENDING MACHINE CANDY DISPENSER - CONFIGURATION & PARAMETERS
// ==============================================================================
// Designed for: Sindoh 3DWOX 2X DP303 (Max build volume: 228 x 200 x 300 mm)
// Actuation: 28BYJ-48 Stepper Motor (5V) + ULN2003 Driver Board
// Controller: Raspberry Pi 5 (Single Board Computer)
// Fasteners: 20-Series Aluminum Profile Standard M4 Bolts (Button/Socket head)
// ==============================================================================

$fn = 60; // Smoothness for circles/curves

// ------------------------------------------------------------------------------
// 1. CANDY DIMENSIONS (Xiao Ke Ao La - Expanded Envelope: +7mm Width, +5mm Height)
// ------------------------------------------------------------------------------
// User specified expansion:
// - Length (가로/X): 30.5 mm
// - Width  (세로/Y): 16.5 + 7.0 = 23.5 mm (+7mm for crinkled/puffed wrapper wings)
// - Height (두께/Z): 12.0 + 5.0 = 17.0 mm (+5mm for high-pillow wrapper puff)
candy_length         = 30.5; // Length with crimped zigzag wings
candy_width          = 23.5; // Expanded pouch width (16.5 + 7.0)
candy_thickness      = 17.0; // Expanded bulging height (12.0 + 5.0)

// Directional guide throat in hopper (forces candy to align lengthwise)
// 28.0mm < 30.5mm candy length -> physically impossible to turn sideways!
// 28.0mm > 23.5mm candy width  -> smooth frictionless gravity slide (+4.5mm clearance)
hopper_throat_w      = 28.0; 
hopper_throat_l      = 44.0;

// Drum Single-Candy Pocket (V-tapered scoop geometry tailored to 30.5 x 23.5 x 17.0 mm)
candy_pocket_len     = 36.0; // Axial length (+5.5mm clearance)
candy_pocket_mouth_w = 29.5; // Wide top funnel mouth to catch dropping candy (+6.0mm)
candy_pocket_bot_w   = 25.5; // Snug bottom seating (+2.0mm)
candy_pocket_depth   = 19.5; // Radial depth (+2.5mm clearance over 17mm; 2nd candy exceeds by 14.5mm)

// ------------------------------------------------------------------------------
// 2. 20-SERIES STANDARD FASTENERS (M4 Bolts)
// ------------------------------------------------------------------------------
m4_clearance_dia     = 4.5;  // M4 bolt pass-through hole (with 3D print clearance)
m4_tap_dia           = 3.8;  // M4 self-threading pilot hole in plastic
m4_head_dia          = 8.5;  // M4 button/socket head counterbore
m4_head_h            = 3.2;  // M4 head depth

// ------------------------------------------------------------------------------
// 3. 3D PRINTING CLEARANCE & WALL THICKNESS
// ------------------------------------------------------------------------------
tol                  = 0.35; // Slip-fit radial clearance for 3DWOX 0.4mm nozzle
press_tol            = 0.15; // Tight friction-fit clearance
wall_thick           = 3.0;  // Sturdy structural wall thickness
floor_thick          = 3.0;  // Bottom floor thickness

// ------------------------------------------------------------------------------
// 4. STEPPER MOTOR (28BYJ-48) & SHAFT COUPLING
// ------------------------------------------------------------------------------
motor_shaft_dia_actual   = 5.2;  // User measured physical shaft outer diameter
motor_shaft_flat_actual  = 3.0;  // User measured physical D-cut flat thickness
motor_shaft_len          = 7.5;  // User measured physical shaft protrusion length

motor_bore_dia           = motor_shaft_dia_actual + 0.25; // 5.45 mm
motor_bore_flat          = motor_shaft_flat_actual + 0.20; // 3.20 mm

motor_body_dia       = 28.2;
motor_body_depth     = 19.5;
motor_ears_spacing   = 35.0; // Distance between ear hole centers
motor_ear_hole_dia   = 4.2;  // Accommodates M4 or M3 bolts
motor_boss_dia       = 9.2;
motor_boss_len       = 1.5;
motor_eccentric_dist = 8.0;

// ------------------------------------------------------------------------------
// 5. METERING DRUM DIMENSIONS (Scaled for 17.0mm depth)
// ------------------------------------------------------------------------------
drum_dia             = 66.0; // Expanded to 66mm to maintain 10.8mm solid hub backing
drum_len             = 52.0;
drum_shaft_hub_len   = 8.0;
drum_wall_gap        = 0.6;  // Running clearance

// ------------------------------------------------------------------------------
// 6. RASPBERRY PI 5 DIMENSIONS & MOUNTING (Standard M2.5)
// ------------------------------------------------------------------------------
pi_len               = 85.0;
pi_wid               = 56.0;
pi_pcb_thick         = 1.6;
pi_hole_dist_x       = 49.0;
pi_hole_dist_y       = 58.0;
pi_standoff_dia      = 6.5;
pi_standoff_h        = 5.0;
pi_hole_dia          = 2.6; // M2.5 pilot hole (Pi 5 PCB standard)

// ------------------------------------------------------------------------------
// 7. ULN2003 DRIVER BOARD (M3 / M4)
// ------------------------------------------------------------------------------
uln_pcb_len          = 35.0;
uln_pcb_wid          = 32.0;
uln_hole_dist_x      = 30.0;
uln_hole_dist_y      = 26.5;
uln_hole_dia         = 3.6;
uln_standoff_h       = 4.0;

// ------------------------------------------------------------------------------
// 8. MACHINE OVERALL ENVELOPE (Strictly under 3DWOX 200x200mm XY limit)
// ------------------------------------------------------------------------------
machine_wid          = 150.0;
machine_depth        = 135.0;
base_height          = 45.0;
mid_height           = 95.0;
hopper_height        = 85.0;

divider_x            = 68.0;
