import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  FlatList,
  Platform,
  StyleSheet,
} from "react-native";
import { useNotifications } from "@/context/NotificationContext";

const FixedNotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const [visible, setVisible] = useState(false);

  const open = () => setVisible(true);
  const close = () => setVisible(false);

  return (
    <>
      <TouchableOpacity onPress={open} activeOpacity={0.8} style={styles.bell}>
        <Ionicons name="notifications-outline" size={22} color="black" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={async () => {
                    await markAllAsRead();
                  }}
                  style={styles.markAllBtn}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
                  >
                    Mark All Read
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {notifications.length === 0 ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: "#888" }}>
                  No notifications yet
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 420 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={async () => {
                      if (!item.opened) await markAsRead(item.id);
                    }}
                    style={{
                      padding: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: "#f5f5f5",
                      backgroundColor: item.opened ? "#fff" : "#f9f9f9",
                    }}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "flex-start" }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: item.opened
                            ? "transparent"
                            : "#ff6b00",
                          marginTop: 6,
                          marginRight: 12,
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#333",
                            marginBottom: 4,
                          }}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: "#666",
                            lineHeight: 18,
                          }}
                        >
                          {item.body}
                        </Text>
                        <Text
                          style={{ fontSize: 11, color: "#999", marginTop: 6 }}
                        >
                          {item.sentAt
                            ? new Date(item.sentAt).toLocaleString()
                            : ""}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.closeBtn} onPress={close}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bell: {
    position: "absolute",
    top: Platform.OS === "android" ? 28 : 44,
    right: 14,
    backgroundColor: "#F4F4F4CE",
    padding: 10,
    borderRadius: 12,
    zIndex: 1200,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#ff6b00",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "flex-start",
    paddingTop: 80,
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: 600,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  markAllBtn: {
    backgroundColor: "#ff6b00",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modalFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    alignItems: "center",
  },
  closeBtn: {
    backgroundColor: "#ff6b00",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});

export default FixedNotificationBell;
