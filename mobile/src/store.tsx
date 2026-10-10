// Holds the active module connection and uploads its readings to the server every 5 seconds.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { connect as connectModule, type Connection, type Found, type Zones } from "./module";

import { assess, type Assessment, type Frame } from "./pressureAI";

type Live = {
  ai: Assessment;
  connection: Connection | null;
  patientId: number | null;
  latest: { z: Zones; t: number } | null;
  paused: boolean;
  lastUpload: number | null;
  uploadError: string;
  newAlerts: { zone: number; message: string }[];
  connect(found: Found, patientId: number): Promise<void>;
  disconnect(): Promise<void>;
  setPaused(p: boolean): void;
  clearAlerts(): void;
};

const Ctx = createContext<Live | null>(null);
export const useLive = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLive outside provider");
  return v;
};

const FLUSH_MS = 5000;
const MAX_BUFFER = 3600; // keep up to an hour of readings if the server is unreachable

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const [ai, setAI] = useState<Assessment>({state:"unavailable",confidence:null,reason:"Validated model not installed. Pressure rules remain active."});
  const aiFrames = useRef<Frame[]>([]);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [latest, setLatest] = useState<Live["latest"]>(null);
  const [paused, setPausedState] = useState(false);
  const [lastUpload, setLastUpload] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [newAlerts, setNewAlerts] = useState<Live["newAlerts"]>([]);
  const buffer = useRef<{ t: number; z: number[] }[]>([]);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (!connection) return;
    const off = connection.onReading((z, t) => {
      setLatest({ z, t });
      if (!pausedRef.current) {
        aiFrames.current.push({z,t});
        aiFrames.current = aiFrames.current.slice(-64);
        setAI(assess(aiFrames.current));
      }
      if (!pausedRef.current) {
        buffer.current.push({ t, z });
        if (buffer.current.length > MAX_BUFFER) buffer.current.splice(0, buffer.current.length - MAX_BUFFER);
      }
    });
    const timer = setInterval(async () => {
      if (!buffer.current.length) return;
      const batch = buffer.current.splice(0, buffer.current.length);
      try {
        const r = await api.ingest(connection.name, connection.battery, batch);
        setLastUpload(Date.now());
        setUploadError("");
        if (r.alerts.length) setNewAlerts((a) => [...r.alerts, ...a]);
      } catch (e) {
        buffer.current.unshift(...batch); // retry next time
        setUploadError(e instanceof Error ? e.message : "Upload failed.");
      }
    }, FLUSH_MS);
    return () => {
      off();
      clearInterval(timer);
    };
  }, [connection]);

  const connect = useCallback(async (found: Found, pid: number) => {
    if (connection) await connection.disconnect();
    const conn = await connectModule(found);
    try { await api.assign(conn.name, pid); } catch (e) { await conn.disconnect(); throw e; }
    buffer.current = [];
    aiFrames.current = [];
    setAI(assess([]));
    setLatest(null);
    setPatientId(pid);
    setConnection(conn);
  }, [connection]);

  const disconnect = useCallback(async () => {
    await connection?.disconnect();
    setConnection(null);
    aiFrames.current = [];
    setAI(assess([]));
    setPatientId(null);
    setLatest(null);
  }, [connection]);

  const setPaused = useCallback((p: boolean) => {
    pausedRef.current = p;
    aiFrames.current = [];
    setAI(assess([]));
    setPausedState(p);
  }, []);

  return (
    <Ctx.Provider value={{ ai, connection, patientId, latest, paused, lastUpload, uploadError, newAlerts, connect, disconnect, setPaused, clearAlerts: () => setNewAlerts([]) }}>
      {children}
    </Ctx.Provider>
  );
}
