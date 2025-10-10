import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { vendorApi, userApi, Business } from "@/lib/api";

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  businessType?: string[];
  status?: "PENDING" | "APPROVED" | "REJECTED";
  businesses: Business[];
  totalRevenue: number;
  totalOrders: number;
}

interface VendorContextType {
  vendor: Vendor | null;
  isVendor: boolean;
  isVendorLoading: boolean;
  loginAsVendor: (email: string, password: string) => Promise<boolean>;
  logoutVendor: () => Promise<void>;
  refreshVendorData: () => Promise<void>;
  currentBusiness: Business | null;
  setCurrentBusiness: (business: Business) => void;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

interface VendorProviderProps {
  children: React.ReactNode;
}

export const VendorProvider: React.FC<VendorProviderProps> = ({ children }) => {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isVendorLoading, setIsVendorLoading] = useState(true);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);

  const isVendor = !!vendor;

  const refreshVendorData = useCallback(async () => {
    try {
      console.log("🔄 Refreshing vendor data...");
      const currentUser = await userApi.getCurrentUser();
      console.log("👤 Current user:", currentUser);

      if (!currentUser || !currentUser.user) {
        console.log("❌ No current user found");
        return;
      }

      const userData = currentUser.user;
      console.log("📞 Calling getVendorBusinesses with ID:", userData.id);

      // Try to get businesses first
      let businesses = await vendorApi.getVendorBusinesses(userData.id);
      console.log("🏪 Businesses response:", businesses);

      // If no businesses found through direct API, try to get vendor stats to see if user has businesses
      if (!businesses || businesses.length === 0) {
        console.log("🔍 No businesses found via API, checking vendor stats...");
        try {
          const vendorStats = await vendorApi.getVendorStats();
          console.log("📊 Vendor stats for businesses check:", vendorStats);

          // If stats show activeBusinesses > 0, create placeholder businesses
          if (
            vendorStats.activeBusinesses > 0 ||
            vendorStats.totalBusinesses > 0
          ) {
            console.log("✨ Creating placeholder business from stats");
            businesses = [
              {
                id: `business-${userData.id}`,
                name: "My Restaurant", // Default name, will be updated when proper API works
                type: "RESTAURANT" as const,
                isActive: true,
                todayOrders: vendorStats.todayOrders || 0,
                revenue: vendorStats.totalRevenue || 0,
                address: "",
                phone: userData.phone || "",
                description: "",
                logoUrl: "",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ];
            console.log("📦 Created placeholder business:", businesses);
          }
        } catch (error) {
          console.log("⚠️ Could not fetch vendor stats:", error);
        }
      }

      if (businesses && businesses.length > 0) {
        const vendorData: Vendor = {
          id: userData.id,
          name: userData.name || userData.fullName || "Vendor",
          email: userData.email,
          phone: userData.phone,
          businessName: businesses[0]?.name || "My Business",
          businessType: businesses.map((b) => b.type),
          status: "APPROVED" as const,
          businesses: businesses,
          totalRevenue: businesses.reduce(
            (sum, b) => sum + (b.revenue || 0),
            0
          ),
          totalOrders: businesses.reduce(
            (sum, b) => sum + (b.todayOrders || 0),
            0
          ),
        };

        console.log("✅ Setting vendor data:", vendorData);
        setVendor(vendorData);
        await AsyncStorage.setItem("@vendor_data", JSON.stringify(vendorData));

        // Set current business
        setCurrentBusiness(businesses[0]);
        console.log("🏢 Set current business:", businesses[0]);
      } else {
        console.log("❌ No businesses found for user");

        // Create basic vendor data without businesses so dashboard can show stats
        const basicVendorData: Vendor = {
          id: userData.id,
          name: userData.name || userData.fullName || "Vendor",
          email: userData.email,
          phone: userData.phone,
          businessName: "My Business",
          businessType: [],
          status: "APPROVED" as const,
          businesses: [], // Empty businesses array
          totalRevenue: 0,
          totalOrders: 0,
        };

        console.log(
          "📝 Setting basic vendor data (no businesses):",
          basicVendorData
        );
        setVendor(basicVendorData);
        await AsyncStorage.setItem(
          "@vendor_data",
          JSON.stringify(basicVendorData)
        );
        setCurrentBusiness(null); // No current business
      }
    } catch (error) {
      console.error("🚨 Error refreshing vendor data:", error);
    }
  }, []);

  const checkVendorSession = useCallback(async () => {
    try {
      console.log("🔍 Checking vendor session...");
      const vendorData = await AsyncStorage.getItem("@vendor_data");
      const vendorToken = await AsyncStorage.getItem("@vendor_token");

      if (vendorData && vendorToken) {
        console.log("📦 Found stored vendor data");
        const parsedVendor = JSON.parse(vendorData);
        setVendor(parsedVendor);

        // Set current business (prioritize restaurants, then shops, then pharmacies)
        if (parsedVendor.businesses && parsedVendor.businesses.length > 0) {
          setCurrentBusiness(parsedVendor.businesses[0]);
        }
      } else {
        console.log(
          "🔍 No stored vendor data, checking if current user is a vendor..."
        );
        // Check if current user is a vendor (for users accessing via profile)
        try {
          const currentUser = await userApi.getCurrentUser();
          console.log("👤 Current user for vendor check:", currentUser);

          // The user data is nested in currentUser.user
          const userData = currentUser?.user;
          if (userData && userData.role === "VENDOR") {
            console.log("👑 User is a vendor, loading vendor data...");
            await refreshVendorData();
          } else {
            console.log("👤 User is not a vendor or no user found:", {
              hasUser: !!userData,
              role: userData?.role,
            });
          }
        } catch (error) {
          console.log("❌ Error checking current user:", error);
        }
      }
    } catch (error) {
      console.error("🚨 Error checking vendor session:", error);
    } finally {
      console.log("✅ Vendor session check complete, setting loading to false");
      setIsVendorLoading(false);
    }
  }, [refreshVendorData]);

  // Check for existing vendor session on app start
  useEffect(() => {
    checkVendorSession();
  }, [checkVendorSession]);

  const loginAsVendor = async (
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      setIsVendorLoading(true);

      // Get current user first
      const currentUser = await userApi.getCurrentUser();
      if (!currentUser) {
        Alert.alert("Error", "Please login first");
        return false;
      }

      // Get vendor data by user ID
      const vendorResponse = await vendorApi.getVendorByUserId(currentUser.id);

      if (vendorResponse && vendorResponse.businesses) {
        const vendorData: Vendor = {
          id: currentUser.id,
          name: currentUser.name || vendorResponse.businessName,
          email: currentUser.email,
          phone: currentUser.phone,
          businessName: vendorResponse.businessName,
          businessType: vendorResponse.businessType,
          status: vendorResponse.status,
          businesses: vendorResponse.businesses,
          totalRevenue: vendorResponse.totalRevenue || 0,
          totalOrders: vendorResponse.totalOrders || 0,
        };

        await AsyncStorage.setItem("@vendor_data", JSON.stringify(vendorData));

        setVendor(vendorData);

        // Set current business
        if (vendorData.businesses.length > 0) {
          setCurrentBusiness(vendorData.businesses[0]);
        }

        return true;
      } else {
        Alert.alert("Access Denied", "You are not registered as a vendor");
        return false;
      }
    } catch (error) {
      console.error("Vendor login error:", error);
      Alert.alert(
        "Login Error",
        "Failed to load vendor data. Please try again."
      );
      return false;
    } finally {
      setIsVendorLoading(false);
    }
  };

  const logoutVendor = async () => {
    try {
      await AsyncStorage.removeItem("@vendor_token");
      await AsyncStorage.removeItem("@vendor_data");
      setVendor(null);
      setCurrentBusiness(null);
    } catch (error) {
      console.error("Vendor logout error:", error);
    }
  };

  const value: VendorContextType = {
    vendor,
    isVendor,
    isVendorLoading,
    loginAsVendor,
    logoutVendor,
    refreshVendorData,
    currentBusiness,
    setCurrentBusiness,
  };

  return (
    <VendorContext.Provider value={value}>{children}</VendorContext.Provider>
  );
};

export const useVendor = (): VendorContextType => {
  const context = useContext(VendorContext);
  if (context === undefined) {
    throw new Error("useVendor must be used within a VendorProvider");
  }
  return context;
};
