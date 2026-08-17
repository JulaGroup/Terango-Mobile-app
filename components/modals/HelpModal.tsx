import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    id: "1",
    question: "How do I place an order?",
    answer:
      "To place an order, browse restaurants, select items, add them to your cart, and proceed to checkout. Choose your delivery address and payment method to complete your order.",
  },
  {
    id: "2",
    question: "What payment methods do you accept?",
    answer:
      "We accept only Wave payments for now. You can link your Wave account in the app and use it to pay for your orders securely.",
  },
  {
    id: "3",
    question: "How long does delivery take?",
    answer:
      "Delivery times vary by location and restaurant preparation time, typically ranging from 20-45 minutes. You can see estimated delivery time before placing your order.",
  },
  {
    id: "4",
    question: "Can I cancel my order?",
    answer:
      "You can cancel your order within 2 minutes of placing it. After that, cancellation depends on the restaurant's policy and order preparation status.",
  },
  {
    id: "5",
    question: "How do I track my order?",
    answer:
      "Once your order is confirmed, you'll receive real-time updates via push notifications. You can also check your order status in the app.",
  },
  {
    id: "6",
    question: "What if my order is incorrect or damaged?",
    answer:
      "If there's an issue with your order, please contact support immediately. We'll work with the restaurant to resolve the issue or provide a refund.",
  },
];

export default function HelpModal({ visible, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<"faq" | "contact" | "feedback">(
    "faq",
  );
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const handleContactEmail = () => {
    const email = "info@terango.gm";
    const subject = contactSubject || "Support Request";
    const body = contactMessage || "Please describe your issue...";
    const mailto = `mailto:${email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    Linking.openURL(mailto).catch(() => {
      Alert.alert(
        "Email App Not Available",
        `Please send your message to: ${email}`,
        [{ text: "Copy Email", onPress: () => {} }, { text: "OK" }],
      );
    });
  };

  const handleWhatsApp = () => {
    const phoneNumber = "+220XXXXXXX"; // Replace with actual WhatsApp number
    const message = contactMessage || "Hi, I need help with TeranGo app";
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(
      message,
    )}`;

    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert(
        "WhatsApp Not Available",
        "Please install WhatsApp or contact us via email",
      );
    });
  };

  const submitFeedback = () => {
    if (!feedbackText.trim()) {
      Alert.alert("Error", "Please enter your feedback before submitting.");
      return;
    }

    Alert.alert(
      "Thank You!",
      "Your feedback has been submitted. We appreciate your input!",
      [
        {
          text: "OK",
          onPress: () => {
            setFeedbackText("");
            onClose();
          },
        },
      ],
    );
  };

  const FAQItem = ({ item }: { item: FAQItem }) => {
    const isExpanded = expandedFAQ === item.id;

    return (
      <TouchableOpacity
        style={styles.faqItem}
        onPress={() => setExpandedFAQ(isExpanded ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.faqHeader}>
          <Text style={styles.faqQuestion}>{item.question}</Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#6B7280"
          />
        </View>
        {isExpanded && <Text style={styles.faqAnswer}>{item.answer}</Text>}
      </TouchableOpacity>
    );
  };

  const TabButton = ({
    title,
    isActive,
    onPress,
    icon,
  }: {
    title: string;
    isActive: boolean;
    onPress: () => void;
    icon: string;
  }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTab]}
      onPress={onPress}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={isActive ? "#FF6B35" : "#6B7280"}
      />
      <Text style={[styles.tabText, isActive && styles.activeTabText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TabButton
            title="FAQ"
            icon="help-circle-outline"
            isActive={activeTab === "faq"}
            onPress={() => setActiveTab("faq")}
          />
          <TabButton
            title="Contact"
            icon="mail-outline"
            isActive={activeTab === "contact"}
            onPress={() => setActiveTab("contact")}
          />
          <TabButton
            title="Feedback"
            icon="chatbubble-outline"
            isActive={activeTab === "feedback"}
            onPress={() => setActiveTab("feedback")}
          />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* FAQ Tab */}
          {activeTab === "faq" && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>
                Frequently Asked Questions
              </Text>
              <Text style={styles.sectionSubtitle}>
                Find answers to common questions about using TeranGo
              </Text>

              {faqData.map((item) => (
                <FAQItem key={item.id} item={item} />
              ))}
            </View>
          )}

          {/* Contact Tab */}
          {activeTab === "contact" && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Contact Support</Text>
              <Text style={styles.sectionSubtitle}>
                Get in touch with our support team for personalized help
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subject</Text>
                <TextInput
                  style={styles.textInput}
                  value={contactSubject}
                  onChangeText={setContactSubject}
                  placeholder="Brief description of your issue"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Message</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={contactMessage}
                  onChangeText={setContactMessage}
                  placeholder="Please describe your issue in detail..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.contactOptions}>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={handleContactEmail}
                >
                  <Ionicons name="mail" size={20} color="#fff" />
                  <Text style={styles.contactButtonText}>Send Email</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.contactButton, styles.whatsappButton]}
                  onPress={handleWhatsApp}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                  <Text style={styles.contactButtonText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.contactInfo}>
                <Text style={styles.contactInfoTitle}>
                  Other Ways to Reach Us
                </Text>
                <Text style={styles.contactInfoText}>📧 info@terango.gm</Text>
                <Text style={styles.contactInfoText}>
                  📱 +220 633554/ 7144612/ 3666678
                </Text>
                <Text style={styles.contactInfoText}>
                  🕒 Support Hours: 9 AM - 12 PM
                </Text>
              </View>
            </View>
          )}

          {/* Feedback Tab */}
          {activeTab === "feedback" && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Share Your Feedback</Text>
              <Text style={styles.sectionSubtitle}>
                Help us improve TeranGo by sharing your thoughts and suggestions
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your Feedback</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  placeholder="Tell us what you think about TeranGo. What features would you like to see? What can we improve?"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={submitFeedback}
              >
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </TouchableOpacity>

              <View style={styles.feedbackInfo}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color="#6B7280"
                />
                <Text style={styles.feedbackInfoText}>
                  Your feedback is anonymous and helps us make TeranGo better
                  for everyone.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: "#FFF3E0",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 6,
  },
  activeTabText: {
    color: "#FF6B35",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
    lineHeight: 20,
  },
  faqItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  contactOptions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  whatsappButton: {
    backgroundColor: "#25D366",
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  contactInfo: {
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
  },
  contactInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  contactInfoText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  submitButton: {
    backgroundColor: "#FF6B35",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  feedbackInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  feedbackInfoText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    flex: 1,
    marginLeft: 8,
  },
});
