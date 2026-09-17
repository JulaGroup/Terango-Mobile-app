/**
 * KërSpace — Book Viewing Appointment Screen
 */
import React, { useEffect, useState } from "react";
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

const TIME_SLOTS = [
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
];

// Generated once at module load — stable values, no per-render millisecond drift
const getDates = () => {
  const dates: { label: string; value: string; dayLabel: string }[] = [];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    // Use YYYY-MM-DD as value — no milliseconds, stable across renders
    const pad = (n: number) => String(n).padStart(2, "0");
    const value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    dates.push({
      dayLabel: days[d.getDay()],
      label: `${d.getDate()} ${months[d.getMonth()]}`,
      value,
    });
  }
  return dates;
};

const DATES = getDates();

export default function AppointmentScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const router = useRouter();
  const dates = DATES;

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    notes: "",
    preferredDate: dates[0].value,
    preferredTime: TIME_SLOTS[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyBooked, setAlreadyBooked] = useState(false);

  // Check if user already booked this property
  useEffect(() => {
    if (!id) return;
    AsyncStorage.getItem(`booked_appointment_${id}`).then((val) => {
      if (val) setAlreadyBooked(true);
    });
  }, [id]);

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
        `${API_URL}/api/kerspace/properties/${id}/appointment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if (!res.ok) throw new Error();
      // Persist booking so user can't double-book
      await AsyncStorage.setItem(
        `booked_appointment_${id}`,
        form.preferredDate,
      );
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to book appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (alreadyBooked && !success) {
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
          <Ionicons name="checkmark-circle" size={44} color={ORANGE} />
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
          Already Requested
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#777",
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 8,
          }}
        >
          You've already submitted a viewing request for
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: DARK,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: "#999",
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          A Terango agent will be in touch shortly to confirm your appointment.
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
          <Ionicons name="checkmark-circle" size={44} color={ORANGE} />
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
          Viewing Booked!
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#777",
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 8,
          }}
        >
          Your viewing appointment has been submitted for
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: DARK,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          {title}
        </Text>
        <View
          style={{
            backgroundColor: "#FFF5EE",
            borderRadius: 16,
            padding: 16,
            width: "100%",
            marginBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <Ionicons name="calendar-outline" size={16} color={ORANGE} />
            <Text style={{ fontSize: 14, color: DARK, fontWeight: "600" }}>
              {new Date(form.preferredDate).toDateString()}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="time-outline" size={16} color={ORANGE} />
            <Text style={{ fontSize: 14, color: DARK, fontWeight: "600" }}>
              {form.preferredTime}
            </Text>
          </View>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: "#999",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          A Terango agent will confirm your appointment shortly.
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

  const selectedDateInfo =
    dates.find((d) => d.value === form.preferredDate) || dates[0];

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
              Book Viewing
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
          {/* Date picker */}
          <View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 12,
              }}
            >
              Select Date
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              nestedScrollEnabled={true}
            >
              {dates.map((d) => {
                const selected = form.preferredDate === d.value;
                return (
                  <TouchableOpacity
                    key={d.value}
                    onPress={() => set("preferredDate", d.value)}
                    style={{
                      width: 60,
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: "center",
                      backgroundColor: selected ? ORANGE : "#fff",
                      borderWidth: 2,
                      borderColor: selected ? ORANGE : "transparent",
                      shadowColor: "#000",
                      shadowOpacity: selected ? 0.15 : 0.04,
                      shadowRadius: 8,
                      elevation: selected ? 4 : 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: selected ? "rgba(255,255,255,0.8)" : "#999",
                      }}
                    >
                      {d.dayLabel}
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "800",
                        color: selected ? "#fff" : DARK,
                        marginTop: 4,
                      }}
                    >
                      {d.label.split(" ")[0]}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: selected ? "rgba(255,255,255,0.8)" : "#AAA",
                        marginTop: 2,
                      }}
                    >
                      {d.label.split(" ")[1]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Time slots */}
          <View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 12,
              }}
            >
              Select Time Slot
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {TIME_SLOTS.map((slot) => {
                const selected = form.preferredTime === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    onPress={() => set("preferredTime", slot)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: selected ? ORANGE : "#fff",
                      borderWidth: 2,
                      borderColor: selected ? ORANGE : "transparent",
                      shadowColor: "#000",
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      elevation: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: selected ? "#fff" : "#555",
                      }}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Selected summary */}
          <View
            style={{
              backgroundColor: "#FFF5EE",
              borderRadius: 14,
              padding: 14,
              flexDirection: "row",
              gap: 14,
              alignItems: "center",
            }}
          >
            <Ionicons name="calendar" size={24} color={ORANGE} />
            <View>
              <Text style={{ fontSize: 13, color: "#888" }}>
                Your appointment
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: DARK,
                  marginTop: 2,
                }}
              >
                {selectedDateInfo.dayLabel}, {selectedDateInfo.label}
              </Text>
              <Text style={{ fontSize: 13, color: ORANGE, fontWeight: "600" }}>
                {form.preferredTime}
              </Text>
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
                  style={[inputStyle, { height: 80, textAlignVertical: "top" }]}
                  placeholder="Any notes or specific requirements..."
                  placeholderTextColor="#BBB"
                  multiline
                  value={form.notes}
                  onChangeText={(v) => set("notes", v)}
                />
              </View>
            </View>
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
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <Text
                  style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}
                >
                  Confirm Booking
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
