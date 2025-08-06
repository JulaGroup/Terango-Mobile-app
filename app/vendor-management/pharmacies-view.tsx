import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  FlatList,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { vendorApi, menuApi } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

interface Pharmacy {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  isActive: boolean;
  rating: number;
  totalOrders: number;
  medicinesCount: number;
  licenseNumber: string;
}

interface Medicine {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  stock: number;
  image?: string;
  requiresPrescription: boolean;
  expiryDate?: string;
  dosage?: string;
}

export default function PharmacyManagement() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(
    null
  );
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPharmacies = useCallback(async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        Alert.alert("Error", "Please log in again");
        return;
      }

      const response = await vendorApi.getVendorByUserId(userId);
      if (response && response.pharmacies) {
        const pharmacyList = response.pharmacies || [];
        setPharmacies(pharmacyList);
        if (pharmacyList.length > 0) {
          setSelectedPharmacy(pharmacyList[0]);
          fetchMedicines(pharmacyList[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching pharmacies:", error);
      Alert.alert("Error", "Failed to fetch pharmacies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPharmacies();
  }, [fetchPharmacies]);

  const fetchMedicines = async (pharmacyId: string) => {
    try {
      // For now, we'll simulate pharmacy medicines. In a real app, this would be a pharmacy-specific API
      const response = await menuApi.getMenusByRestaurant(pharmacyId);
      // Transform menu items to medicines for simulation
      const medicineData =
        response?.map((item: any) => ({
          ...item,
          requiresPrescription: Math.random() > 0.5,
          stock: Math.floor(Math.random() * 100) + 1,
          dosage: ["10mg", "20mg", "50mg"][Math.floor(Math.random() * 3)],
          expiryDate: new Date(
            Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000
          ).toLocaleDateString(),
        })) || [];
      setMedicines(medicineData);
    } catch (error) {
      console.error("Error fetching medicines:", error);
      Alert.alert("Error", "Failed to fetch medicines");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPharmacies();
    setRefreshing(false);
  };

  const selectPharmacy = (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
    fetchMedicines(pharmacy.id);
  };

  const renderMedicine = ({ item }: { item: Medicine }) => (
    <View style={styles.medicineCard}>
      <View style={styles.medicineHeader}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.medicineImage} />
        ) : (
          <View style={styles.medicineImagePlaceholder}>
            <Ionicons name="medical-outline" size={32} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.medicineInfo}>
          <View style={styles.medicineNameRow}>
            <Text style={styles.medicineName}>{item.name}</Text>
            {item.requiresPrescription && (
              <View style={styles.prescriptionBadge}>
                <Ionicons name="document-text" size={12} color="#FFF" />
                <Text style={styles.prescriptionText}>Rx</Text>
              </View>
            )}
          </View>
          <Text style={styles.medicineDescription} numberOfLines={2}>
            {item.description}
          </Text>
          {item.dosage && (
            <Text style={styles.medicineDosage}>Dosage: {item.dosage}</Text>
          )}
          <View style={styles.medicineDetails}>
            <Text style={styles.medicinePrice}>${item.price.toFixed(2)}</Text>
            <View style={styles.medicineMeta}>
              <Text style={styles.medicineStock}>Stock: {item.stock}</Text>
              <Text style={styles.medicineExpiry}>Exp: {item.expiryDate}</Text>
              <View
                style={[
                  styles.availabilityBadge,
                  { backgroundColor: item.isAvailable ? "#10B981" : "#EF4444" },
                ]}
              >
                <Text style={styles.availabilityText}>
                  {item.isAvailable ? "Available" : "Out of Stock"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Pharmacy Inventory</Text>
            <Text style={styles.headerSubtitle}>Loading...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading pharmacies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (pharmacies.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Pharmacy Inventory</Text>
            <Text style={styles.headerSubtitle}>No pharmacies found</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="medical-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Pharmacy Found</Text>
          <Text style={styles.emptyDescription}>
            Please contact admin to set up your pharmacy.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Pharmacy Inventory</Text>
          <Text style={styles.headerSubtitle}>
            {selectedPharmacy ? selectedPharmacy.name : "Select a pharmacy"}
          </Text>
        </View>
      </View>

      {/* Pharmacy Selector */}
      {pharmacies.length > 1 && (
        <View style={styles.pharmacySelector}>
          <FlatList
            horizontal
            data={pharmacies}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.pharmacyChip,
                  selectedPharmacy?.id === item.id && styles.pharmacyChipActive,
                ]}
                onPress={() => selectPharmacy(item)}
              >
                <Text
                  style={[
                    styles.pharmacyChipText,
                    selectedPharmacy?.id === item.id &&
                      styles.pharmacyChipTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pharmacySelectorContent}
          />
        </View>
      )}

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <LinearGradient
          colors={["#ECFDF5", "#D1FAE5"]}
          style={styles.infoBannerGradient}
        >
          <Ionicons name="shield-checkmark" size={20} color="#059669" />
          <Text style={styles.infoBannerText}>
            Medicine inventory is managed by admin. Contact support for updates.
          </Text>
        </LinearGradient>
      </View>

      {/* Medicines List */}
      <FlatList
        data={medicines}
        keyExtractor={(item) => item.id}
        renderItem={renderMedicine}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Medicines</Text>
            <Text style={styles.emptyDescription}>
              Contact admin to add medicines for your pharmacy.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  pharmacySelector: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pharmacySelectorContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  pharmacyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pharmacyChipActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  pharmacyChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  pharmacyChipTextActive: {
    color: "#FFF",
  },
  infoBanner: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  infoBannerGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: "#047857",
    fontWeight: "500",
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  medicineCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicineHeader: {
    flexDirection: "row",
    padding: 16,
  },
  medicineImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  medicineImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  prescriptionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  prescriptionText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFF",
  },
  medicineDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
    lineHeight: 20,
  },
  medicineDosage: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "500",
    marginBottom: 8,
  },
  medicineDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  medicinePrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10B981",
  },
  medicineMeta: {
    alignItems: "flex-end",
    gap: 2,
  },
  medicineStock: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  medicineExpiry: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 40,
  },
});
