import React from "react";
import { PermissionContext } from "@/context/PermissionContext";
import PermissionModal from "./PermissionModal";
import { PrimaryColor } from "@/constants/Colors";

const PermissionHandler: React.FC = () => {
  // Use useContext directly so we don't throw if provider is missing
  const context = React.useContext(PermissionContext);
  if (!context) {
    // If no provider, render nothing (inert)
    return null;
  }

  const {
    showLocationModal,
    showNotificationModal,
    requestLocationPermission,
    requestNotificationPermission,
    dismissLocationModal,
    dismissNotificationModal,
    permissions,
  } = context;

  return (
    <>
      {/* Location Permission Modal */}
      <PermissionModal
        visible={showLocationModal}
        title="Find Nearby Vendors"
        description="To find nearby vendors and provide accurate delivery estimates, we need access to your location."
        icon="location"
        iconColor="#FF6B35"
        primaryButtonText="Continue"
        onPrimaryPress={requestLocationPermission}
        loading={permissions.location === "pending"}
      />

      {/* Notification Permission Modal */}
      <PermissionModal
        visible={showNotificationModal}
        title="Stay Updated"
        description="Enable notifications to get real-time updates about your orders, delivery status, and special offers."
        icon="notifications"
        iconColor={PrimaryColor}
        primaryButtonText="Enable Notifications"
        secondaryButtonText="Skip for Now"
        onPrimaryPress={requestNotificationPermission}
        onSecondaryPress={dismissNotificationModal}
        loading={permissions.notifications === "pending"}
      />
    </>
  );
};

export default PermissionHandler;
