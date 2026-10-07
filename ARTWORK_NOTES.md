# Approved anatomical artwork

The earlier flat outline graphics have been replaced by detailed original anatomical mesh illustrations generated with the built-in image-generation tool. The user's supplied images were style references, and their lettering/watermarks were not reused. This is illustrative artwork, not a patient-specific anatomical scan.

The final arm has softer pediatric proportions and an approximately 90-degree elbow bend suitable for a long-arm cast pose. Zones 1, 2, and 3 are on the forearm; Zone 4 is on the upper arm above the elbow. The illustrated forearm order is Z1 near the elbow, Z2 in the middle, and Z3 toward the wrist; confirm this order against the physical sensor strip. The approved leg artwork is retained, with Zone 4 centered on the heel. Zones 1–3 evenly divide the remaining illustrated sleeve: calf through ankle for short-leg views, and upper leg through ankle for long-leg views. Broad adjoining translucent sections replace the narrow sensor rings, giving both limbs a sleeve appearance while preserving the mesh underneath. These are schematic monitoring zones, not exact anatomical sensor footprints.

## Assets

- `web/public/anatomy/arm-mesh.png` and `leg-mesh.png` are transparent PNGs used by the web app.
- `mobile/assets/anatomy/arm-mesh.png` and `leg-mesh.png` bundle the same artwork with the phone app.
- `preview/index.html` demonstrates the arm and leg with illustrative readings.
- `preview/arm.svg` and `leg.svg` include embedded artwork and illustrative pressure overlays, with corresponding PNG previews.

The anatomical images contain no fixed pressure colors or labels. SVG overlays supply independent live pressure bands, callouts, values and accessible descriptions. Left-sided selections mirror the anatomy and reposition the overlays. The source PNGs are unchanged after generation.

## Final generation specifications

Arm prompt: Produce original professional clinical CAD artwork based on the supplied fine subdivision-1 quad mesh reference. Use slender, soft school-age pediatric limb proportions with no prominent biceps/deltoid musculature. Bend the elbow approximately 90 degrees: upper arm descends vertically at the left, forearm extends horizontally right, wrist/hand relaxed with detailed fingers. Use coherent fine silver-white/pale cyan quad topology and restrained translucent shading. Clean upper-arm cutaway, no torso, no actual cast, no baked-in sensor bands, UI, labels or watermark. Transparent background and full subject inside a landscape canvas.

Leg prompt: Produce original professional clinical CAD artwork based on the references' dense quad topology. One full leg from mid-thigh to foot, nearly straight with a slight natural knee bend, in three-quarter side view. Realistic knee, calf, ankle, heel, arch and toes. Fine silver-white/pale cyan mesh with subtle translucent shading and surface depth. Transparent background; no baked-in bands, UI, labels, watermark, grid or platform.

The earlier muscular arm is not included in the deployed app assets. App components render the sensor placements from shared coordinate definitions in `web/src/lib/limb.ts` and `mobile/src/limb.ts`.
