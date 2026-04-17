import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, Radius, ComponentSizes } from "@/constants/DesignTokens";

interface ModernInputProps extends TextInputProps {
  label: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  helpText?: string;
  size?: "sm" | "md" | "lg";
}

export const ModernInput: React.FC<ModernInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  helpText,
  value,
  onFocus,
  onBlur,
  size = "md",
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [labelAnim] = useState(new Animated.Value(value ? 1 : 0));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.timing(labelAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (!value) {
      Animated.timing(labelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
    onBlur?.(e);
  };

  React.useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const labelStyle = {
    top: labelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 8],
    }),
    fontSize: labelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [17, 13],
    }),
  };

  const borderColor = error
    ? Colors.error
    : isFocused
      ? Colors.primary
      : Colors.divider;

  const inputHeight = ComponentSizes.input[size].height;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          { borderColor, height: inputHeight },
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={isFocused ? Colors.primary : Colors.inkLight}
            style={styles.leftIcon}
          />
        )}

        <View style={styles.inputWrapper}>
          <Animated.Text
            style={[
              styles.label,
              labelStyle,
              { color: error ? Colors.error : isFocused ? Colors.primary : Colors.inkLight },
            ]}
          >
            {label}
          </Animated.Text>

          <TextInput
            {...props}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[
              styles.input,
              { paddingTop: value || isFocused ? 20 : 0 },
              leftIcon && { paddingLeft: 0 },
            ]}
            placeholderTextColor={Colors.inkLight}
          />
        </View>

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIconButton}
            activeOpacity={0.6}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={isFocused ? Colors.primary : Colors.inkLight}
            />
          </TouchableOpacity>
        )}
      </View>

      {(error || helpText) && (
        <View style={styles.helperContainer}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <Text style={styles.helpText}>{helpText}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    position: "relative",
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorBg,
  },
  inputWrapper: {
    flex: 1,
    position: "relative",
  },
  label: {
    position: "absolute",
    left: 0,
    ...Typography.subheadline,
    backgroundColor: "transparent",
  },
  input: {
    ...Typography.body,
    color: Colors.ink,
    paddingVertical: Platform.OS === "ios" ? Spacing.md : Spacing.sm,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  rightIconButton: {
    marginLeft: Spacing.sm,
    padding: 4,
  },
  helperContainer: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.base,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
  },
  helpText: {
    ...Typography.caption,
    color: Colors.inkLight,
  },
});
