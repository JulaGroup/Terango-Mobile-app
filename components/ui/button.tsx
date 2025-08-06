import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';

interface ButtonProps extends TouchableOpacityProps {
  text?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function Button({
  text,
  variant = 'primary',
  size = 'medium',
  loading = false,
  textStyle,
  style,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isGhost = variant === 'ghost';
  const isDisabled = disabled || loading;

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator color={isGhost ? '#007AFF' : '#FFFFFF'} />;
    }

    if (children) {
      return children;
    }

    if (text) {
      return (
        <Text
          style={[
            styles.text,
            styles[`${size}Text`],
            isGhost && styles.ghostText,
            textStyle,
          ]}
        >
          {text}
        </Text>
      );
    }

    return null;
  };

  const buttonContent = (
    <TouchableOpacity
      {...props}
      disabled={isDisabled}
      style={[
        styles.button,
        styles[`${size}Button`],
        isGhost && styles.ghostButton,
        disabled && styles.disabledButton,
        style,
      ]}
    >
      {renderContent()}
    </TouchableOpacity>
  );

  if (isGhost) {
    return buttonContent;
  }

  return (
    <LinearGradient
      colors={
        variant === 'primary'
          ? ['#2196F3', '#0D47A1']
          : ['#757575', '#424242']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {buttonContent}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    opacity: 1,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  disabledButton: {
    opacity: 0.5,
  },
  text: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  ghostText: {
    color: '#007AFF',
  },
  smallButton: {
    height: 32,
    borderRadius: 6,
  },
  mediumButton: {
    height: 44,
    borderRadius: 8,
  },
  largeButton: {
    height: 56,
    borderRadius: 12,
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});
