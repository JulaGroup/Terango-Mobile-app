import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

interface PermissionState {
  location: "granted" | "denied" | "pending" | "not-asked";
  notifications: "granted" | "denied" | "pending" | "not-asked";
}

interface PermissionContextType {
  permissions: PermissionState;
  requestLocationPermission: () => Promise<boolean>;
  requestNotificationPermission: () => Promise<boolean>;
  showLocationModal: boolean;
  showNotificationModal: boolean;
  dismissLocationModal: () => void;
  dismissNotificationModal: () => void;
  hasShownPermissionModals: boolean;
  // Add new function to check location when needed
  checkLocationAccess: () => Promise<boolean>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined
);

const PERMISSION_STORAGE_KEY = "@teranggo_permissions";
const MODALS_SHOWN_KEY = "@teranggo_modals_shown";

export const PermissionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [permissions, setPermissions] = useState<PermissionState>({
    location: "not-asked",
    notifications: "not-asked",
  });

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [hasShownPermissionModals, setHasShownPermissionModals] =
    useState(false);
  // Load saved permissions and modal state on app start
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const [savedPermissions, modalsShown] = await Promise.all([
          AsyncStorage.getItem(PERMISSION_STORAGE_KEY),
          AsyncStorage.getItem(MODALS_SHOWN_KEY),
        ]);

        if (savedPermissions) {
          setPermissions(JSON.parse(savedPermissions));
        }

        if (modalsShown) {
          setHasShownPermissionModals(JSON.parse(modalsShown));
        }

        // Check current system permissions
        await checkCurrentPermissions();
      } catch (error) {
        console.error("Error loading permission state:", error);
      }
    };

    loadPermissions();
  }, []);

  // Show notification modal after app loads if needed (removed auto location modal)
  useEffect(() => {
    if (!hasShownPermissionModals) {
      setTimeout(() => {
        if (permissions.notifications === "not-asked") {
          setShowNotificationModal(true);
        }
      }, 1500); // Initial delay after home screen loads
    }
  }, [hasShownPermissionModals, permissions]);
  const checkCurrentPermissions = async () => {
    try {
      // Check location permission
      const locationPermission = await Location.getForegroundPermissionsAsync();

      // Check notification permission
      const notificationPermission = await Notifications.getPermissionsAsync();

      setPermissions((prev) => ({
        location: locationPermission.granted
          ? "granted"
          : locationPermission.canAskAgain
          ? "not-asked"
          : "denied",
        notifications: notificationPermission.granted
          ? "granted"
          : notificationPermission.canAskAgain
          ? "not-asked"
          : "denied",
      }));
    } catch (error) {
      console.error("Error checking current permissions:", error);
    }
  };

  const savePermissionState = async (newPermissions: PermissionState) => {
    try {
      await AsyncStorage.setItem(
        PERMISSION_STORAGE_KEY,
        JSON.stringify(newPermissions)
      );
      setPermissions(newPermissions);
    } catch (error) {
      console.error("Error saving permission state:", error);
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      setPermissions((prev) => ({ ...prev, location: "pending" }));

      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";

      const newPermissions = {
        ...permissions,
        location: granted ? ("granted" as const) : ("denied" as const),
      };

      await savePermissionState(newPermissions);
      setShowLocationModal(false);

      // Show notification modal after location is handled
      if (permissions.notifications === "not-asked") {
        setTimeout(() => setShowNotificationModal(true), 2000);
      }

      return granted;
    } catch (error) {
      console.error("Error requesting location permission:", error);
      setPermissions((prev) => ({ ...prev, location: "denied" }));
      return false;
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    try {
      setPermissions((prev) => ({ ...prev, notifications: "pending" }));

      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === "granted";

      const newPermissions = {
        ...permissions,
        notifications: granted ? ("granted" as const) : ("denied" as const),
      };

      await savePermissionState(newPermissions);
      setShowNotificationModal(false);

      // Mark that we've shown the permission modals
      await AsyncStorage.setItem(MODALS_SHOWN_KEY, JSON.stringify(true));
      setHasShownPermissionModals(true);

      return granted;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      setPermissions((prev) => ({ ...prev, notifications: "denied" }));
      return false;
    }
  };

  const dismissLocationModal = () => {
    setShowLocationModal(false);
    // Mark that we've shown the permission modals
    AsyncStorage.setItem(MODALS_SHOWN_KEY, JSON.stringify(true));
    setHasShownPermissionModals(true);
    // Do NOT show notification modal again if modals have been marked as shown
    // If you want to show notification modal only once, this prevents repeat popups
  };

  const dismissNotificationModal = async () => {
    setShowNotificationModal(false);
    // Mark that we've shown the permission modals
    await AsyncStorage.setItem(MODALS_SHOWN_KEY, JSON.stringify(true));
    setHasShownPermissionModals(true);
  };

  // Check location access and show modal only when location is needed but not accessible
  const checkLocationAccess = async (): Promise<boolean> => {
    try {
      const locationPermission = await Location.getForegroundPermissionsAsync();

      if (locationPermission.granted) {
        return true;
      }

      // Location not granted - show modal if we haven't asked or can ask again
      if (
        locationPermission.canAskAgain ||
        permissions.location === "not-asked"
      ) {
        setShowLocationModal(true);
        return false;
      }

      // Location permanently denied
      return false;
    } catch (error) {
      console.error("Error checking location access:", error);
      return false;
    }
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        requestLocationPermission,
        requestNotificationPermission,
        showLocationModal,
        showNotificationModal,
        dismissLocationModal,
        dismissNotificationModal,
        hasShownPermissionModals,
        checkLocationAccess,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
};
