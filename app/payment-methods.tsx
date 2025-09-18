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
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

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
      const stored = await SecureStore.getItemAsync("paymentMethods");
      if (stored) {
        setPaymentData(JSON.parse(stored));
      }
    } catch (e) {
      console.log("Failed to load payment methods:", e);
    }
  };

  const savePaymentMethods = async () => {
    setLoading(true);
    try {
      await SecureStore.setItemAsync(
        "paymentMethods",
        JSON.stringify(paymentData)
      );
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
    setPaymentData((prev) => ({
      ...prev,
      methods: { ...prev.methods, [provider]: value },
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
            placeholder="Enter Wave phone number"
            value={paymentData.methods.wave || ""}
            onChangeText={(value) => updateMethod("wave", value)}
            style={styles.input}
            keyboardType="phone-pad"
          />
        </View>

        {/* Afrimoney */}
        <View style={styles.methodContainer}>
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
        </View>

        {/* QMoney */}
        <View style={styles.methodContainer}>
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
        </View>

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
