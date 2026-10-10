// One interface for a connected module, backed either by real Bluetooth or by a simulator.
import { BleManager, type Device, type Subscription } from "react-native-ble-plx";
import { PermissionsAndroid, Platform } from "react-native";
import {
  BATTERY_CHAR, BATTERY_SERVICE, NAME_PREFIX, PRESSURE_NOTIFY_CHAR, PRESSURE_SERVICE, base64ToBytes, parsePressurePacket,
} from "./protocol";

export type Zones = [number, number, number, number];
export type Found = { id: string; name: string; rssi: number | null; simulated?: boolean };
export type Connection = {
  name: string;
  battery: number | null;
  onReading(cb: (z: Zones, t: number) => void): () => void;
  disconnect(): Promise<void>;
};

export const SIMULATED: Found = { id: "sim", name: "FIO-SIM001", rssi: null, simulated: true };

let manager: BleManager | null = null;
function ble() {
  if (!manager) manager = new BleManager();
  return manager;
}

async function androidPermissions() {
  if (Platform.OS !== "android") return true;
  const res = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ]);
  return Object.values(res).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
}

/** Scans for modules for `ms` milliseconds, reporting each as it's found. */
export async function scan(onFound: (d: Found) => void, ms = 10_000): Promise<void> {
  if (!(await androidPermissions())) throw new Error("Bluetooth permission is needed to find modules.");
  const m = ble();
  const state = await m.state();
  if (state !== "PoweredOn") throw new Error("Turn on Bluetooth to find modules.");
  return new Promise((resolve) => {
    m.startDeviceScan(null, { allowDuplicates: false }, (err, d) => {
      if (err) return;
      const name = d?.name ?? d?.localName;
      if (d && name?.startsWith(NAME_PREFIX)) onFound({ id: d.id, name, rssi: d.rssi });
    });
    setTimeout(() => {
      m.stopDeviceScan();
      resolve();
    }, ms);
  });
}

export async function connect(found: Found): Promise<Connection> {
  return found.simulated ? simulate(found.name) : connectBle(found);
}

async function connectBle(found: Found): Promise<Connection> {
  const m = ble();
  let device: Device = await m.connectToDevice(found.id, { timeout: 15_000 });
  device = await device.discoverAllServicesAndCharacteristics();

  let battery: number | null = null;
  try {
    const c = await device.readCharacteristicForService(BATTERY_SERVICE, BATTERY_CHAR);
    if (c.value) battery = base64ToBytes(c.value)[0] ?? null;
  } catch {
    // Battery service not exposed; leave unknown.
  }

  const listeners = new Set<(z: Zones, t: number) => void>();
  const sub: Subscription = device.monitorCharacteristicForService(PRESSURE_SERVICE, PRESSURE_NOTIFY_CHAR, (err, c) => {
    if (err || !c?.value) return;
    const z = parsePressurePacket(base64ToBytes(c.value));
    if (z) listeners.forEach((l) => l(z, Date.now()));
  });

  return {
    name: found.name,
    battery,
    onReading(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async disconnect() {
      sub.remove();
      await m.cancelDeviceConnection(device.id).catch(() => {});
    },
  };
}

/** A fake module that produces plausible readings once a second. Zone 3 drifts upward after ~90 s. */
function simulate(name: string): Connection {
  const listeners = new Set<(z: Zones, t: number) => void>();
  const start = Date.now();
  const base = [14, 18, 16, 12];
  const timer = setInterval(() => {
    const now = Date.now();
    const drift = Math.max(0, (now - start - 90_000) / 1000) * 0.25;
    const z = base.map((b, i) => Math.round((b + (i === 2 ? Math.min(drift, 22) : 0) + Math.sin(now / 9000 + i) * 3 + (Math.random() - 0.5) * 3) * 10) / 10) as Zones;
    listeners.forEach((l) => l(z, now));
  }, 1000);
  return {
    name,
    battery: 90,
    onReading(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async disconnect() {
      clearInterval(timer);
    },
  };
}
