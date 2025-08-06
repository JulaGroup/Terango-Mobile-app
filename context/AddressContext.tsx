import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Address, AddressService } from "@/services/AddressService";

interface AddressContextType {
  selectedAddress: Address | null;
  addresses: Address[];
  loading: boolean;
  error: string | null;
  hasProfile: boolean;
  isFirstTime: boolean;
  setSelectedAddress: (address: Address | null) => void;
  fetchAddresses: () => Promise<void>;
  addAddress: (addressData: any) => Promise<void>;
  updateAddress: (addressId: string, addressData: any) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  setDefaultAddress: (addressId: string) => Promise<void>;
  checkUserStatus: () => Promise<void>;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

const SELECTED_ADDRESS_KEY = "@teranggo_selected_address";

export function AddressProvider({ children }: { children: ReactNode }) {
  const [selectedAddress, setSelectedAddressState] = useState<Address | null>(
    null
  );
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  useEffect(() => {
    loadSelectedAddress();
  }, []);

  useEffect(() => {
    checkUserStatus();
  }, []);
  const getUserId = async (): Promise<string | null> => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      return userId;
    } catch (error) {
      console.error("Failed to get user ID:", error);
      return null;
    }
  };

  const loadSelectedAddress = async () => {
    try {
      const savedAddress = await AsyncStorage.getItem(SELECTED_ADDRESS_KEY);
      if (savedAddress) {
        setSelectedAddressState(JSON.parse(savedAddress));
      }
    } catch (error) {
      console.error("Failed to load selected address:", error);
    }
  };
  const setSelectedAddress = useCallback(async (address: Address | null) => {
    try {
      setSelectedAddressState(address);
      if (address) {
        await AsyncStorage.setItem(
          SELECTED_ADDRESS_KEY,
          JSON.stringify(address)
        );
      } else {
        await AsyncStorage.removeItem(SELECTED_ADDRESS_KEY);
      }
    } catch (error) {
      console.error("Failed to save selected address:", error);
    }
  }, []);
  const fetchAddresses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = await getUserId();
      if (!userId) {
        console.warn("No user ID found, cannot fetch addresses");
        setAddresses([]);
        setLoading(false);
        return;
      }

      const userAddresses = await AddressService.getUserAddresses(userId);
      setAddresses(userAddresses);

      // If no address is selected and user has a default address, select it
      if (!selectedAddress && userAddresses.length > 0) {
        const defaultAddress =
          userAddresses.find((addr) => addr.isDefault) || userAddresses[0];
        setSelectedAddress(defaultAddress);
      }
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
      setError("Failed to load addresses");
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAddress, setSelectedAddress]);
  const addAddress = async (addressData: any) => {
    try {
      setLoading(true);
      const userId = await getUserId();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const newAddress = await AddressService.createAddress(
        userId,
        addressData
      );
      setAddresses((prev) => [...prev, newAddress]);

      // If this is the first address, make it selected
      if (addresses.length === 0) {
        setSelectedAddress(newAddress);
      }
    } catch (error) {
      console.error("Failed to add address:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateAddress = async (addressId: string, addressData: any) => {
    try {
      setLoading(true);
      const updatedAddress = await AddressService.updateAddress(
        addressId,
        addressData
      );
      setAddresses((prev) =>
        prev.map((addr) => (addr.id === addressId ? updatedAddress : addr))
      );

      // If the updated address is currently selected, update it
      if (selectedAddress?.id === addressId) {
        setSelectedAddress(updatedAddress);
      }
    } catch (error) {
      console.error("Failed to update address:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteAddress = async (addressId: string) => {
    try {
      setLoading(true);
      await AddressService.deleteAddress(addressId);
      setAddresses((prev) => prev.filter((addr) => addr.id !== addressId));

      // If the deleted address was selected, clear selection or select another
      if (selectedAddress?.id === addressId) {
        const remainingAddresses = addresses.filter(
          (addr) => addr.id !== addressId
        );
        const newSelected =
          remainingAddresses.find((addr) => addr.isDefault) ||
          remainingAddresses[0] ||
          null;
        setSelectedAddress(newSelected);
      }
    } catch (error) {
      console.error("Failed to delete address:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const setDefaultAddress = async (addressId: string) => {
    try {
      setLoading(true);
      const updatedAddress = await AddressService.setDefaultAddress(addressId);

      // Update all addresses - remove default from others, set for this one
      setAddresses((prev) =>
        prev.map((addr) => ({
          ...addr,
          isDefault: addr.id === addressId,
        }))
      );

      // Set as selected address
      setSelectedAddress(updatedAddress);
    } catch (error) {
      console.error("Failed to set default address:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const checkUserStatus = useCallback(async () => {
    try {
      const userId = await getUserId();
      if (!userId) {
        setHasProfile(false);
        setIsFirstTime(true);
        return;
      }

      const status = await AddressService.getUserStatus(userId);
      setHasProfile(status.hasProfile);
      setIsFirstTime(!status.hasProfile && !status.hasAddresses);
    } catch (error) {
      console.error("Failed to check user status:", error);
      setHasProfile(false);
      setIsFirstTime(true);
    }
  }, []);
  return (
    <AddressContext.Provider
      value={{
        selectedAddress,
        addresses,
        loading,
        error,
        hasProfile,
        isFirstTime,
        setSelectedAddress,
        fetchAddresses,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        checkUserStatus,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
}

export const useAddress = () => {
  const context = useContext(AddressContext);
  if (context === undefined) {
    throw new Error("useAddress must be used within an AddressProvider");
  }
  return context;
};
