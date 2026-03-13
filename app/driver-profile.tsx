import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";

export default function DriverProfilePage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const driverName = params.driverName as string;
  const driverPhone = params.driverPhone as string;
  const driverImage = params.driverImage as string;
  const driverVehicleType = params.driverVehicleType as string;
  const driverVehicleNumber = params.driverVehicleNumber as string;
  const driverRatingRaw = params.driverRating as string | undefined;
  const orderStatus = params.orderStatus as string;

  // Parse rating if passed as JSON string
  let driverRating: { rating: number; review?: string } | null = null;
  if (driverRatingRaw) {
    try {
      driverRating = JSON.parse(driverRatingRaw);
    } catch {
      driverRating = null;
    }
  }

  const handleCall = () => {
    if (driverPhone) {
      Linking.openURL(`tel:${driverPhone}`).catch(() => {
        Alert.alert("Error", "Could not open phone dialer");
      });
    }
  };

  const handleSMS = () => {
    if (driverPhone) {
      Linking.openURL(`sms:${driverPhone}`).catch(() => {
        Alert.alert("Error", "Could not open messaging app");
      });
    }
  };

  const ratingLabel = (r: number) => {
    if (r === 1) return "Poor";
    if (r === 2) return "Fair";
    if (r === 3) return "Good";
    if (r === 4) return "Very Good";
    if (r === 5) return "Excellent";
    return "";
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Floating back button */}
      <TouchableOpacity
        style={styles.floatingBack}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={20} color="#111827" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.avatarContainer}>
            {driverImage ? (
              <Image
                source={{ uri: driverImage }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons
                  name="person-circle-outline"
                  size={80}
                  color={PrimaryColor}
                />
              </View>
            )}
            <View style={styles.onlineDot} />
          </View>

          <Text style={styles.driverName}>{driverName || "Driver"}</Text>

          <View style={styles.statusPill}>
            <Ionicons
              name={
                orderStatus === "DELIVERED" ? "checkmark-circle" : "car-outline"
              }
              size={14}
              color={orderStatus === "DELIVERED" ? "#059669" : PrimaryColor}
            />
            <Text
              style={[
                styles.statusPillText,
                {
                  color: orderStatus === "DELIVERED" ? "#059669" : PrimaryColor,
                },
              ]}
            >
              {orderStatus === "DELIVERED"
                ? "Delivery Completed"
                : "On the Way"}
            </Text>
          </View>

          {/* Action Buttons — only shown when order is not yet delivered */}
          {orderStatus !== "DELIVERED" && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleCall}
                activeOpacity={0.8}
              >
                <View
                  style={[styles.actionIconBg, { backgroundColor: "#E8F5E9" }]}
                >
                  <Ionicons name="call" size={22} color="#22C55E" />
                </View>
                <Text style={styles.actionBtnLabel}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleSMS}
                activeOpacity={0.8}
              >
                <View
                  style={[styles.actionIconBg, { backgroundColor: "#E3F2FD" }]}
                >
                  <Ionicons name="chatbubbles" size={22} color="#3B82F6" />
                </View>
                <Text style={styles.actionBtnLabel}>Message</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Driver Details</Text>

          <InfoRow
            icon="call-outline"
            label="Phone"
            value={driverPhone || "—"}
          />

          {driverVehicleType ? (
            <InfoRow
              icon="car-outline"
              label="Vehicle Type"
              value={driverVehicleType}
            />
          ) : null}

          {driverVehicleNumber ? (
            <InfoRow
              icon="barcode-outline"
              label="Vehicle Number"
              value={driverVehicleNumber}
            />
          ) : null}
        </View>

        {/* Rating Card — only shown if the customer has rated this driver */}
        {driverRating ? (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Your Rating</Text>
            <View style={styles.ratingRow}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={
                      star <= driverRating!.rating ? "star" : "star-outline"
                    }
                    size={28}
                    color={star <= driverRating!.rating ? "#F59E0B" : "#D1D5DB"}
                  />
                ))}
              </View>
              <Text style={styles.ratingLabel}>
                {driverRating.rating}/5 — {ratingLabel(driverRating.rating)}
              </Text>
            </View>
            {driverRating.review ? (
              <View style={styles.reviewBox}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={16}
                  color="#9CA3AF"
                />
                <Text style={styles.reviewText}>
                  &ldquo;{driverRating.review}&rdquo;
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon as any} size={16} color="#6B7280" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Floating back
  floatingBack: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 44,
    left: 16,
    zIndex: 10,
    backgroundColor: "#fff",
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },

  // Hero
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: PrimaryColor,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: PrimaryColor,
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
  },
  driverName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
    marginBottom: 24,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 24,
  },
  actionBtn: {
    alignItems: "center",
    gap: 8,
  },
  actionIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },

  // Info Card
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },

  // Rating
  ratingRow: {
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D97706",
  },
  reviewBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reviewText: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
    fontStyle: "italic",
    lineHeight: 20,
  },
});
