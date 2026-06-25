import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Alert, Linking } from "react-native";
import { SecureStorage } from "@/utils/secureStorage";
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

export const PermissionContext = createContext<
  PermissionContextType | undefined
>(undefined);

const PERMISSION_STORAGE_KEY = "teranggo_permissions";
const MODALS_SHOWN_KEY = "teranggo_modals_shown";

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
  // Track when initial load / system permission check is finished
  const [initialized, setInitialized] = useState(false);
  // Load saved permissions and modal state on app start
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const [savedPermissions, modalsShown] = await Promise.all([
          SecureStorage.getItem(PERMISSION_STORAGE_KEY),
          SecureStorage.getItem(MODALS_SHOWN_KEY),
        ]);

        if (savedPermissions) {
          setPermissions(JSON.parse(savedPermissions));
        }

        if (modalsShown) {
          setHasShownPermissionModals(JSON.parse(modalsShown));
        }

        // Check current system permissions
        await checkCurrentPermissions();
        // Initialization finished - allow modal logic to run
        setInitialized(true);
      } catch (error) {
        console.error("Error loading permission state:", error);
      }
    };

    loadPermissions();
  }, []);

  // Every app load: request any missing permissions.
  // If permanently denied, prompt user to open Settings.
  useEffect(() => {
    if (!initialized) return;

    setTimeout(async () => {
      const locPerm = await Location.getForegroundPermissionsAsync();
      const notifPerm = await Notifications.getPermissionsAsync();

      const locDenied = !locPerm.granted && !locPerm.canAskAgain;
      const notifDenied = !notifPerm.granted && !notifPerm.canAskAgain;

      if (!locPerm.granted) {
        if (locPerm.canAskAgain) {
          setShowLocationModal(true);
        } else {
          // Permanently denied — direct to Settings
          Alert.alert(
            "Location Permission Required",
            "TeranGO needs location access to find nearby vendors and estimate delivery. Please enable it in Settings.",
            [
              {
                text: "Not Now",
                style: "cancel",
                onPress: () => {
                  // After skipping location, check notifications
                  if (!notifPerm.granted) {
                    if (notifPerm.canAskAgain) {
                      setTimeout(() => setShowNotificationModal(true), 500);
                    } else {
                      setTimeout(() => {
                        Alert.alert(
                          "Notifications Disabled",
                          "Enable notifications in Settings to get order updates and delivery alerts.",
                          [
                            { text: "Not Now", style: "cancel" },
                            {
                              text: "Open Settings",
                              onPress: () => Linking.openSettings(),
                            },
                          ],
                        );
                      }, 500);
                    }
                  }
                },
              },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
      } else if (!notifPerm.granted) {
        if (notifPerm.canAskAgain) {
          setShowNotificationModal(true);
        } else {
          Alert.alert(
            "Notifications Disabled",
            "Enable notifications in Settings to get order updates and delivery alerts.",
            [
              { text: "Not Now", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ],
          );
        }
      }
    }, 1500);
  }, [initialized]);
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
      await SecureStorage.setItem(
        PERMISSION_STORAGE_KEY,
        JSON.stringify(newPermissions),
      );
      setPermissions(newPermissions);
    } catch (error) {
      console.error("Error saving permission state:", error);
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      // If permanently denied, open Settings instead of showing system dialog
      const current = await Location.getForegroundPermissionsAsync();
      if (!current.canAskAgain && !current.granted) {
        setShowLocationModal(false);
        Alert.alert(
          "Location Permission Required",
          "Location access was previously denied. Please enable it in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return false;
      }

      setPermissions((prev) => ({ ...prev, location: "pending" }));

      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";

      const newPermissions = {
        ...permissions,
        location: granted ? ("granted" as const) : ("denied" as const),
      };

      await savePermissionState(newPermissions);
      setShowLocationModal(false);

      // Always show notification modal after location is handled if not yet granted
      if (permissions.notifications === "not-asked") {
        setTimeout(() => setShowNotificationModal(true), 1500);
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
      // If permanently denied, open Settings instead of showing system dialog
      const current = await Notifications.getPermissionsAsync();
      if (!current.canAskAgain && !current.granted) {
        setShowNotificationModal(false);
        Alert.alert(
          "Notifications Disabled",
          "Notifications were previously denied. Please enable them in Settings to receive order updates.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return false;
      }

      setPermissions((prev) => ({ ...prev, notifications: "pending" }));

      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === "granted";

      const newPermissions = {
        ...permissions,
        notifications: granted ? ("granted" as const) : ("denied" as const),
      };

      await savePermissionState(newPermissions);
      setShowNotificationModal(false);

      // Re-check system permissions to update state
      await checkCurrentPermissions();

      return granted;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      setPermissions((prev) => ({ ...prev, notifications: "denied" }));
      return false;
    }
  };

  const dismissLocationModal = () => {
    setShowLocationModal(false);
    // After dismissing location modal, show notification modal if not yet granted
    if (permissions.notifications === "not-asked") {
      setTimeout(() => setShowNotificationModal(true), 1000);
    }
  };

  const dismissNotificationModal = async () => {
    setShowNotificationModal(false);
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

      // Location permanently denied — open Settings
      Alert.alert(
        "Location Permission Required",
        "Location access was denied. Please enable it in Settings to use this feature.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ],
      );
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
