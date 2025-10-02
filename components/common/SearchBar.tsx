import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
  Keyboard,
  TextInput,
  TouchableWithoutFeedback,
  View,
  TouchableOpacity,
} from "react-native";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onPress?: () => void; // Add onPress for triggering modal
  editable?: boolean; // Control if input is editable
  fullWidth?: boolean; // Remove horizontal margins for full width
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = "Search here...",
  onPress,
  editable = true,
  fullWidth = false,
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (!editable) {
      // If not editable and no onPress provided, dismiss keyboard
      Keyboard.dismiss();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handlePress} accessible={false}>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "white",
          borderColor: "#E0E0E0",
          borderWidth: 1,
          borderRadius: 30,
          height: 50,
          paddingHorizontal: 15,
          marginHorizontal: fullWidth ? 0 : 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Ionicons
          name="search"
          size={24}
          color="#FF6B35"
          style={{ marginRight: 10, alignSelf: "center" }}
        />
        <TextInput
          style={{
            flex: 1,
            fontSize: 16,
            color: "#333",
            paddingVertical: 0, // Remove default padding for better alignment
          }}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          onFocus={onPress} // Trigger modal when input is focused
          pointerEvents={editable ? "auto" : "none"} // Disable input interaction when not editable
        />
        <TouchableOpacity
          style={{
            marginLeft: 10,
            alignSelf: "center",
            padding: 4, // Add padding for better touch area
          }}
          onPress={() => {
            // You can add filter functionality here later
            console.log("Filter pressed");
          }}
        >
          <Ionicons name="options" color="#9CA3AF" size={20} />
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default SearchBar;
