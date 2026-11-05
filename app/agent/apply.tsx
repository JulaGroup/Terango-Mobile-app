import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { agentApi } from "@/lib/api";
import { KerSpace } from "@/constants/kerspace";

const K = KerSpace;

export default function AgentApply() {
  const router = useRouter();
  const [type, setType] = useState<"INDIVIDUAL" | "COMPANY">("INDIVIDUAL");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    fullName.trim() &&
    phone.trim() &&
    (type === "INDIVIDUAL" || companyName.trim());

  const submit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      await agentApi.apply({
        fullName: fullName.trim(),
        companyName: type === "COMPANY" ? companyName.trim() : undefined,
        type,
        phone: phone.trim(),
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        licenseNo: licenseNo.trim() || undefined,
      });
      Alert.alert(
        "Application submitted",
        "Thanks! TeranGO will review your application and get back to you.",
        [{ text: "OK", onPress: () => router.replace("/agent" as any) }],
      );
    } catch (e: any) {
      Alert.alert("Couldn't submit", e?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Become an agent</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.label}>I am a</Text>
          <View style={s.segment}>
            {(["INDIVIDUAL", "COMPANY"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.segBtn, type === t && s.segBtnOn]}
                onPress={() => setType(t)}
              >
                <Text style={[s.segText, type === t && s.segTextOn]}>
                  {t === "INDIVIDUAL" ? "Individual agent" : "Company"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field
            label={type === "COMPANY" ? "Contact name *" : "Full name *"}
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Muhammad Farhan"
          />
          {type === "COMPANY" && (
            <Field
              label="Company name *"
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="e.g. Farhan Realty"
            />
          )}
          <Field
            label="Phone *"
            value={phone}
            onChangeText={setPhone}
            placeholder="3xxxxxx"
            keyboardType="phone-pad"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="City / area"
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Fajara"
          />
          <Field
            label="License / registration no."
            value={licenseNo}
            onChangeText={setLicenseNo}
            placeholder="Optional"
          />

          <TouchableOpacity
            style={[s.submit, !canSubmit && s.submitOff]}
            onPress={submit}
            disabled={!canSubmit || submitting}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.submitText}>Submit application</Text>
            )}
          </TouchableOpacity>
          <Text style={s.disclaimer}>
            TeranGO reviews every application to keep KërSpace trusted.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        placeholderTextColor={K.inkLight}
        {...props}
      />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: K.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: K.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  label: { fontSize: 13, fontWeight: "700", color: K.inkMid, marginBottom: 6 },
  input: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: K.ink,
  },
  segment: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: K.border,
    backgroundColor: K.card,
    alignItems: "center",
  },
  segBtnOn: { backgroundColor: K.primaryLight, borderColor: K.primary },
  segText: { fontSize: 14, fontWeight: "700", color: K.inkMid },
  segTextOn: { color: K.primary },
  submit: {
    backgroundColor: K.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitOff: { backgroundColor: "#C7C9D9" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  disclaimer: {
    fontSize: 12,
    color: K.inkLight,
    textAlign: "center",
    marginTop: 12,
  },
});
