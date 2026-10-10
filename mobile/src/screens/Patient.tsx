import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type Patient as P } from "../api";
import { useLive } from "../store";
import { Button, Card, ErrorText, H, Soft } from "../ui";
import { c, LOCATIONS, statusColor } from "../theme";

import WireframeLimb from "../WireframeLimb";

const CAPTURE_SECONDS = 60;
const STALE_MS = 10_000;

export default function Patient({ id, onBack, onConnect, readOnly=false }: { id: number; onBack(): void; onConnect(name: string): void; readOnly?:boolean }) {
  const live = useLive();
  const [p, setP] = useState<P | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [capture, setCapture] = useState<number | null>(null); // seconds remaining
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mine = live.connection && live.patientId === id;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.patient(id);
      setP(d);
      setLocation((l) => l ?? d.sensorLocation);
      live.setPaused(d.capturePaused);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load the patient.");
    } finally {
      setLoading(false);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  useEffect(() => {
    if (live.newAlerts.length && mine) {
      Alert.alert("Pressure alert", live.newAlerts.map((a) => a.message).join("\n"));
      live.clearAlerts();
      load();
    }
  }, [live.newAlerts]); // eslint-disable-line react-hooks/exhaustive-deps

  function startCapture() {
    if (!location) return setErr("Choose the sensor location first.");
    setErr("");
    setCapture(CAPTURE_SECONDS);
    timer.current = setInterval(() => {
      setCapture((s) => {
        if (s === null) return null;
        if (s <= 1) {
          clearInterval(timer.current!);
          // Give the last upload a moment to land before averaging on the server.
          setTimeout(finishCapture, 6000);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function finishCapture() {
    try {
      await api.baseline(id, location);
      setCapture(null);
      Alert.alert("Initial readings captured", "The baseline for this cast has been saved.");
      load();
    } catch (e) {
      setCapture(null);
      setErr(e instanceof Error ? e.message : "Couldn't save the baseline.");
    }
  }

  async function togglePause() {
    const next = !live.paused;
    try {
      await api.update(id, { capturePaused: next });
      live.setPaused(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't change capture.");
    }
  }

  function confirmDisconnect() {
    Alert.alert("Disconnect module?", "Readings stop until you reconnect.", [
      { text: "Cancel", style: "cancel" },
      { text: "Disconnect", style: "destructive", onPress: () => live.disconnect() },
    ]);
  }

  const th = (zone: number) => p?.thresholds.find((t) => t.zone === zone);
  const latest = mine && live.latest && Date.now() - live.latest.t < STALE_MS ? live.latest : null;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 48 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.soft} />}>
      <Pressable onPress={onBack} accessibilityRole="button"><Text style={s.link}>‹ Patients</Text></Pressable>
      <Text style={s.title}>{p ? `${p.firstName} ${p.lastName}` : "Loading…"}</Text>
      <ErrorText>{err}</ErrorText>

      {p && (
        <Card>
          <H>Patient</H>
          <Soft>{[p.mrn && `MRN ${p.mrn}`, p.dob && `DOB ${p.dob}`, p.sex].filter(Boolean).join("  ·  ") || "No details on file"}</Soft>
          {p.baseline && <Soft>Baseline {new Date(p.baseline.capturedAt).toLocaleString()}: {[p.baseline.z1, p.baseline.z2, p.baseline.z3, p.baseline.z4].map((v, i) => `Z${i + 1} ${v}`).join(", ")}</Soft>}
          {p.alerts.length > 0 && <Text style={s.alert}>{p.alerts.length} open alert{p.alerts.length > 1 ? "s" : ""}: {p.alerts[0].message}</Text>}
        </Card>
      )}

      <Card>
        <H>Module</H>
        {mine ? (
          <>
            <Text style={s.value}>{live.connection!.name}{live.connection!.battery != null ? `  ·  ${live.connection!.battery}%` : ""}</Text>
            <Soft>
              {live.uploadError
                ? `Not uploading: ${live.uploadError} Readings are kept on the phone and sent when the connection returns.`
                : live.lastUpload
                  ? `Uploaded ${Math.round((Date.now() - live.lastUpload) / 1000)} s ago`
                  : "Waiting for first upload…"}
            </Soft>
            <Button title="Disconnect" kind="plain" onPress={confirmDisconnect} />
          </>
        ) : (
          <>
            <Soft>{live.connection ? `${live.connection.name} is connected to another patient.` : "No module connected."}</Soft>
            <Button title="Connect a module" onPress={() => p && onConnect(`${p.firstName} ${p.lastName}`)} />
          </>
        )}
      </Card>

      <Card>
        <H>Readings</H>
        <Soft>Sensor location</Soft>
        <View style={s.chips}>
          {LOCATIONS.map((l) => (
            <Pressable disabled={readOnly} key={l} onPress={() => setLocation(l)} style={[s.chip, location === l && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: location === l }}>
              <Text style={[s.chipText, location === l && { color: "#fff" }]}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <WireframeLimb values={latest?.z ?? [null,null,null,null]} thresholds={p?.thresholds ?? []} location={location}/>
        <View style={s.tiles}>
          {[1, 2, 3, 4].map((zone) => {
            const v = latest ? latest.z[zone - 1] : null;
            return (
              <View key={zone} style={[s.tile, { backgroundColor: statusColor(v, th(zone)) }]} accessibilityLabel={`Zone ${zone}: ${v == null ? "no reading" : `${Math.round(v)} millimeters of mercury`}`}>
                <Text style={s.tileName}>Zone {zone}</Text>
                <Text style={s.tileValue}>{v == null ? "–" : Math.round(v)}</Text>
                <Text style={s.tileUnit}>mmHg</Text>
              </View>
            );
          })}
        </View>
        <View style={{padding:12,borderWidth:1,borderColor:c.line,borderRadius:12,marginVertical:8}}><Text style={{color:c.accent,fontWeight:"700"}}>On-device signal review</Text><Soft>{latest ? live.ai.reason : "Awaiting live readings. Model review unavailable."}</Soft>{latest && live.ai.confidence != null && <Soft>{live.ai.state} · {Math.round(live.ai.confidence*100)}% model score</Soft>}</View>
        {!mine && <Soft>Connect a module to see live readings.</Soft>}

        {mine && capture !== null ? (
          <Text style={s.value}>{capture > 0 ? `Capturing initial readings… ${capture} s` : "Saving baseline…"}</Text>
        ) : (
          mine && <Button title="Capture initial readings" onPress={startCapture} disabled={!location} />
        )}
        {mine && <Button title={live.paused ? "Resume readings" : "Pause readings"} kind={live.paused ? "primary" : "danger"} onPress={togglePause} />}
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: c.bg },
  link: { color: c.accent, fontSize: 16, marginBottom: 6 },
  title: { color: c.text, fontSize: 26, fontWeight: "700", marginBottom: 12 },
  value: { color: c.text, fontSize: 16, fontWeight: "700" },
  alert: { color: "#ff8a98", fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: c.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: { backgroundColor: c.accent, borderColor: c.accent },
  chipText: { color: c.soft, fontSize: 13 },
  tiles: { flexDirection: "row", gap: 8, marginVertical: 8 },
  tile: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  tileName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  tileValue: { color: "#fff", fontSize: 30, fontWeight: "700", fontVariant: ["tabular-nums"] },
  tileUnit: { color: "#fff", fontSize: 12, opacity: 0.9 },
});
