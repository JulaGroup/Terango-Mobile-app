import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Feather } from "@expo/vector-icons";
import { Order, orderApi } from "../lib/api";

interface QRCodeDisplayProps {
  order: Order;
  showFullDetails?: boolean;
  onQRGenerated?: (qrData: string) => void;
  containerStyle?: any;
  size?: string;
  showActions?: boolean;
}

interface QRCodeData {
  qrCode: string;
  qrCodeUrl: string;
  verificationData: {
    orderId: string;
    orderType: string;
    senderInfo: { name: string; phone: string };
    receiverInfo: { name: string; phone: string };
    deliveryType: string;
    timestamp: string;
  };
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  order,
  showFullDetails = true,
  onQRGenerated,
  containerStyle,
}) => {
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQRCode = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      let response;

      // Use Express QR generation if it's an Express order
      if (order.deliveryType === "EXPRESS") {
        response = await orderApi.generateExpressQR(order.id, {
          includeTimestamp: true,
          includeLocationData: true,
        });

        // Transform Express response to match expected structure
        setQrData({
          qrCode: response.qrCode,
          qrCodeUrl: response.qrCodeUrl,
          verificationData: {
            orderId: order.id,
            orderType: order.orderType || "DELIVERY",
            senderInfo: {
              name: order.senderName || order.customerName,
              phone: order.senderPhone || order.customerPhone,
            },
            receiverInfo: {
              name: order.receiverName || order.customerName,
              phone: order.receiverPhone || order.customerPhone,
            },
            deliveryType: order.deliveryMethod || "DELIVERY_TO_USER",
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        response = await orderApi.getOrderQRCode(order.id);
        setQrData(response);
      }

      if (onQRGenerated) {
        onQRGenerated(response.qrCode);
      }
    } catch (err: any) {
      console.error("Failed to generate QR code:", err);
      setError(err.message || "Failed to generate QR code");
      Alert.alert("Error", "Failed to generate QR code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const printQRCode = async () => {
    if (!qrData) return;

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                text-align: center;
                max-width: 400px;
                margin: 0 auto;
              }
              .header {
                background: #FF6B35;
                color: white;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
              }
              .qr-container {
                border: 2px dashed #ccc;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
              }
              .qr-image {
                max-width: 200px;
                height: auto;
              }
              .instructions {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
                text-align: left;
              }
              .verification-info {
                background: #e3f2fd;
                padding: 10px;
                border-radius: 6px;
                margin: 10px 0;
                font-size: 12px;
                text-align: left;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Terango ${order.deliveryType === "EXPRESS" ? "Express" : ""} Delivery</h2>
              <p>Order ID: ${order.id}</p>
            </div>
            
            <div class="qr-container">
              <img src="${qrData.qrCodeUrl}" class="qr-image" alt="QR Code" />
              <h3>Show this QR code to your driver</h3>
            </div>
            
            <div class="verification-info">
              <strong>Verification Details:</strong><br/>
              Order Type: ${qrData.verificationData.orderType}<br/>
              From: ${qrData.verificationData.senderInfo.name} (${qrData.verificationData.senderInfo.phone})<br/>
              To: ${qrData.verificationData.receiverInfo.name} (${qrData.verificationData.receiverInfo.phone})<br/>
              ${order.deliveryType === "EXPRESS" ? "<strong>EXPRESS DELIVERY</strong>" : ""}
            </div>
            
            <div class="instructions">
              <h4>Instructions:</h4>
              <ul>
                <li>Present this QR code to the driver for verification</li>
                <li>Driver will scan the code to confirm delivery details</li>
                <li>If QR cannot be scanned, driver will call operations for confirmation</li>
                ${
                  order.deliveryType === "EXPRESS"
                    ? "<li><strong>Express Delivery:</strong> Estimated delivery in " +
                      (order.expressDeliveryTime || 30) +
                      " minutes</li>"
                    : ""
                }
              </ul>
            </div>
            
            <p style="font-size: 10px; color: #666; margin-top: 30px;">
              Generated: ${new Date().toLocaleString()}<br/>
              Terango Delivery Service
            </p>
          </body>
        </html>
      `;

      await Print.printAsync({
        html: htmlContent,
        width: 576,
        height: 792,
      });
    } catch (err) {
      console.error("Print error:", err);
      Alert.alert("Error", "Failed to print QR code");
    }
  };

  const shareQRCode = async () => {
    if (!qrData) return;

    try {
      const message = `Terango ${order.deliveryType === "EXPRESS" ? "Express " : ""}Delivery - Order ${order.id}\n\nShow this QR code to your driver:\n\nFrom: ${qrData.verificationData.senderInfo.name}\nTo: ${qrData.verificationData.receiverInfo.name}\n\nGenerated: ${new Date().toLocaleString()}`;

      if (Platform.OS === "ios") {
        await Share.share({
          message,
          url: qrData.qrCodeUrl,
        });
      } else {
        const fileSystemModule: any = FileSystem;

        // Save QR code image to cache and share
        const fileUri = `${fileSystemModule.cacheDirectory}qr_${order.id}.png`;
        const base64Data = qrData.qrCodeUrl.split(",")[1];

        await fileSystemModule.writeAsStringAsync(fileUri, base64Data, {
          encoding: fileSystemModule.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            dialogTitle: "Share QR Code",
            mimeType: "image/png",
          });
        } else {
          await Share.share({ message });
        }
      }
    } catch (err) {
      console.error("Share error:", err);
      Alert.alert("Error", "Failed to share QR code");
    }
  };

  useEffect(() => {
    if (order.qrCodeUrl && order.qrCode) {
      // Use existing QR code if available
      setQrData({
        qrCode: order.qrCode,
        qrCodeUrl: order.qrCodeUrl,
        verificationData: {
          orderId: order.id,
          orderType: order.orderType || "DELIVERY",
          senderInfo: {
            name: order.senderName || order.customerName,
            phone: order.senderPhone || order.customerPhone,
          },
          receiverInfo: {
            name: order.receiverName || order.customerName,
            phone: order.receiverPhone || order.customerPhone,
          },
          deliveryType: order.deliveryMethod || "DELIVERY_TO_USER",
          timestamp: order.createdAt,
        },
      });
      if (onQRGenerated) {
        onQRGenerated(order.qrCode);
      }
    }
  }, [order]);

  const isExpressOrder = order.deliveryType === "EXPRESS";

  return (
    <View style={[styles.container, containerStyle] as any}>
      {/* Header */}
      <View
        style={[styles.header, isExpressOrder && styles.expressHeader] as any}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {isExpressOrder ? "⚡ Express Delivery" : "📦 Delivery"} QR Code
          </Text>
          <Text style={styles.headerSubtitle}>Order #{order.id}</Text>
        </View>
        {isExpressOrder && (
          <View style={styles.expressBadge}>
            <Text style={styles.expressBadgeText}>
              ETA: {order.expressDeliveryTime || 30}min
            </Text>
          </View>
        )}
      </View>

      {/* QR Code Display */}
      {qrData ? (
        <View style={styles.qrContainer}>
          <Image
            source={{ uri: qrData.qrCodeUrl }}
            style={styles.qrImage}
            contentFit="contain"
          />
          <Text style={styles.qrInstruction}>
            Show this code to your driver
          </Text>

          {showFullDetails && (
            <View style={styles.verificationDetails}>
              <Text style={styles.verificationTitle}>Verification Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>From:</Text>
                <Text style={styles.detailValue}>
                  {qrData.verificationData.senderInfo.name} (
                  {qrData.verificationData.senderInfo.phone})
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>To:</Text>
                <Text style={styles.detailValue}>
                  {qrData.verificationData.receiverInfo.name} (
                  {qrData.verificationData.receiverInfo.phone})
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>
                  {qrData.verificationData.orderType}
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={shareQRCode}>
              <Feather name="share" size={16} color="#FF6B35" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={printQRCode}>
              <Feather name="printer" size={16} color="#FF6B35" />
              <Text style={styles.actionButtonText}>Print</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={generateQRCode}
            >
              <Feather name="refresh-cw" size={16} color="#FF6B35" />
              <Text style={styles.actionButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.generateContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.loadingText}>Generating QR Code...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateQRCode}
            >
              <Feather name="qr-code" size={24} color="white" />
              <Text style={styles.generateButtonText}>Generate QR Code</Text>
            </TouchableOpacity>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📱 How to use:</Text>
        <Text style={styles.instructionText}>
          • Present this QR code to your delivery driver{"\n"}• Driver will scan
          to verify order details{"\n"}• If scanning fails, driver will call
          operations{"\n"}
          {isExpressOrder
            ? "• Express orders have priority verification\n"
            : ""}
          • Keep this code until delivery is complete
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#FF6B35",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expressHeader: {
    background: "linear-gradient(45deg, #FF6B35, #F7931E)",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "white",
    fontSize: 14,
    opacity: 0.9,
    marginTop: 2,
  },
  expressBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expressBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  qrContainer: {
    alignItems: "center",
    padding: 20,
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  qrInstruction: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  verificationDetails: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
    width: "100%",
    marginBottom: 16,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    width: 40,
  },
  detailValue: {
    fontSize: 12,
    color: "#333",
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    minWidth: 80,
    justifyContent: "center",
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#FF6B35",
    fontWeight: "600",
  },
  generateContainer: {
    alignItems: "center",
    padding: 40,
  },
  loadingContainer: {
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  generateButton: {
    backgroundColor: "#FF6B35",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  errorText: {
    color: "#dc3545",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  instructions: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
}) as Record<string, any>;
