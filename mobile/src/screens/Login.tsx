import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { signIn } from "../api";
import { Button, ErrorText, Soft } from "../ui";
import { c } from "../theme";

export default function Login({ initialServer, initialEmail, onDone }: { initialServer: string; initialEmail: string; onDone(): void | Promise<void> }) {
  const [server, setServer] = useState(initialServer || "https://");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      await signIn(server, email, password);
      await onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.wrap}>
      <View style={s.form}>
        <Text style={s.title}>CastLiner</Text>
        <Soft>Sign in with your clinician or invited patient account.</Soft>
        <TextInput style={s.input} value={server} onChangeText={setServer} placeholder="Server address" placeholderTextColor={c.soft} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={c.soft} autoCapitalize="none" keyboardType="email-address" textContentType="username" />
        <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={c.soft} secureTextEntry textContentType="password" onSubmitEditing={submit} />
        <ErrorText>{err}</ErrorText>
        <Button title="Sign in" onPress={submit} busy={busy} disabled={!email || !password} />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: c.bg },
  form: { gap: 12 },
  title: { color: c.text, fontSize: 30, fontWeight: "700" },
  input: { backgroundColor: c.card, color: c.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, borderWidth: 1, borderColor: c.line },
});
