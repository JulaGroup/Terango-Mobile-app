import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";
import { VendorApplicationAPI } from "@/lib/vendorApplicationAPI";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface VendorApplicationFormData {
  businessName: string;
  businessType: "RESTAURANT" | "SHOP" | "PHARMACY" | "";
  description: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  experience: string;
}

const businessTypes = [
  {
    id: "RESTAURANT",
    title: "Restaurant",
    subtitle: "Food delivery service",
    icon: "restaurant-outline",
    color: "#FF6B35",
  },
  {
    id: "SHOP",
    title: "Shop/Store",
    subtitle: "General merchandise & products",
    icon: "storefront-outline",
    color: "#22C55E",
  },
  {
    id: "PHARMACY",
    title: "Pharmacy",
    subtitle: "Medical supplies & medicines",
    icon: "medical-outline",
    color: "#3B82F6",
  },
];

export default function VendorApplicationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<VendorApplicationFormData>({
    businessName: "",
    businessType: "",
    description: "",
    businessAddress: "",
    businessPhone: "",
    businessEmail: "",
    experience: "",
  });

  const updateFormData = (
    key: keyof VendorApplicationFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.businessType !== "";
      case 2:
        return (
          formData.businessName.trim() !== "" &&
          formData.businessAddress.trim() !== ""
        );
      case 3:
        return true; // Optional fields
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    } else {
      Alert.alert("Error", "Please fill in all required fields");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      console.log(
        "Token from storage:",
        token ? "Token exists" : "No token found"
      );

      if (!token) {
        Alert.alert("Error", "Please log in to continue");
        router.replace("/auth");
        return;
      }

      // Prepare the data for submission
      const applicationData = {
        businessName: formData.businessName,
        businessType: formData.businessType as
          | "RESTAURANT"
          | "SHOP"
          | "PHARMACY",
        description: formData.description || undefined,
        businessAddress: formData.businessAddress,
        businessPhone: formData.businessPhone || undefined,
        businessEmail: formData.businessEmail || undefined,
        experience: formData.experience || undefined,
      };

      console.log("Submitting application data:", applicationData);

      await VendorApplicationAPI.createApplication(applicationData, token);

      Alert.alert(
        "Application Submitted!",
        "Thank you for your interest in becoming a vendor. Your application has been submitted and will be reviewed by the TeranGo team. We will notify you once a decision has been made.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error submitting application:", error);
      Alert.alert("Error", error.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  const renderBusinessTypeSelection = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        What type of business are you applying for?
      </Text>
      <Text style={styles.stepSubtitle}>
        Choose the category that best describes your business
      </Text>

      <View style={styles.businessTypeGrid}>
        {businessTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.businessTypeCard,
              formData.businessType === type.id && [
                styles.businessTypeCardSelected,
                { borderColor: type.color },
              ],
            ]}
            onPress={() => updateFormData("businessType", type.id as any)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.businessTypeIcon,
                { backgroundColor: `${type.color}15` },
              ]}
            >
              <Ionicons name={type.icon as any} size={32} color={type.color} />
            </View>
            <Text style={styles.businessTypeTitle}>{type.title}</Text>
            <Text style={styles.businessTypeSubtitle}>{type.subtitle}</Text>

            {formData.businessType === type.id && (
              <View
                style={[
                  styles.selectedIndicator,
                  { backgroundColor: type.color },
                ]}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderBusinessDetails = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Business Information</Text>
      <Text style={styles.stepSubtitle}>
        Tell us about your business details
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business Name *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.businessName}
          onChangeText={(text) => updateFormData("businessName", text)}
          placeholder="Enter your business name"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business Address *</Text>
        <TextInput
          style={[styles.textInput, styles.textAreaInput]}
          value={formData.businessAddress}
          onChangeText={(text) => updateFormData("businessAddress", text)}
          placeholder="Enter your business address"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business Description</Text>
        <TextInput
          style={[styles.textInput, styles.textAreaInput]}
          value={formData.description}
          onChangeText={(text) => updateFormData("description", text)}
          placeholder="Describe your business and what you offer"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  );

  const renderContactDetails = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Contact Information</Text>
      <Text style={styles.stepSubtitle}>
        Provide your business contact details
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business Phone</Text>
        <TextInput
          style={styles.textInput}
          value={formData.businessPhone}
          onChangeText={(text) => updateFormData("businessPhone", text)}
          placeholder="e.g., +220 123 4567"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business Email</Text>
        <TextInput
          style={styles.textInput}
          value={formData.businessEmail}
          onChangeText={(text) => updateFormData("businessEmail", text)}
          placeholder="business@example.com"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Experience & Background</Text>
        <TextInput
          style={[styles.textInput, styles.textAreaInput]}
          value={formData.experience}
          onChangeText={(text) => updateFormData("experience", text)}
          placeholder="Tell us about your experience in this business"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderBusinessTypeSelection();
      case 2:
        return renderBusinessDetails();
      case 3:
        return renderContactDetails();
      default:
        return renderBusinessTypeSelection();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Become a Vendor</Text>
            <Text style={styles.headerSubtitle}>Step {currentStep} of 3</Text>
          </View>

          <View style={styles.headerRight} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(currentStep / 3) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStepContent()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {currentStep < 3 ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                !validateStep(currentStep) && styles.nextButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={!validateStep(currentStep)}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color="#fff"
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {loading ? "Submitting..." : "Submit Application"}
              </Text>
              {!loading && (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color="#fff"
                  style={{ marginLeft: 8 }}
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  headerRight: {
    width: 44,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: PrimaryColor,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1F2937",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  stepSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 32,
    lineHeight: 24,
  },
  businessTypeGrid: {
    gap: 16,
  },
  businessTypeCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  businessTypeCardSelected: {
    borderWidth: 2,
    backgroundColor: "#FEFEFE",
    transform: [{ scale: 1.02 }],
  },
  businessTypeIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  businessTypeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  businessTypeSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  selectedIndicator: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  textAreaInput: {
    height: 100,
    textAlignVertical: "top",
  },
  footer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  nextButton: {
    backgroundColor: PrimaryColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  submitButton: {
    backgroundColor: PrimaryColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
