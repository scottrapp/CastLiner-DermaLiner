# CastLiner graphics and signal model update

The mobile and web apps now display a detailed anatomical wireframe arm or leg with SVG sensor overlays with four live sensor zones. Colors follow the video and source rules: blue below target, green within target, red above target, grey when no fresh data is available. Sensor order is explicitly schematic; anatomical placement must be confirmed at setup. Non-limb sites use a sensor-strip diagram rather than an incorrect limb. Thresholds remain clinician configured.

Open `preview/index.html` for an interactive design review without a server or account. Its readings are illustrative. Open `ai/recording-review/index.html` for plots of all five uploaded exercise recordings.

## What is implemented

- Live web and React Native mesh artwork with SVG sensor overlays, arm/leg selection from patient location, four sensor markers, matching colors, and stale-data behavior.
- A mobile shadow-inference adapter in `mobile/src/pressureAI.ts`. It buffers 64 one-second frames and supplies normalized pressures and first differences. No model or native inference bridge is installed. Status says so. The inference output never changes measurements or suppresses existing alerts.
- A proposed small TensorFlow 2.x dense time-window classifier in `ai/train.py`, with stable, positional transient, sustained change, and uncertain outputs. It exports Keras weights, an int8 `.tflite` model, a firmware C array, and a manifest containing quantization parameters and held-out metrics. TensorFlow training/export was not executed in this workspace; there is no trained model deliverable.
- Separate research implementation of the older 30-minute segment rules in `mobile/src/medicalRules.ts`. Two complete high segments produce a warning, four produce a high alert candidate, and normal or missing data breaks the sequence. Below-range pressure is blue. Four consecutive low segments produce an alert candidate. Coverage checks reject clustered samples and incomplete windows. This engine is NOT wired to production alerts. The supplied rules leave parts of low-pressure/background escalation ambiguous, and human CastLiner settings need review.
- Historical raw-data importer, one-second medians, 60-second median trend plots, and editable candidate annotations. Original files are untouched.

## Findings from the uploaded recordings

| Recording | Duration | Channels | Samples | Approximate sampling rate |
| --- | ---: | --- | ---: | ---: |
| 4-mile run | 37.25 min | 1, 2, 3 | 9,150 | 4.1 Hz |
| 6-mile cramp run | 51.62 min | 2, 3 | 12,679 | 5.0 Hz |
| 6-mile drift/cool-down run | 61.50 min | 1, 2, 3 | 15,108 | 4.1 Hz |
| 6-mile strap adjustment run | 54.74 min | 1, 2, 3 | 13,448 | 4.1 Hz |
| 7.5-mile run | 65.91 min | 1, 2, 3 | 16,190 | 4.1 Hz |

Offset is used as elapsed milliseconds; the Timestamp field appears to be a wall-clock fragment and is not used to align events. Offset units should still be confirmed with the source exporter. Values span hundreds to roughly 30,500 in unconfirmed raw units. There is no calibration curve, pressure direction, subject identity, confirmed event label, or fourth channel. The plots preserve missing one-second bins and do not fabricate data across gaps. Filename-based annotations assume the recording began with the run; that alignment also needs confirmation.

These recordings are suitable for retrospective signal review and event annotation. They cannot be supplied directly to the four-zone mmHg model. Do not invent a fourth channel, assume raw readings increase with pressure, or apply 30 mmHg to raw values. Exercise events also differ from cast-related pressure injury: confirmed clinical endpoints and representative cast data are needed to evaluate that use.

## Model and firmware handoff

1. Confirm hardware MCU, flash/RAM budget, firmware source, packet fields, sample rates, sensor calibration, and whether the module has an accelerometer/gyroscope. Pressure patterns alone may be ambiguous when posture and sustained load change together. Synchronized module motion signals and controlled posture trials would help label those cases; phone movement alone is not a reliable proxy for limb motion.
2. Obtain four calibrated pressure channels at an agreed rate and preserve high-rate raw data for model-development experiments. This prototype uses 1 Hz / 64 seconds; it is a starting design, not an established optimal rate. Firmware anti-alias filtering/downsampling must be specified. A higher-rate motion model may be necessary for short transients.
3. Annotate stable periods, controlled repositioning, contractions, strap/cast adjustment, sustained load, sensor detachment, and uncertain windows. Separate signal-pattern labels from clinical adverse-event outcomes. Confirm onset/offset, subject identity, interventions, and independent reference measurements. All windows from a subject must stay in a single split. The same rule applies to overlapping recordings.
4. Build NPZ data as described in `ai/train.py`; train offline with a current compatible TensorFlow 2.x environment and freeze weights. The export script requires patient-disjoint train, validation, and test splits, all containing each class. Use `python ai/train.py dataset.npz --out ai/export`. Do not assign every run the filename's event label.
5. Validate the quantized model on unseen subjects and hardware. Examine missed sustained changes, positional false positives, missing data, calibration drift, sensor saturation, latency, and subgroup performance. The 0.85 score gate is provisional and not a calibrated clinical probability. `manifest.json` stays `validated: false` until release review.
6. Integrate the C model with LiteRT for Microcontrollers on the module. Measure tensor arena RAM, timing, power, and supported operations. A developer must register the necessary ops and use manifest quantization values when encoding/decoding tensors. Firmware is absent from this archive, so this integration is not implemented.
7. Extend BLE with model version, signal-quality state and score, and explicitly separate raw and filtered pressure if both are exposed. The current BLE UUIDs, packet parser and calibration are placeholders. Do not reinterpret packets before confirming the firmware protocol.
8. Display the module's result on the phone. The phone can independently run the same frozen model through a native LiteRT bridge implementing `installModel({version, validated, run})`; none is bundled. Keep source/version identifiable and preserve deterministic pressure alarms during shadow evaluation.

## Rules and submission reconciliation

The 2023 SmartRap rules describe three-zone graded compression, relief/high-intensity presets, prolonged exposure and optional percent-change behavior. They do not define a fourth therapeutic range. They also contain historical physiological statements and suggested interventions; this update does not turn those statements into automated diagnoses or treatment recommendations.

The submitted document's software summary says deterministic FIR/IIR filtering and no ML inference, while its specification table says frozen TensorFlow Lite artifact rejection. Reconcile those passages before representing the implementation in a submission. Other existing gaps include placeholder Bluetooth protocol/calibration, cloud patient-data storage in the original app versus the submission's no-PHI description, and thresholds that the original app does not yet synchronize to firmware.

## Verification

Web production build succeeded. Web and mobile TypeScript checks passed. Six original analysis tests and six new model-input/segment-rule tests passed. Python importer ran on all five recordings; training script syntax compiled. TensorFlow training, native phone inference, firmware deployment, Bluetooth behavior on hardware, and clinical performance remain untested. Arm and leg SVG previews were rendered and visually inspected. Browser automation was unavailable because the browser binary download failed, so interactive browser and native phone visual checks remain outstanding.

The inherited Next.js 14.2.18 dependency is flagged as vulnerable by npm. Upgrade and review dependencies before production deployment; this change does not deploy the app.

Sources for model conversion and firmware integration:
- https://ai.google.dev/edge/api/tflite/python/tf/lite/TFLiteConverter
- https://github.com/tensorflow/tflite-micro/tree/main/tensorflow/lite/micro/examples/hello_world


## Approved artwork revision

The arm uses softer pediatric proportions and an approximately 90-degree elbow bend for a long-arm cast pose. Zone 4 is above the elbow; Zones 1–3 are along the forearm. The approved leg is retained with Zone 4 on the heel. Broad adjoining translucent zones give both limbs a sleeve appearance; leg Zones 1–3 evenly divide the calf-to-ankle region in short-leg views and the upper-leg-to-ankle region in long-leg views. Both apps use transparent mesh artwork with independent live pressure overlays and mirrored left/right views. See ARTWORK_NOTES.md for assets and creative specifications.
