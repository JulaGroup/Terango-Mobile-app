import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Image,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { SecureStorage } from "@/utils/secureStorage";

const { width, height } = Dimensions.get("window");

export default function Landing() {
  const [hasSeenLanding, setHasSeenLanding] = useState(false);

  useEffect(() => {
    // Check if user has already visited
    const checkLanding = async () => {
      const seen = await SecureStorage.getItem("hasSeenLanding");
      if (seen === "true") {
        router.replace("/(tabs)");
      } else {
        setHasSeenLanding(true);
      }
    };
    checkLanding();
  }, []);

  const handleEnterShop = async () => {
    await SecureStorage.setItem("hasSeenLanding", "true");
    router.replace("/(tabs)");
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>
            Teran
            <Text style={{ color: PrimaryColor, fontWeight: "800" }}>Go</Text>
          </Text>
        </View>

        <Text style={styles.heroTitle}>Click. Shop. Go.</Text>
        <Text style={styles.heroSubtitle}>
          The Gambia&apos;s #1 On-Demand Delivery Platform
        </Text>

        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="fast-food" size={32} color={PrimaryColor} />
            </View>
            <Text style={styles.featureTitle}>Food & Dining</Text>
            <Text style={styles.featureText}>
              Your favorite restaurants, delivered hot and fresh
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="leaf" size={32} color={PrimaryColor} />
            </View>
            <Text style={styles.featureTitle}>Fresh Groceries</Text>
            <Text style={styles.featureText}>
              Farm-fresh produce and daily essentials at your doorstep
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="medical" size={32} color={PrimaryColor} />
            </View>
            <Text style={styles.featureTitle}>Pharmacy</Text>
            <Text style={styles.featureText}>
              Health products and medicines delivered discreetly
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="location-sharp" size={32} color={PrimaryColor} />
            </View>
            <Text style={styles.featureTitle}>Real-Time Tracking</Text>
            <Text style={styles.featureText}>
              Track your delivery live from restaurant to your door
            </Text>
          </View>
        </View>
      </View>

      {/* Download Apps Section */}
      <View style={styles.appsSection}>
        <Text style={styles.sectionTitle}>Get the App</Text>
        <Text style={styles.sectionSubtitle}>
          Download TeranGO for a better experience
        </Text>

        {/* App Download Cards - Coming Soon */}
        <View style={styles.appsContainer}>
          <View style={styles.appCard}>
            <View style={[styles.appIcon, styles.iosIcon]}>
              <Ionicons name="logo-apple" size={40} color="#000" />
            </View>
            <Text style={styles.appName}>iOS</Text>
            <Text style={styles.comingSoon}>Coming Soon</Text>
            <TouchableOpacity
              style={[styles.appButton, styles.appButtonDisabled]}
              disabled
            >
              <Text style={styles.appButtonText}>Launching Soon</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.appCard}>
            <View style={[styles.appIcon, styles.androidIcon]}>
              <Ionicons name="logo-android" size={40} color={PrimaryColor} />
            </View>
            <Text style={styles.appName}>Android</Text>
            <Text style={styles.comingSoon}>Coming Soon</Text>
            <TouchableOpacity
              style={[styles.appButton, styles.appButtonDisabled]}
              disabled
            >
              <Text style={styles.appButtonText}>Launching Soon</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.notifyText}>
          📧 Sign up to get notified when the app launches!
        </Text>
      </View>

      {/* Web Shop Section */}
      <View style={styles.webShopSection}>
        <View style={styles.webShopContent}>
          <Ionicons
            name="globe"
            size={48}
            color={PrimaryColor}
            style={styles.webIcon}
          />
          <Text style={styles.webTitle}>Shop on Web</Text>
          <Text style={styles.webDescription}>
            Can&apos;t wait for the mobile app? Shop now on our web platform
            with the same great service and real-time tracking.
          </Text>

          <TouchableOpacity
            style={styles.enterButton}
            onPress={handleEnterShop}
            activeOpacity={0.8}
          >
            <Text style={styles.enterButtonText}>Enter Web Shop</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Service Coverage Section */}
      <View style={styles.coverageSection}>
        <Text style={styles.sectionTitle}>Our Coverage</Text>
        <View style={styles.coverageGrid}>
          <View style={styles.coverageCard}>
            <Text style={styles.coverageEmoji}>🏙️</Text>
            <Text style={styles.coverageName}>Banjul</Text>
          </View>
          <View style={styles.coverageCard}>
            <Text style={styles.coverageEmoji}>🌆</Text>
            <Text style={styles.coverageName}>Serrekunda</Text>
          </View>
          <View style={styles.coverageCard}>
            <Text style={styles.coverageEmoji}>🏞️</Text>
            <Text style={styles.coverageName}>Brusubi</Text>
          </View>
          <View style={styles.coverageCard}>
            <Text style={styles.coverageEmoji}>📍</Text>
            <Text style={styles.coverageName}>Expanding...</Text>
          </View>
        </View>
      </View>

      {/* Why TeranGO Section */}
      <View style={styles.whySection}>
        <Text style={styles.sectionTitle}>Why Choose TeranGO?</Text>

        <View style={styles.whyCard}>
          <View style={styles.whyIcon}>
            <Ionicons name="flash" size={24} color={PrimaryColor} />
          </View>
          <View style={styles.whyContent}>
            <Text style={styles.whyTitle}>Super Fast</Text>
            <Text style={styles.whyText}>Quick delivery in 30-45 minutes</Text>
          </View>
        </View>

        <View style={styles.whyCard}>
          <View style={styles.whyIcon}>
            <Ionicons name="shield-checkmark" size={24} color={PrimaryColor} />
          </View>
          <View style={styles.whyContent}>
            <Text style={styles.whyTitle}>Reliable</Text>
            <Text style={styles.whyText}>Professional, vetted merchants</Text>
          </View>
        </View>

        <View style={styles.whyCard}>
          <View style={styles.whyIcon}>
            <Ionicons name="card" size={24} color={PrimaryColor} />
          </View>
          <View style={styles.whyContent}>
            <Text style={styles.whyTitle}>Safe Payment</Text>
            <Text style={styles.whyText}>Secure online & cash on delivery</Text>
          </View>
        </View>

        <View style={styles.whyCard}>
          <View style={styles.whyIcon}>
            <Ionicons name="headset" size={24} color={PrimaryColor} />
          </View>
          <View style={styles.whyContent}>
            <Text style={styles.whyTitle}>24/7 Support</Text>
            <Text style={styles.whyText}>Always here to help you</Text>
          </View>
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
        <Text style={styles.ctaSubtitle}>
          Join thousands of happy customers in The Gambia
        </Text>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleEnterShop}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaButtonText}>Start Shopping Now</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.learnMoreButton}
          onPress={() => Linking.openURL("https://terango.gm")}
        >
          <Text style={styles.learnMoreText}>Learn More on Website</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <Text style={styles.footerText}>
            📱 Download our mobile app when it launches for a better experience
          </Text>
          <Text style={styles.footerMeta}>
            © 2025 TeranGO. All rights reserved.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 60,
    backgroundColor: "#F9FAFB",
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: "center",
  },
  logo: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1A3C34",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "800",
    color: "#1A3C34",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 48,
  },
  heroSubtitle: {
    fontSize: 18,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 26,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  featureCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${PrimaryColor}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A3C34",
    marginBottom: 8,
    textAlign: "center",
  },
  featureText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  appsSection: {
    paddingHorizontal: 20,
    paddingVertical: 60,
    backgroundColor: "#fff",
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A3C34",
    marginBottom: 8,
    textAlign: "center",
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 40,
  },
  appsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
  },
  appCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  appIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  iosIcon: {
    backgroundColor: "#f0f0f0",
  },
  androidIcon: {
    backgroundColor: `${PrimaryColor}15`,
  },
  appName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A3C34",
    marginBottom: 4,
  },
  comingSoon: {
    fontSize: 12,
    color: PrimaryColor,
    fontWeight: "600",
    marginBottom: 12,
  },
  appButton: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  appButtonDisabled: {
    backgroundColor: "#D1D5DB",
    opacity: 0.7,
  },
  appButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  notifyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    fontStyle: "italic",
  },
  webShopSection: {
    backgroundColor: `${PrimaryColor}10`,
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  webShopContent: {
    alignItems: "center",
  },
  webIcon: {
    marginBottom: 16,
  },
  webTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A3C34",
    marginBottom: 12,
    textAlign: "center",
  },
  webDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  enterButton: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    justifyContent: "center",
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  enterButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  coverageSection: {
    paddingHorizontal: 20,
    paddingVertical: 60,
    backgroundColor: "#fff",
  },
  coverageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  coverageCard: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  coverageEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  coverageName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A3C34",
    textAlign: "center",
  },
  whySection: {
    paddingHorizontal: 20,
    paddingVertical: 60,
    backgroundColor: "#F9FAFB",
  },
  whyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: PrimaryColor,
  },
  whyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${PrimaryColor}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    flexShrink: 0,
  },
  whyContent: {
    flex: 1,
  },
  whyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A3C34",
    marginBottom: 4,
  },
  whyText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  ctaSection: {
    paddingHorizontal: 20,
    paddingVertical: 60,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A3C34",
    marginBottom: 8,
    textAlign: "center",
  },
  ctaSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 32,
    textAlign: "center",
  },
  ctaButton: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  learnMoreButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PrimaryColor,
    width: "100%",
    alignItems: "center",
  },
  learnMoreText: {
    color: PrimaryColor,
    fontWeight: "700",
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerContent: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 20,
  },
  footerMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
