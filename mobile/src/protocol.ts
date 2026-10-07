// ─────────────────────────────────────────────────────────────────────────────
// MODULE BLUETOOTH PROTOCOL — the only file that depends on the module firmware.
//
// NOT YET CONFIRMED. The values below are placeholders until we read the firmware
// source (github.com/DATechnologies/fiomet-firmware) or Rapptr's app code.
// To confirm on real hardware without code: open the free "nRF Connect" app,
// connect to the FIO-xxxxxx module, and note (1) the service UUID, (2) the
// characteristic that sends notifications, and (3) a few raw hex packets while
// pressing each zone. Those three things are all this file needs.
// ─────────────────────────────────────────────────────────────────────────────

/** Modules advertise names like "FIO-E4BC95". */
export const NAME_PREFIX = "FIO-";

/** PLACEHOLDER: Nordic UART Service, common on nRF52 firmware. Replace with the module's real UUIDs. */
export const PRESSURE_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const PRESSURE_NOTIFY_CHAR = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

/** Standard Bluetooth Battery Service; most nRF52 firmware exposes it. */
export const BATTERY_SERVICE = "0000180f-0000-1000-8000-00805f9b34fb";
export const BATTERY_CHAR = "00002a19-0000-1000-8000-00805f9b34fb";

/**
 * PLACEHOLDER parser. Assumes each notification is 8 bytes: four little-endian
 * unsigned 16-bit values, one per zone, already in tenths of mmHg.
 * Returns null for packets it doesn't understand (they are skipped, not stored).
 */
export function parsePressurePacket(bytes: Uint8Array): [number, number, number, number] | null {
  if (bytes.length < 8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const z = [0, 1, 2, 3].map((i) => toMmHg(view.getUint16(i * 2, true)));
  return z.every(Number.isFinite) ? (z as [number, number, number, number]) : null;
}

/** PLACEHOLDER calibration: raw units → mmHg. Replace with the sensor calibration once known. */
export function toMmHg(raw: number): number {
  return raw / 10;
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = globalThis.atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
