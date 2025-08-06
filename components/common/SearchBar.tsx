import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
  Keyboard,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText, placeholder = "Search here..." }) => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "white",
          borderColor: "#E0E0E0",
          borderWidth: 1,
          borderRadius: 30,
          height: 50,
          paddingHorizontal: 15,
          marginHorizontal: 20,
        }}
      >
        <Ionicons
          name="search"
          size={24}
          color="#4B4B4BFF"
          style={{ marginRight: 10, alignSelf: "center" }}
        />
        <TextInput
          style={{ flex: 1, fontSize: 16 }}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
        />
        <Ionicons
          style={{ marginLeft: 10, alignSelf: "center" }}
          name="options"
          color="#4B4B4BFF"
          size={24}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default SearchBar;
