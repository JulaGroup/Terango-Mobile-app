import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";

interface TimePickerInputProps {
  value: string; // Time in HH:MM format
  onChange: (time: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function TimePickerInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Select time",
}: TimePickerInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date | null>(null);

  // Convert HH:MM string to Date object
  const timeToDate = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const date = new Date();
    date.setHours(hours || 0);
    date.setMinutes(minutes || 0);
    date.setSeconds(0);
    return date;
  };

  // Convert Date object to HH:MM string
  const dateToTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Format time for display (12-hour format with AM/PM)
  const formatDisplayTime = (timeString: string): string => {
    if (!timeString) return placeholder;
    const [hours, minutes] = timeString.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const handleOpenPicker = () => {
    if (disabled) return;
    setTempTime(value ? timeToDate(value) : new Date());
    setShowPicker(true);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempTime(selectedDate);
    }

    // On Android, the picker closes automatically when user selects
    if (Platform.OS === "android") {
      if (event.type === "set" && selectedDate) {
        const timeString = dateToTime(selectedDate);
        onChange(timeString);
      }
      setShowPicker(false);
    }
  };

  const handleConfirm = () => {
    if (tempTime) {
      const timeString = dateToTime(tempTime);
      onChange(timeString);
    }
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
    setTempTime(null);
  };

  const displayValue = value ? formatDisplayTime(value) : placeholder;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.input, disabled && styles.disabledInput]}
        onPress={handleOpenPicker}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name="time-outline"
          size={20}
          color={disabled ? "#9CA3AF" : PrimaryColor}
          style={styles.icon}
        />
        <Text
          style={[
            styles.text,
            disabled && styles.disabledText,
            !value && styles.placeholderText,
          ]}
        >
          {displayValue}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color={disabled ? "#9CA3AF" : "#6B7280"}
        />
      </TouchableOpacity>

      {/* iOS: Modal with picker and buttons */}
      {Platform.OS === "ios" && showPicker && (
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <Pressable style={styles.modalOverlay} onPress={handleCancel}>
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Time</Text>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={tempTime || new Date()}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  onChange={handleTimeChange}
                  textColor="#1F2937"
                  style={styles.picker}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Android: Native picker (already has OK/Cancel buttons) */}
      {Platform.OS === "android" && showPicker && (
        <DateTimePicker
          value={tempTime || new Date()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  disabledInput: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    opacity: 0.6,
  },
  icon: {
    marginRight: 10,
    flexShrink: 0,
  },
  text: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
    flex: 1,
  },
  placeholderText: {
    color: "#9CA3AF",
    fontWeight: "400",
  },
  disabledText: {
    color: "#9CA3AF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 4,
  },
  pickerContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  picker: {
    width: "100%",
    height: 200,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PrimaryColor,
    alignItems: "center",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
