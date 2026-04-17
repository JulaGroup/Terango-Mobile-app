import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Animated,
  ActivityIndicator,
} from "react-native";
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Order, orderApi } from "../lib/api";
import {
  ExpressBadge,
  getExpressPriority,
  isExpressEligible,
} from "./ExpressBadge";

interface DriverVerificationProps {
  order: Order;
  driverInfo: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
  };
  onVerificationComplete: (result: VerificationResult) => void;
  onRequestAdminConfirmation: () => void;
}

interface VerificationResult {
  success: boolean;
  method: "QR_SCAN" | "ADMIN_CONFIRMATION" | "MANUAL_VERIFICATION";
  timestamp: string;
  notes?: string;
}

export const DriverVerificationScreen: React.FC<DriverVerificationProps> = ({
  order,
  driverInfo,
  onVerificationComplete,
  onRequestAdminConfirmation,
}) => {
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const hasPermission = permission?.granted ?? null;
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState<
    "overview" | "scanning" | "calling" | "completed"
  >("overview");

  // Animation values
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (permission?.granted === false) {
      requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  const startScanLineAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const stopScanLineAnimation = () => {
    scanLineAnim.stopAnimation();
    scanLineAnim.setValue(0);
  };

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);
    stopScanLineAnimation();

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await orderApi.driverScanQR(data, driverInfo.id);

      if (response.success) {
        // Success animation
        Animated.spring(successAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );

        setTimeout(() => {
          onVerificationComplete({
            success: true,
            method: "QR_SCAN",
            timestamp: new Date().toISOString(),
          });
        }, 1500);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Verification Failed",
          response.message ||
            "Invalid QR code. Please try again or contact operations.",
          [
            {
              text: "Try Again",
              onPress: () => {
                setScanned(false);
                setLoading(false);
              },
            },
            {
              text: "Contact Operations",
              onPress: handleRequestAdminConfirmation,
            },
          ],
        );
      }
    } catch (error) {
      console.error("QR Scan Error:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Scan Error",
        "Failed to verify QR code. Please try again or contact operations.",
        [
          {
            text: "Try Again",
            onPress: () => {
              setScanned(false);
              setLoading(false);
            },
          },
          {
            text: "Contact Operations",
            onPress: handleRequestAdminConfirmation,
          },
        ],
      );
    }
  };

  const handleRequestAdminConfirmation = () => {
    setShowScanner(false);
    setVerificationStep("calling");
    onRequestAdminConfirmation();
  };

  const callContact = async (name: string, phone: string) => {
    try {
      const phoneNumber = phone.replace(/[^\d+]/g, "");
      const url = `tel:${phoneNumber}`;

      const canCall = await Linking.canOpenURL(url);
      if (canCall) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot make phone calls on this device");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to make phone call");
    }
  };

  const sendSMS = async (name: string, phone: string) => {
    try {
      const phoneNumber = phone.replace(/[^\d+]/g, "");
      const message = `Hello ${name}, your Terango delivery driver is here for order ${order.id}. Please come to confirm the delivery.`;
      const url = Platform.select({
        ios: `sms:${phoneNumber}&body=${encodeURIComponent(message)}`,
        android: `sms:${phoneNumber}?body=${encodeURIComponent(message)}`,
      });

      if (url) {
        const canSendSMS = await Linking.canOpenURL(url);
        if (canSendSMS) {
          await Linking.openURL(url);
        } else {
          Alert.alert("Error", "Cannot send SMS on this device");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send SMS");
    }
  };

  const renderScannerOverlay = () => {
    const scanLinePosition = scanLineAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 200],
    });

    return (
      <View style={styles.scannerOverlay}>
        <View style={styles.scannerFrame}>
          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY: scanLinePosition }] },
            ]}
          />
        </View>
        <Text style={styles.scannerInstructions}>
          Position the QR code within the frame
        </Text>

        {loading && (
          <View style={styles.scannerLoading}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.scannerLoadingText}>Verifying...</Text>
          </View>
        )}

        <Animated.View
          style={[
            styles.successOverlay,
            {
              opacity: successAnim,
              transform: [{ scale: successAnim }],
            },
          ]}
        >
          <Feather name="check-circle" size={60} color="#28a745" />
          <Text style={styles.successText}>Verified!</Text>
        </Animated.View>
      </View>
    );
  };

  const renderOrderSummary = () => (
    <View style={styles.orderSummaryCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle}>Order #{order.id}</Text>
        {isExpressEligible(order) && (
          <ExpressBadge
            variant="compact"
            priority={getExpressPriority(order)}
            estimatedTime={order.expressDeliveryTime}
          />
        )}
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.orderDetailLabel}>Type:</Text>
        <Text style={styles.orderDetailValue}>
          {order.orderType || "DELIVERY"}
        </Text>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.orderDetailLabel}>Status:</Text>
        <Text style={[styles.orderDetailValue, styles.statusText]}>
          {order.status}
        </Text>
      </View>

      {order.notes && (
        <View style={styles.orderNotes}>
          <Text style={styles.orderNotesLabel}>Notes:</Text>
          <Text style={styles.orderNotesText}>{order.notes}</Text>
        </View>
      )}
    </View>
  );

  const renderContactCard = (
    title: string,
    name: string,
    phone: string,
    address?: string,
    icon: keyof typeof Feather.glyphMap = "user",
  ) => (
    <View style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <Feather name={icon} size={20} color="#FF6B35" />
        <Text style={styles.contactTitle}>{title}</Text>
      </View>

      <Text style={styles.contactName}>{name || "Not provided"}</Text>
      <Text style={styles.contactPhone}>{phone || "Not provided"}</Text>
      {address && <Text style={styles.contactAddress}>{address}</Text>}

      {name && phone && (
        <View style={styles.contactActions}>
          <TouchableOpacity
            style={styles.contactActionButton}
            onPress={() => callContact(name, phone)}
          >
            <Feather name="phone" size={16} color="#28a745" />
            <Text style={styles.contactActionText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactActionButton}
            onPress={() => sendSMS(name, phone)}
          >
            <Feather name="message-circle" size={16} color="#007bff" />
            <Text style={styles.contactActionText}>SMS</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderVerificationMethods = () => (
    <View style={styles.verificationMethods}>
      <Text style={styles.sectionTitle}>Verification Options</Text>

      <TouchableOpacity
        style={[styles.verificationButton, styles.primaryButton]}
        onPress={() => {
          setShowScanner(true);
          setVerificationStep("scanning");
          startScanLineAnimation();
        }}
        disabled={hasPermission === false}
      >
        <LinearGradient
          colors={["#FF6B35", "#E55B2B"]}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Feather name="camera" size={20} color="white" />
          <Text style={styles.buttonText}>Scan QR Code</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.verificationButton, styles.secondaryButton]}
        onPress={handleRequestAdminConfirmation}
      >
        <Feather name="phone-call" size={18} color="#FF6B35" />
        <Text style={styles.secondaryButtonText}>Contact Operations</Text>
      </TouchableOpacity>

      {hasPermission === false && (
        <Text style={styles.permissionWarning}>
          Camera permission required for QR scanning
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {showScanner ? (
        <View style={styles.scannerContainer}>
          <CameraView
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={styles.scanner}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          {renderScannerOverlay()}

          <TouchableOpacity
            style={styles.closeScannerButton}
            onPress={() => {
              setShowScanner(false);
              setVerificationStep("overview");
              stopScanLineAnimation();
            }}
          >
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Delivery Verification</Text>
            <Text style={styles.headerSubtitle}>
              Verify delivery details and confirm with customer
            </Text>
          </View>

          {renderOrderSummary()}

          {renderContactCard(
            "Sender (Pickup)",
            order.senderName || order.customerName,
            order.senderPhone || order.customerPhone,
            order.deliveryAddress,
            "map-pin",
          )}

          {renderContactCard(
            "Receiver (Delivery)",
            order.receiverName || order.customerName,
            order.receiverPhone || order.customerPhone,
            order.receiverAddress || order.deliveryAddress,
            "navigation",
          )}

          {verificationStep === "overview" && renderVerificationMethods()}

          {verificationStep === "calling" && (
            <View style={styles.callingState}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.callingText}>
                Contacting operations for manual verification...
              </Text>
              <Text style={styles.callingSubtext}>
                Please wait while we confirm the delivery
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: "white",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },

  // Order Summary Styles
  orderSummaryCard: {
    backgroundColor: "white",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  orderDetails: {
    flexDirection: "row",
    marginBottom: 8,
  },
  orderDetailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    width: 60,
  },
  orderDetailValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  statusText: {
    fontWeight: "bold",
    color: "#FF6B35",
  },
  orderNotes: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  orderNotesLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 4,
  },
  orderNotesText: {
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
  },

  // Contact Card Styles
  contactCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: "#007bff",
    marginBottom: 4,
  },
  contactAddress: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 8,
  },
  contactActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  contactActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e9ecef",
    gap: 6,
  },
  contactActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },

  // Verification Methods Styles
  verificationMethods: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  verificationButton: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  primaryButton: {
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  secondaryButton: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#FF6B35",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButtonText: {
    color: "#FF6B35",
    fontSize: 16,
    fontWeight: "bold",
  },
  permissionWarning: {
    fontSize: 12,
    color: "#dc3545",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },

  // Scanner Styles
  scannerContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  scanner: {
    flex: 1,
  },
  scannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#FF6B35",
    borderRadius: 12,
    position: "relative",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#FF6B35",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  scannerInstructions: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 40,
  },
  scannerLoading: {
    position: "absolute",
    alignItems: "center",
    gap: 12,
  },
  scannerLoadingText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  successOverlay: {
    position: "absolute",
    alignItems: "center",
    gap: 12,
  },
  successText: {
    color: "#28a745",
    fontSize: 18,
    fontWeight: "bold",
  },
  closeScannerButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  // Calling State Styles
  callingState: {
    alignItems: "center",
    padding: 40,
    margin: 16,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  callingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    textAlign: "center",
  },
  callingSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
});

export default DriverVerificationScreen;
