import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { vendorApi, VendorShift } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";
import TimePickerInput from "@/components/common/TimePickerInput";

// Format an "HH:MM" 24h string to 12h for display.
function to12h(hm: string): string {
  if (!hm) return "";
  const [h, m] = hm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m).padStart(2, "0")} ${period}`;
}

export default function VendorShiftsScreen() {
  const router = useRouter();
  const [shifts, setShifts] = useState<VendorShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await vendorApi.getShifts();
      setShifts(data);
    } catch (err) {
      console.warn("Failed to load shifts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const resetForm = () => {
    setName("");
    setStartTime("");
    setEndTime("");
    setEditingId(null);
  };

  const onEdit = (shift: VendorShift) => {
    setEditingId(shift.id);
    setName(shift.name);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
  };

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert("Missing name", "Give the shift a name (e.g. Morning).");
      return;
    }
    if (!startTime || !endTime) {
      Alert.alert("Missing times", "Set both a start and end time.");
      return;
    }
    if (startTime === endTime) {
      Alert.alert("Invalid times", "Start and end time can't be the same.");
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await vendorApi.updateShift(editingId, {
          name: name.trim(),
          startTime,
          endTime,
        });
      } else {
        await vendorApi.createShift({ name: name.trim(), startTime, endTime });
      }
      resetForm();
      await load();
    } catch (err: any) {
      Alert.alert(
        "Couldn't save shift",
        err?.message?.replace(/^API Error: \d+ - /, "") ||
          "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (shift: VendorShift) => {
    Alert.alert(
      "Delete shift",
      `Remove the "${shift.name}" shift?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await vendorApi.deleteShift(shift.id);
              if (editingId === shift.id) resetForm();
              await load();
            } catch (err: any) {
              Alert.alert("Couldn't delete", err?.message || "Try again.");
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      <LinearGradient colors={["#1A1A1A", "#2D2D2D"]} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Shifts</Text>
          <Text style={styles.headerSubtitle}>
            Set the shift times your cashiers work
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Add / edit form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingId ? "Edit shift" : "Add a shift"}
          </Text>

          <Text style={styles.label}>Shift name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Morning"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            maxLength={40}
          />

          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <Text style={styles.label}>Starts</Text>
              <TimePickerInput
                value={startTime}
                onChange={setStartTime}
                placeholder="Start"
              />
            </View>
            <View style={styles.timeCol}>
              <Text style={styles.label}>Ends</Text>
              <TimePickerInput
                value={endTime}
                onChange={setEndTime}
                placeholder="End"
              />
            </View>
          </View>

          <View style={styles.formActions}>
            {editingId && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={resetForm}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editingId ? "Save changes" : "Add shift"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Existing shifts */}
        <Text style={styles.sectionTitle}>Your shifts</Text>
        {loading ? (
          <ActivityIndicator
            color={PrimaryColor}
            style={{ marginTop: 24 }}
          />
        ) : shifts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="time-outline" size={28} color="#CCC" />
            <Text style={styles.emptyText}>
              No shifts yet. Add one above to start tracking each shift.
            </Text>
          </View>
        ) : (
          shifts.map((shift) => (
            <View key={shift.id} style={styles.shiftRow}>
              <View style={styles.shiftInfo}>
                <Text style={styles.shiftRowName}>{shift.name}</Text>
                <Text style={styles.shiftRowTime}>
                  {to12h(shift.startTime)} – {to12h(shift.endTime)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => onEdit(shift)}
              >
                <Ionicons name="create-outline" size={20} color={PrimaryColor} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => onDelete(shift)}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "white" },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  scroll: { flex: 1 },
  formCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1F2937",
  },
  timeRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  timeCol: { flex: 1 },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PrimaryColor,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
  },
  shiftRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  shiftInfo: { flex: 1 },
  shiftRowName: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  shiftRowTime: { fontSize: 13, color: "#888", marginTop: 2 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
});
