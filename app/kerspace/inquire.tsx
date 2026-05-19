/**
 * KërSpace — Express Interest (Inquiry) Screen
 */
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_URL } from "@/constants/config";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ORANGE = "#ff6b00";
const DARK = "#1a1a1a";

const INQUIRY_TYPES = [
  { key: "GENERAL", label: "General Inquiry", icon: "chatbubble-outline" },
  { key: "VIEWING", label: "Request Viewing", icon: "eye-outline" },
  { key: "OFFER", label: "Make an Offer", icon: "pricetag-outline" },
];

export default function InquireScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    message: "",
    inquiryType: "GENERAL",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.fullName.trim() || !form.phone.trim()) {
      Alert.alert("Required", "Please fill in your name and phone number.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/kerspace/properties/${id}/inquire`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if (!res.ok) throw new Error();
      await AsyncStorage.setItem(`kerspace_inquired_${id}`, "1");
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to send your inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#fff",
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "#FFF5EE",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Ionicons name="checkmark-circle" size={48} color={ORANGE} />
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: DARK,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          Inquiry Sent!
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#777",
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 32,
          }}
        >
          A Terango KërSpace agent will contact you shortly about{"\n"}
          <Text style={{ fontWeight: "700", color: DARK }}>{title}</Text>
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: ORANGE,
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 14,
            width: "100%",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
            Back to Property
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F7F4F0" }}
      edges={["top"]}
    >
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: "#fff",
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(0,0,0,0.06)",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 4 }}
          >
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: DARK }}>
              Express Interest
            </Text>
            <Text style={{ fontSize: 12, color: "#888" }} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, gap: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Inquiry type selector */}
          <View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              What are you enquiring about?
            </Text>
            <View style={{ gap: 8 }}>
              {INQUIRY_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => set("inquiryType", t.key)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: "#fff",
                    borderWidth: 2,
                    borderColor:
                      form.inquiryType === t.key ? ORANGE : "transparent",
                    shadowColor: "#000",
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor:
                        form.inquiryType === t.key ? "#FFF5EE" : "#F5F5F5",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name={t.icon as any}
                      size={20}
                      color={form.inquiryType === t.key ? ORANGE : "#999"}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: form.inquiryType === t.key ? DARK : "#666",
                    }}
                  >
                    {t.label}
                  </Text>
                  {form.inquiryType === t.key && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={ORANGE}
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Contact details */}
          <View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              Your Details
            </Text>
            <View style={{ gap: 10 }}>
              <View style={inputContainer}>
                <Ionicons name="person-outline" size={18} color="#CCC" />
                <TextInput
                  style={inputStyle}
                  placeholder="Full name *"
                  placeholderTextColor="#BBB"
                  value={form.fullName}
                  onChangeText={(v) => set("fullName", v)}
                />
              </View>
              <View style={inputContainer}>
                <Ionicons name="call-outline" size={18} color="#CCC" />
                <TextInput
                  style={inputStyle}
                  placeholder="Phone number *"
                  placeholderTextColor="#BBB"
                  keyboardType="phone-pad"
                  value={form.phone}
                  onChangeText={(v) => set("phone", v)}
                />
              </View>
              <View style={inputContainer}>
                <Ionicons name="mail-outline" size={18} color="#CCC" />
                <TextInput
                  style={inputStyle}
                  placeholder="Email (optional)"
                  placeholderTextColor="#BBB"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(v) => set("email", v)}
                />
              </View>
              <View
                style={[
                  inputContainer,
                  {
                    alignItems: "flex-start",
                    paddingTop: 12,
                    paddingBottom: 12,
                  },
                ]}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={18}
                  color="#CCC"
                  style={{ marginTop: 2 }}
                />
                <TextInput
                  style={[inputStyle, { height: 90, textAlignVertical: "top" }]}
                  placeholder="Your message (optional)..."
                  placeholderTextColor="#BBB"
                  multiline
                  value={form.message}
                  onChangeText={(v) => set("message", v)}
                />
              </View>
            </View>
          </View>

          {/* Note */}
          <View
            style={{
              backgroundColor: "#FFF5EE",
              borderRadius: 14,
              padding: 14,
              flexDirection: "row",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <Ionicons
              name="information-circle"
              size={18}
              color={ORANGE}
              style={{ marginTop: 1 }}
            />
            <Text
              style={{ fontSize: 12, color: "#666", flex: 1, lineHeight: 18 }}
            >
              A Terango KërSpace agent will contact you to assist with this
              property. We act as the agent to protect both buyer and seller.
            </Text>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Submit button */}
        <View
          style={{
            padding: 16,
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "rgba(0,0,0,0.06)",
          }}
        >
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              backgroundColor: ORANGE,
              height: 54,
              borderRadius: 16,
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "row",
              gap: 8,
              opacity: submitting ? 0.7 : 1,
              shadowColor: ORANGE,
              shadowOpacity: 0.4,
              shadowRadius: 10,
              elevation: 5,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text
                  style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}
                >
                  Send Inquiry
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const inputContainer: any = {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  backgroundColor: "#fff",
  borderRadius: 14,
  paddingHorizontal: 14,
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 6,
  elevation: 2,
};
const inputStyle: any = {
  flex: 1,
  height: 48,
  fontSize: 14,
  color: "#1a1a1a",
};
