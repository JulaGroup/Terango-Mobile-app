import { loginUser } from "@/actions/auth.ts/action";
import { PrimaryColor } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import RateLimitModal from "@/components/modals/RateLimitModal";
import { router } from "expo-router";
import { SecureStorage } from "@/utils/secureStorage";
import React, { useState } from "react";
import {
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  maxLength: number;
}

const COUNTRIES: Country[] = [
  { code: "GM", name: "Gambia", flag: "🇬🇲", dialCode: "+220", maxLength: 7 },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    dialCode: "+1",
    maxLength: 10,
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    dialCode: "+44",
    maxLength: 10,
  },
  { code: "SN", name: "Senegal", flag: "🇸🇳", dialCode: "+221", maxLength: 9 },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dialCode: "+234", maxLength: 10 },
  { code: "GH", name: "Ghana", flag: "🇬🇭", dialCode: "+233", maxLength: 9 },
  { code: "GER", name: "Germany", flag: "🇩🇪", dialCode: "+49", maxLength: 11 },
  { code: "FRA", name: "France", flag: "🇫🇷", dialCode: "+33", maxLength: 10 },
  { code: "ESP", name: "Spain", flag: "🇪🇸", dialCode: "+34", maxLength: 9 },
  { code: "ITA", name: "Italy", flag: "🇮🇹", dialCode: "+39", maxLength: 10 },
  {
    code: "NED",
    name: "Netherlands",
    flag: "🇳🇱",
    dialCode: "+31",
    maxLength: 9,
  },
  { code: "BEL", name: "Belgium", flag: "🇧🇪", dialCode: "+32", maxLength: 9 },
  { code: "SWE", name: "Sweden", flag: "🇸🇪", dialCode: "+46", maxLength: 8 },
  { code: "DNK", name: "Denmark", flag: "🇩🇰", dialCode: "+45", maxLength: 8 },
  { code: "NOR", name: "Norway", flag: "🇳🇴", dialCode: "+47", maxLength: 8 },
  { code: "FIN", name: "Finland", flag: "🇫🇮", dialCode: "+358", maxLength: 8 },
  { code: "SWE", name: "Sweden", flag: "🇸🇪", dialCode: "+46", maxLength: 8 },
];

export default function AuthScreen() {
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Gambia default
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState({
    retryAfter: "30 minutes",
    message: "",
  });

  const isValidPhone = phone.length === selectedCountry.maxLength;

  const handlePhoneChange = (text: string) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, "");
    // Limit to max length for selected country
    if (numericText.length <= selectedCountry.maxLength) {
      setPhone(numericText);
    }
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
    setPhone(""); // Clear phone when country changes
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!phone) {
      alert("Please enter your phone number");
      return;
    }
    if (!isValidPhone) {
      alert(
        `Please enter a valid ${selectedCountry.name} phone number (${selectedCountry.maxLength} digits)`,
      );
      return;
    }
    setLoading(true);
    try {
      await loginUser({
        phone,
        countryCode: selectedCountry.dialCode.replace("+", ""),
      });
    } catch (error: any) {
      console.error("Login error:", error);

      // Check if it's a rate limit error
      if (error?.isRateLimited) {
        setRateLimitInfo({
          retryAfter: error.retryAfter || "30 minutes",
          message: error.message || "",
        });
        setShowRateLimitModal(true);
      } else {
        alert(error?.message || "Error sending OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableWithoutFeedback
          onPress={() => Keyboard.dismiss()}
          accessible={false}
        >
          <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" />
        <View
          style={{
            marginBottom: 40,
            marginTop: 20,
            borderRadius: 12,
            overflow: "hidden",
            ...(Platform.OS === "ios"
              ? {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.08,
                  shadowRadius: 24,
                  elevation: 8,
                }
              : {}),
          }}
        >
          <Image
            source={require("../../assets/logo-no-background.png")}
            style={{
              width: 300,
              height: 100,
              resizeMode: "contain",
              alignSelf: "center",
            }}
          />
        </View>
        <Text style={styles.header}>Welcome</Text>
        <Text style={styles.subHeader}>
          Enter your phone number to continue
        </Text>
        <View style={styles.whatsappNotice}>
          <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          <Text style={styles.whatsappText}>
            {"We'll send a verification code via WhatsApp"}
          </Text>
        </View>

        <View style={styles.inputContainer}>
          {/* Phone Input with Country Picker */}
          <View style={styles.phoneInputWrapper}>
            <TouchableOpacity
              style={styles.countryPickerButton}
              onPress={() => setShowCountryPicker(true)}
            >
              <Text style={styles.flagText}>{selectedCountry.flag}</Text>
              <Text style={styles.dialCodeText}>
                {selectedCountry.dialCode}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            <TextInput
              placeholder={`Phone number (${selectedCountry.maxLength} digits)`}
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={handlePhoneChange}
              style={styles.phoneInput}
              keyboardType="phone-pad"
              maxLength={selectedCountry.maxLength}
            />
          </View>

          {/* Phone Length Indicator */}
          <View style={styles.lengthIndicator}>
            <Text
              style={[
                styles.lengthText,
                phone.length === selectedCountry.maxLength &&
                  styles.lengthTextValid,
              ]}
            >
              {phone.length}/{selectedCountry.maxLength} digits
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (loading || !isValidPhone) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading || !isValidPhone}
        >
          <Text style={styles.buttonText}>
            {loading ? "Loading..." : "Continue"}
          </Text>
        </TouchableOpacity>

        {/* Browse as Guest Button */}
        <TouchableOpacity
          style={styles.guestButton}
          onPress={() => {
            // Mark onboarding as seen to prevent showing it again
            SecureStorage.setItem("hasSeenOnboarding", "true");
            router.replace("/(tabs)");
          }}
        >
          <Ionicons name="eye-outline" size={20} color={PrimaryColor} />
          <Text style={styles.guestButtonText}>Browse as Guest</Text>
        </TouchableOpacity>

        <Text style={styles.or}>or</Text>

        {/* <TouchableOpacity style={styles.socialButton}>
        <Ionicons name="logo-google" size={20} color="white" />
        <Text style={styles.socialText}>Continue with Google</Text>
      </TouchableOpacity>

      {Platform.OS === "ios" && (
        <TouchableOpacity style={styles.socialButton}>
          <Ionicons name="logo-apple" size={20} color="white" />
          <Text style={styles.socialText}>Continue with Apple</Text>
        </TouchableOpacity>
      )} */}

        {/* Country Picker Modal */}
        <Modal
          visible={showCountryPicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCountryPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Country</Text>
                <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={COUNTRIES}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.countryItem,
                      selectedCountry.code === item.code &&
                        styles.countryItemSelected,
                    ]}
                    onPress={() => handleCountrySelect(item)}
                  >
                    <Text style={styles.countryFlag}>{item.flag}</Text>
                    <View style={styles.countryInfo}>
                      <Text style={styles.countryName}>{item.name}</Text>
                      <Text style={styles.countryDialCode}>
                        {item.dialCode}
                      </Text>
                    </View>
                    {selectedCountry.code === item.code && (
                      <Ionicons
                        name="checkmark"
                        size={24}
                        color={PrimaryColor}
                      />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Rate Limit Modal */}
        <RateLimitModal
          visible={showRateLimitModal}
          onClose={() => setShowRateLimitModal(false)}
          retryAfter={rateLimitInfo.retryAfter}
          message={rateLimitInfo.message}
        />
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 26,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
  },
  subHeader: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 40,
    marginTop: 6,
  },
  inputContainer: {
    gap: 8,
  },
  phoneInputWrapper: {
    flexDirection: "row",
    gap: 12,
  },
  countryPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 6,
  },
  flagText: {
    fontSize: 24,
  },
  dialCodeText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: "#111827",
  },
  lengthIndicator: {
    alignItems: "flex-end",
    paddingHorizontal: 4,
  },
  lengthText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  lengthTextValid: {
    color: PrimaryColor,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: "#111827",
  },
  button: {
    marginTop: 20,
    backgroundColor: PrimaryColor,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  guestButton: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PrimaryColor,
    backgroundColor: "transparent",
  },
  guestButtonText: {
    color: PrimaryColor,
    fontSize: 16,
    fontWeight: "600",
  },
  or: {
    textAlign: "center",
    marginTop: 20,
    color: "#9CA3AF",
  },
  socialButton: {
    marginTop: 16,
    flexDirection: "row",
    backgroundColor: "black",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  socialText: {
    color: "white",
    fontSize: 16,
  },
  whatsappNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  whatsappText: {
    color: "#15803D",
    fontSize: 14,
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  countryItemSelected: {
    backgroundColor: "#F0FDF4",
  },
  countryFlag: {
    fontSize: 28,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  countryDialCode: {
    fontSize: 14,
    color: "#6B7280",
  },
});
