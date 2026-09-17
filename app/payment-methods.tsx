import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SecureStorage } from "@/utils/secureStorage";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  isCompleteLocal,
  newNumberHint,
  sanitizeGambiaInput,
  toLocalDigits,
} from "@/utils/phone";

interface PaymentMethods {
  wave?: string;
  afrimoney?: string;
  qmoney?: string;
}

interface PaymentData {
  default: string;
  methods: PaymentMethods;
}

export default function PaymentMethodsPage() {
  const [paymentData, setPaymentData] = useState<PaymentData>({
    default: "wave",
    methods: {},
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const stored = await SecureStorage.getItem("paymentMethods");
      if (stored) {
        const data: PaymentData = JSON.parse(stored);
        // A Wave number saved before PURA's 9-digit migration is upgraded in
        // place (7123456 → 877123456) — old numbers stop working 1 Dec 2026.
        const wave = data.methods?.wave;
        if (wave && isCompleteLocal(wave) && toLocalDigits(wave) !== wave) {
          data.methods.wave = toLocalDigits(wave);
          await SecureStorage.setItem("paymentMethods", JSON.stringify(data));
        }
        setPaymentData(data);
      }
    } catch (e) {
      console.log("Failed to load payment methods:", e);
    }
  };

  const savePaymentMethods = async () => {
    const wave = paymentData.methods.wave;
    if (wave && !isCompleteLocal(wave)) {
      Alert.alert(
        "Invalid Wave number",
        "Please enter your 9-digit Wave phone number.",
      );
      return;
    }
    setLoading(true);
    try {
      // Always stored in 9-digit form, even if an old number was typed
      const toSave: PaymentData = wave
        ? {
            ...paymentData,
            methods: { ...paymentData.methods, wave: toLocalDigits(wave) },
          }
        : paymentData;
      await SecureStorage.setItem("paymentMethods", JSON.stringify(toSave));
      Alert.alert("Success", "Payment methods saved!");
      router.back();
    } catch (e) {
      console.log("Failed to save payment methods:", e);
      Alert.alert("Error", "Failed to save. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateMethod = (provider: keyof PaymentMethods, value: string) => {
    // Wave: drop a pasted +220 / 220 country code, keep up to 9 digits
    let cleanedValue = value;
    if (provider === "wave") {
      const withoutCode = value.trim().startsWith("+220")
        ? value.trim().substring(4)
        : value.replace(/\D/g, "").length > 9 && value.replace(/\D/g, "").startsWith("220")
          ? value.replace(/\D/g, "").substring(3)
          : value;
      cleanedValue = sanitizeGambiaInput(withoutCode);
    }

    setPaymentData((prev) => ({
      ...prev,
      methods: { ...prev.methods, [provider]: cleanedValue },
    }));
  };

  const setDefault = (provider: string) => {
    setPaymentData((prev) => ({ ...prev, default: provider }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FF6B35" />
        </TouchableOpacity>
        <Text style={styles.title}>Payment Methods</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.subtitle}>Manage your mobile payment accounts</Text>

        {/* Wave */}
        <View style={styles.methodContainer}>
          <View style={styles.methodHeader}>
            <Text style={styles.methodTitle}>Wave</Text>
            <TouchableOpacity onPress={() => setDefault("wave")}>
              <Ionicons
                name={
                  paymentData.default === "wave"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={24}
                color="#FF6B35"
              />
            </TouchableOpacity>
          </View>
          <TextInput
            placeholder="Enter Wave phone number (e.g., 877012345)"
            value={paymentData.methods.wave || ""}
            onChangeText={(value) => updateMethod("wave", value)}
            style={styles.input}
            keyboardType="phone-pad"
          />
          {newNumberHint(paymentData.methods.wave) && (
            <Text style={styles.newNumberHint}>
              {newNumberHint(paymentData.methods.wave)} — it will be saved
              in this format.
            </Text>
          )}
        </View>

        {/* Afrimoney */}
        {/* <View style={styles.methodContainer}>
          <View style={styles.methodHeader}>
            <Text style={styles.methodTitle}>Afrimoney</Text>
            <TouchableOpacity onPress={() => setDefault("afrimoney")}>
              <Ionicons
                name={
                  paymentData.default === "afrimoney"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={24}
                color="#FF6B35"
              />
            </TouchableOpacity>
          </View>
          <TextInput
            placeholder="Enter Afrimoney phone number"
            value={paymentData.methods.afrimoney || ""}
            onChangeText={(value) => updateMethod("afrimoney", value)}
            style={styles.input}
            keyboardType="phone-pad"
          />
        </View> */}

        {/* QMoney */}
        {/* <View style={styles.methodContainer}>
          <View style={styles.methodHeader}>
            <Text style={styles.methodTitle}>QMoney</Text>
            <TouchableOpacity onPress={() => setDefault("qmoney")}>
              <Ionicons
                name={
                  paymentData.default === "qmoney"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={24}
                color="#FF6B35"
              />
            </TouchableOpacity>
          </View>
          <TextInput
            placeholder="Enter QMoney phone number"
            value={paymentData.methods.qmoney || ""}
            onChangeText={(value) => updateMethod("qmoney", value)}
            style={styles.input}
            keyboardType="phone-pad"
          />
        </View> */}

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabled]}
          onPress={savePaymentMethods}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Saving..." : "Save Payment Methods"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  content: { flex: 1, padding: 16 },
  subtitle: { fontSize: 16, color: "#6B7280", marginBottom: 24 },
  methodContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  methodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  methodTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  newNumberHint: {
    marginTop: 6,
    fontSize: 13,
    color: "#15803D",
  },
  saveButton: {
    backgroundColor: "#FF6B35",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
