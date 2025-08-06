import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  FlatList,
  Modal,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PrimaryColor } from "@/constants/Colors";
import { LinearGradient } from "expo-linear-gradient";

interface Pharmacy {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  licenseNumber: string;
  isActive: boolean;
  rating: number;
  totalOrders: number;
  medicinesCount: number;
  specialties: string[];
}

interface Medicine {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  stockQuantity: number;
  requiresPrescription: boolean;
  dosage: string;
  manufacturer: string;
  expiryDate: string;
  batchNumber: string;
}

export default function PharmacyManagement() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(
    null
  );
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<"pharmacy" | "medicine">(
    "pharmacy"
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPharmacies();
  }, []);

  const loadPharmacies = async () => {
    try {
      // TODO: Fetch from API
      // Mock data for now
      setPharmacies([
        {
          id: "1",
          name: "HealthCare Plus Pharmacy",
          description:
            "Complete pharmaceutical services with prescription care",
          address: "Westfield Junction, Serekunda",
          phone: "+220 555 0123",
          licenseNumber: "PH/GM/2023/001",
          isActive: true,
          rating: 4.8,
          totalOrders: 234,
          medicinesCount: 156,
          specialties: [
            "General Medicine",
            "Pediatrics",
            "Chronic Care",
            "Emergency",
          ],
        },
      ]);
    } catch (error) {
      console.error("Error loading pharmacies:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicines = async (pharmacyId: string) => {
    try {
      // TODO: Fetch from API
      // Mock data for now
      setMedicines([
        {
          id: "1",
          name: "Paracetamol 500mg",
          description: "Pain relief and fever reducer",
          price: 15,
          category: "Pain Relief",
          isAvailable: true,
          stockQuantity: 150,
          requiresPrescription: false,
          dosage: "500mg tablets",
          manufacturer: "Pharma Corp",
          expiryDate: "2025-12-31",
          batchNumber: "PC2024001",
        },
        {
          id: "2",
          name: "Amoxicillin 250mg",
          description: "Antibiotic for bacterial infections",
          price: 45,
          category: "Antibiotics",
          isAvailable: true,
          stockQuantity: 80,
          requiresPrescription: true,
          dosage: "250mg capsules",
          manufacturer: "MedLife",
          expiryDate: "2026-03-15",
          batchNumber: "ML2024002",
        },
        {
          id: "3",
          name: "Insulin Glargine",
          description: "Long-acting insulin for diabetes",
          price: 850,
          category: "Diabetes Care",
          isAvailable: true,
          stockQuantity: 25,
          requiresPrescription: true,
          dosage: "100 units/mL",
          manufacturer: "DiabeCare",
          expiryDate: "2025-08-20",
          batchNumber: "DC2024003",
        },
        {
          id: "4",
          name: "Vitamin D3 1000IU",
          description: "Vitamin D supplement for bone health",
          price: 35,
          category: "Vitamins & Supplements",
          isAvailable: false,
          stockQuantity: 0,
          requiresPrescription: false,
          dosage: "1000IU tablets",
          manufacturer: "VitaHealth",
          expiryDate: "2025-11-30",
          batchNumber: "VH2024004",
        },
      ]);
    } catch (error) {
      console.error("Error loading medicines:", error);
    }
  };

  const PharmacyCard = ({ pharmacy }: { pharmacy: Pharmacy }) => (
    <TouchableOpacity
      style={styles.pharmacyCard}
      onPress={() => {
        setSelectedPharmacy(pharmacy);
        loadMedicines(pharmacy.id);
      }}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={
          pharmacy.isActive ? ["#34D399", "#10B981"] : ["#9CA3AF", "#6B7280"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pharmacyGradient}
      >
        <View style={styles.pharmacyHeader}>
          <View style={styles.pharmacyInfo}>
            <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
            <Text style={styles.pharmacyDescription}>
              {pharmacy.description}
            </Text>
            <View style={styles.licenseInfo}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color="#fff"
              />
              <Text style={styles.licenseText}>
                License: {pharmacy.licenseNumber}
              </Text>
            </View>
            <View style={styles.pharmacyMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.metaText}>{pharmacy.rating}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="receipt-outline" size={14} color="#fff" />
                <Text style={styles.metaText}>
                  {pharmacy.totalOrders} orders
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="medical-outline" size={14} color="#fff" />
                <Text style={styles.metaText}>
                  {pharmacy.medicinesCount} medicines
                </Text>
              </View>
            </View>
            <View style={styles.specialtiesContainer}>
              {pharmacy.specialties.slice(0, 2).map((specialty, index) => (
                <View key={index} style={styles.specialtyTag}>
                  <Text style={styles.specialtyText}>{specialty}</Text>
                </View>
              ))}
              {pharmacy.specialties.length > 2 && (
                <Text style={styles.moreSpecialtiesText}>
                  +{pharmacy.specialties.length - 2} more
                </Text>
              )}
            </View>
          </View>
          <View style={styles.pharmacyActions}>
            <View
              style={[
                styles.statusBadge,
                pharmacy.isActive ? styles.activeBadge : styles.inactiveBadge,
              ]}
            >
              <Text style={styles.statusText}>
                {pharmacy.isActive ? "Active" : "Inactive"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const MedicineCard = ({ item }: { item: Medicine }) => (
    <View style={styles.medicineCard}>
      <View style={styles.medicineContent}>
        <View style={styles.medicineInfo}>
          <View style={styles.medicineHeaderInfo}>
            <Text style={styles.medicineName}>{item.name}</Text>
            {item.requiresPrescription && (
              <View style={styles.prescriptionBadge}>
                <Ionicons
                  name="document-text-outline"
                  size={12}
                  color="#EF4444"
                />
                <Text style={styles.prescriptionText}>Rx</Text>
              </View>
            )}
          </View>
          <Text style={styles.medicineDescription}>{item.description}</Text>
          <View style={styles.medicineMeta}>
            <Text style={styles.medicinePrice}>D{item.price}</Text>
            <Text style={styles.medicineCategory}>{item.category}</Text>
            <Text style={styles.medicineDosage}>{item.dosage}</Text>
          </View>
          <View style={styles.medicineDetails}>
            <Text style={styles.detailText}>Mfg: {item.manufacturer}</Text>
            <Text style={styles.detailText}>Batch: {item.batchNumber}</Text>
            <Text style={styles.detailText}>
              Exp: {new Date(item.expiryDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.stockInfo}>
            <Ionicons
              name={
                item.stockQuantity > 0 ? "checkmark-circle" : "close-circle"
              }
              size={16}
              color={item.stockQuantity > 0 ? "#10B981" : "#EF4444"}
            />
            <Text
              style={[
                styles.stockText,
                { color: item.stockQuantity > 0 ? "#10B981" : "#EF4444" },
              ]}
            >
              {item.stockQuantity > 0
                ? `${item.stockQuantity} in stock`
                : "Out of stock"}
            </Text>
          </View>
        </View>
        <View style={styles.medicineActions}>
          <Switch
            value={item.isAvailable}
            onValueChange={() => {
              // TODO: Update availability
              Alert.alert(
                "Coming Soon",
                "Medicine availability toggle coming soon!"
              );
            }}
            trackColor={{ false: "#E5E7EB", true: "#10B981" }}
            thumbColor={item.isAvailable ? "#fff" : "#9CA3AF"}
          />
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              Alert.alert("Coming Soon", "Medicine editing coming soon!")
            }
          >
            <Ionicons name="create-outline" size={18} color="#10B981" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (selectedPharmacy) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedPharmacy(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{selectedPharmacy.name}</Text>
            <Text style={styles.headerSubtitle}>Medicine Management</Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setModalType("medicine");
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add" size={24} color="#10B981" />
          </TouchableOpacity>
        </View>

        {/* Medicines */}
        <FlatList
          data={medicines}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MedicineCard item={item} />}
          contentContainerStyle={styles.medicineListContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.medicineHeader}>
              <Text style={styles.sectionTitle}>
                Medicines ({medicines.length})
              </Text>
              <View style={styles.medicineStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {medicines.filter((item) => item.isAvailable).length}
                  </Text>
                  <Text style={styles.statLabel}>Available</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {
                      medicines.filter((item) => item.requiresPrescription)
                        .length
                    }
                  </Text>
                  <Text style={styles.statLabel}>Prescription</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {medicines.filter((item) => item.stockQuantity > 0).length}
                  </Text>
                  <Text style={styles.statLabel}>In Stock</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {Math.round(
                      medicines.reduce((acc, item) => acc + item.price, 0) /
                        medicines.length
                    )}
                  </Text>
                  <Text style={styles.statLabel}>Avg Price</Text>
                </View>
              </View>
            </View>
          }
        />
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
          <Text style={styles.headerTitle}>Pharmacy Management</Text>
          <Text style={styles.headerSubtitle}>
            Manage your pharmacies & medicines
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setModalType("pharmacy");
            setShowAddModal(true);
          }}
        >
          <Ionicons name="add" size={24} color="#10B981" />
        </TouchableOpacity>
      </View>

      {/* Pharmacies List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pharmaciesContainer}>
          <Text style={styles.sectionTitle}>
            Your Pharmacies ({pharmacies.length})
          </Text>

          {pharmacies.map((pharmacy) => (
            <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
          ))}

          {pharmacies.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Pharmacies Yet</Text>
              <Text style={styles.emptyDescription}>
                Add your first pharmacy to start managing your medicines and
                prescriptions.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => {
                  setModalType("pharmacy");
                  setShowAddModal(true);
                }}
              >
                <Text style={styles.emptyButtonText}>Add Pharmacy</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Add New {modalType === "pharmacy" ? "Pharmacy" : "Medicine"}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAddModal(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalMessage}>
              {modalType === "pharmacy" ? "Pharmacy" : "Medicine"} creation form
              coming soon!
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  pharmaciesContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pharmacyCard: {
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pharmacyGradient: {
    borderRadius: 16,
    padding: 20,
  },
  pharmacyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pharmacyInfo: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  pharmacyDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
  },
  licenseInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  licenseText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
  pharmacyMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
  specialtiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  specialtyTag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  specialtyText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "500",
  },
  moreSpecialtiesText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    fontStyle: "italic",
  },
  pharmacyActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  inactiveBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
  },
  medicineListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  medicineHeader: {
    paddingVertical: 20,
  },
  medicineStats: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },
  medicineCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medicineContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  medicineInfo: {
    flex: 1,
  },
  medicineHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  prescriptionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  prescriptionText: {
    fontSize: 10,
    color: "#EF4444",
    fontWeight: "bold",
  },
  medicineDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  medicineMeta: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  medicinePrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#10B981",
  },
  medicineCategory: {
    fontSize: 12,
    color: "#8b5cf6",
    backgroundColor: "#f3f0ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  medicineDosage: {
    fontSize: 12,
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  medicineDetails: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 11,
    color: "#9ca3af",
  },
  stockInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: "500",
  },
  medicineActions: {
    alignItems: "center",
    gap: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  modalMessage: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
