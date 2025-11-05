import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  Keyboard,
  TextInput,
  TouchableWithoutFeedback,
  View,
  TouchableOpacity,
  Animated,
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
  const [currentText, setCurrentText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const fadeAnim = useState(new Animated.Value(1))[0];

  // Array of search suggestions - memoized to avoid recreating
  const searchTexts = React.useMemo(
    () => [
      "Search for favorites...",
      "Search for meals...",
      "Search for restaurants...",
      "Search for stores...",
      "Search anything...",
    ],
    []
  );

  useEffect(() => {
    // Don't animate if user has typed something or input is focused
    if (value || isFocused) {
      return;
    }

    const typingSpeed = isDeleting ? 50 : 100;
    const pauseTime = 2000; // Pause at end of text

    const timer = setTimeout(() => {
      const currentFullText = searchTexts[loopNum % searchTexts.length];

      if (!isDeleting) {
        // Typing forward
        if (currentIndex < currentFullText.length) {
          setCurrentText(currentFullText.substring(0, currentIndex + 1));
          setCurrentIndex(currentIndex + 1);
        } else {
          // Finished typing, pause then start deleting
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        // Deleting
        if (currentIndex > 0) {
          setCurrentText(currentFullText.substring(0, currentIndex - 1));
          setCurrentIndex(currentIndex - 1);
        } else {
          // Finished deleting, move to next text
          setIsDeleting(false);
          setLoopNum(loopNum + 1);
        }
      }

      // Pulse animation for "Search" word
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [
    currentIndex,
    isDeleting,
    loopNum,
    value,
    isFocused,
    fadeAnim,
    searchTexts,
  ]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (!editable) {
      // If not editable and no onPress provided, dismiss keyboard
      Keyboard.dismiss();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (onPress) {
      onPress();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // Render animated placeholder with highlighted "Search" word
  const renderAnimatedPlaceholder = () => {
    if (value || isFocused) return null;

    const words = currentText.split(" ");
    return (
      <View
        style={{
          position: "absolute",
          left: 49, // Account for icon width + margin
          top: 0,
          bottom: 0,
          justifyContent: "center",
          flexDirection: "row",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {words.map((word, index) => {
          const isSearchWord = word.toLowerCase().includes("search");
          return (
            <Animated.Text
              key={index}
              style={{
                fontSize: 16,
                color: isSearchWord ? "#FF6B35" : "#9CA3AF",
                fontWeight: isSearchWord ? "600" : "400",
                opacity: isSearchWord ? fadeAnim : 1,
                marginRight: 4,
              }}
            >
              {word}
            </Animated.Text>
          );
        })}
        <View
          style={{
            width: 2,
            height: 18,
            backgroundColor: "#FF6B35",
            marginLeft: 2,
            opacity: 0.8,
          }}
        />
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={handlePress} accessible={false}>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "white",
          borderColor: isFocused ? "#FF6B35" : "#E0E0E0",
          borderWidth: isFocused ? 2 : 1,
          borderRadius: 30,
          height: 50,
          paddingHorizontal: 15,
          marginHorizontal: fullWidth ? 0 : 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          position: "relative",
        }}
      >
        <Ionicons
          name="search"
          size={24}
          color="#FF6B35"
          style={{ marginRight: 10, alignSelf: "center" }}
        />
        {renderAnimatedPlaceholder()}
        <TextInput
          style={{
            flex: 1,
            fontSize: 16,
            color: "#333",
            paddingVertical: 0, // Remove default padding for better alignment
          }}
          placeholder=""
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
