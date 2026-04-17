import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { Ionicons } from "@expo/vector-icons";

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

interface GooglePlacesInputProps {
  label: string;
  placeholder: string;
  onLocationSelect: (details: any) => void;
}

const GooglePlacesInput: React.FC<GooglePlacesInputProps> = ({
  label,
  placeholder,
  onLocationSelect,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <GooglePlacesAutocomplete
        placeholder={placeholder}
        onPress={(data, details = null) => {
          onLocationSelect(details);
        }}
        query={{
          key: GOOGLE_PLACES_API_KEY,
          language: "en",
          components: "country:gm", // Restrict to The Gambia
        }}
        fetchDetails={true}
        styles={{
          container: styles.autocompleteContainer,
          textInput: styles.textInput,
          predefinedPlacesDescription: {
            color: "#1faadb",
          },
          listView: styles.listView,
          row: styles.row,
        }}
        renderLeftButton={() => (
          <View style={styles.iconWrapper}>
            <Ionicons name="location-outline" size={22} color="#6B7280" />
          </View>
        )}
        renderRightButton={() =>
          // Clear button can be added here if needed
          null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  autocompleteContainer: {
    flex: 1,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingLeft: 45, // Make space for the icon
    paddingRight: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconWrapper: {
    position: "absolute",
    left: 12,
    top: 14,
    zIndex: 1,
  },
  listView: {
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 8,
  },
  row: {
    padding: 12,
  },
});

export default GooglePlacesInput;
