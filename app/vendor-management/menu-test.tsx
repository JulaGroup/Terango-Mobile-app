import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function ViewMenuItemTest() {
  const router = useRouter();
  const { vendorType, vendorId } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            router.push({
              pathname: "/vendor-management/add-menu-item",
              params: { vendorType, vendorId },
            })
          }
        >
          <Ionicons name="add" size={24} color="#10b981" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Menu Management System</Text>
        <Text style={styles.subtitle}>Vendor Type: {vendorType}</Text>
        <Text style={styles.subtitle}>Vendor ID: {vendorId}</Text>

        <TouchableOpacity
          style={styles.addMenuButton}
          onPress={() =>
            router.push({
              pathname: "/vendor-management/add-menu-item",
              params: { vendorType, vendorId },
            })
          }
        >
          <LinearGradient
            colors={["#10b981", "#059669"]}
            style={styles.buttonGradient}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.buttonText}>Add Menu Item</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 8,
    textAlign: "center",
  },
  addMenuButton: {
    marginTop: 32,
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
