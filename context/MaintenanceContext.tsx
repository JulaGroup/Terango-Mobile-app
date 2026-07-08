/**
 * MaintenanceContext
 *
 * Fetches maintenance flags from /api/app-status on mount (and on every
 * foreground resume so toggles take effect without killing the app).
 *
 * Usage:
 *   const { flags, isLoading, refetch } = useMaintenance();
 *   if (flags.restaurantMaintenanceMode) return <MaintenanceScreen ... />;
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { API_URL } from "@/constants/config";

export interface MaintenanceFlags {
  appMaintenanceMode: boolean;
  storeMaintenanceMode: boolean;
  expressDeliveryMaintenance: boolean;
  kerspaceMaintenanceMode: boolean;
  teranproMaintenanceMode: boolean;
  furnitureMaintenanceMode: boolean;
  restaurantMaintenanceMode: boolean;
  shopMaintenanceMode: boolean;
  maintenanceMessage: string;
  noDriversWindow: {
    active: boolean;
    startHour: number;
    endHour: number;
  };
}

const DEFAULT_FLAGS: MaintenanceFlags = {
  appMaintenanceMode: false,
  storeMaintenanceMode: false,
  expressDeliveryMaintenance: false,
  kerspaceMaintenanceMode: false,
  teranproMaintenanceMode: false,
  furnitureMaintenanceMode: false,
  restaurantMaintenanceMode: false,
  shopMaintenanceMode: false,
  maintenanceMessage:
    "This service is temporarily unavailable for scheduled maintenance. Please try again later.",
  noDriversWindow: { active: false, startHour: 0, endHour: 6 },
};

interface MaintenanceContextValue {
  flags: MaintenanceFlags;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextValue>({
  flags: DEFAULT_FLAGS,
  isLoading: true,
  refetch: async () => {},
});

export function MaintenanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [flags, setFlags] = useState<MaintenanceFlags>(DEFAULT_FLAGS);
  const [isLoading, setIsLoading] = useState(true);
  const appState = useRef(AppState.currentState);

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/app-status`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return; // fail silently — keep last-known flags
      const json = await res.json();
      if (json?.data) {
        setFlags({ ...DEFAULT_FLAGS, ...json.data });
      }
    } catch {
      // Network failure — keep last-known flags (fail open, never block users)
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Re-fetch when app comes back to foreground (so admin toggles are picked up fast)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === "active"
        ) {
          fetchFlags();
        }
        appState.current = nextState;
      },
    );
    return () => subscription.remove();
  }, [fetchFlags]);

  return (
    <MaintenanceContext.Provider
      value={{ flags, isLoading, refetch: fetchFlags }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
}

export const useMaintenance = () => useContext(MaintenanceContext);
