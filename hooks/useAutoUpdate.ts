import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Updates from "expo-updates";

/**
 * Automatic over-the-air updates.
 *
 * On app launch and whenever the app returns to the foreground, silently
 * checks the EAS Update server for a new JS bundle, downloads it, and
 * reloads so users always run the latest version without visiting the
 * app store. No-ops in development (Expo Go / dev client).
 */
export function useAutoUpdate() {
  const checking = useRef(false);

  useEffect(() => {
    const checkAndApply = async () => {
      if (__DEV__ || !Updates.isEnabled || checking.current) return;
      checking.current = true;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          // Apply immediately — the app restarts with the new bundle.
          await Updates.reloadAsync();
        }
      } catch (e) {
        // Never block or crash the app because an update check failed
        console.warn("[AutoUpdate] check failed:", e);
      } finally {
        checking.current = false;
      }
    };

    // Check on launch
    checkAndApply();

    // Re-check whenever the app comes back to the foreground
    const sub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") checkAndApply();
      },
    );

    return () => sub.remove();
  }, []);
}
