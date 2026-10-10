import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { api, type PatientSummary } from "../api";
import { useLive } from "../store";
import { Button, ErrorText, Soft } from "../ui";
import { c } from "../theme";

export default function Patients({ onOpen, onSignOut, onAdd, onEpic }: { onOpen(id: number): void; onSignOut(): void; onAdd():void; onEpic():void }) {
  const live = useLive();
  const [search,setSearch]=useState("");
  const [list, setList] = useState<PatientSummary[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await api.patients());
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load patients.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.title}>Patients</Text>
        <Pressable onPress={onSignOut} accessibilityRole="button"><Text style={s.link}>Sign out</Text></Pressable>
      </View>
      {live.connection && live.patientId && (
        <Pressable style={s.banner} onPress={() => onOpen(live.patientId!)}>
          <Text style={s.bannerText}>{live.connection.name} is streaming. Tap to view.</Text>
        </Pressable>
      )}
      <View style={{flexDirection:"row",gap:8}}><View style={{flex:1}}><Button title="Onboard patient" onPress={onAdd}/></View><View style={{flex:1}}><Button title="Epic import" kind="plain" onPress={onEpic}/></View></View>
      <TextInput accessibilityLabel="Search patients" placeholder="Search name, MRN or email" placeholderTextColor={c.soft} value={search} onChangeText={setSearch} style={{backgroundColor:c.card,color:c.text,padding:12,borderRadius:10}}/>
      <ErrorText>{err}</ErrorText>
      <FlatList
        data={list.filter(p=>`${p.firstName} ${p.lastName} ${p.mrn??""} ${p.email??""}`.toLowerCase().includes(search.toLowerCase()))}
        keyExtractor={(p) => String(p.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.soft} />}
        ListEmptyComponent={!loading ? <Soft>No matching patients. Use Onboard patient to create a record.</Soft> : null}
        renderItem={({ item: p }) => (
          <Pressable style={s.row} onPress={() => onOpen(p.id)} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{p.firstName} {p.lastName}</Text>
              <Soft>{[p.mrn && `MRN ${p.mrn}`, p.sensorLocation, p.deviceId].filter(Boolean).join("  ·  ") || "No details"}</Soft>
            </View>
            {p.openAlerts > 0 && <Text style={s.badge}>{p.openAlerts}</Text>}
          </Pressable>
        )}
      />
      <Button title="Refresh" kind="plain" onPress={load} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: c.bg, gap: 10 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: c.text, fontSize: 26, fontWeight: "700" },
  link: { color: c.accent, fontSize: 16 },
  banner: { backgroundColor: c.accent, borderRadius: 10, padding: 12 },
  bannerText: { color: c.text, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: c.card, borderRadius: 12, padding: 14, marginBottom: 8 },
  name: { color: c.text, fontSize: 17, fontWeight: "700", marginBottom: 2 },
  badge: { backgroundColor: c.high, color: "#fff", fontWeight: "700", borderRadius: 12, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 3 },
});
