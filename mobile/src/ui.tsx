import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { c } from "./theme";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function H({ children }: { children: React.ReactNode }) {
  return <Text style={s.h}>{children}</Text>;
}

export function Soft({ children }: { children: React.ReactNode }) {
  return <Text style={s.soft}>{children}</Text>;
}

export function Button({
  title, onPress, kind = "primary", busy, disabled,
}: { title: string; onPress: () => void; kind?: "primary" | "plain" | "danger"; busy?: boolean; disabled?: boolean }) {
  const bg = kind === "primary" ? c.accent : kind === "danger" ? c.high : "transparent";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }, kind === "plain" && s.plain]}
    >
      {busy ? <ActivityIndicator color={c.text} /> : <Text style={s.btnText}>{title}</Text>}
    </Pressable>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return children ? <Text style={s.err}>{children}</Text> : null;
}

const s = StyleSheet.create({
  card: { backgroundColor: c.card, borderRadius: 14, padding: 16, marginBottom: 12, gap: 8 },
  h: { color: c.text, fontSize: 18, fontWeight: "700" },
  soft: { color: c.soft, fontSize: 14 },
  btn: { borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16, alignItems: "center" },
  plain: { borderWidth: 1, borderColor: c.line },
  btnText: { color: c.text, fontSize: 16, fontWeight: "700" },
  err: { color: "#ff8a98", fontSize: 14 },
});
