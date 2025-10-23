// components/common/ErrorBoundary.tsx
import React, { Component, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("🚨 Error Boundary caught an error:", error, errorInfo);

    // TODO: Log to error tracking service (Sentry, etc.)
    // logErrorToService(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <View style={styles.container}>
          <LinearGradient
            colors={["#FEF2F2", "#FFFFFF"]}
            style={styles.gradient}
          >
            <View style={styles.content}>
              {/* Error Icon */}
              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <Ionicons name="alert-circle" size={60} color="#EF4444" />
                </View>
              </View>

              {/* Error Message */}
              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.message}>
                We encountered an unexpected error. Don&apos;t worry, our team
                has been notified and we&apos;re working on it.
              </Text>

              {/* Error Details (dev mode) */}
              {__DEV__ && (
                <ScrollView style={styles.errorDetails}>
                  <Text style={styles.errorTitle}>Error Details:</Text>
                  <Text style={styles.errorText}>
                    {this.state.error.name}: {this.state.error.message}
                  </Text>
                  {this.state.error.stack && (
                    <Text style={styles.stackTrace}>
                      {this.state.error.stack}
                    </Text>
                  )}
                </ScrollView>
              )}

              {/* Action Buttons */}
              <TouchableOpacity style={styles.button} onPress={this.resetError}>
                <LinearGradient
                  colors={[PrimaryColor, "#FF6B9D"]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="refresh" size={20} color="white" />
                  <Text style={styles.buttonText}>Try Again</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Help Text */}
              <Text style={styles.helpText}>
                If the problem persists, please contact support or restart the
                app.
              </Text>
            </View>
          </LinearGradient>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  errorDetails: {
    width: "100%",
    maxHeight: 200,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorTitle: {
    color: "#F87171",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    marginBottom: 8,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  stackTrace: {
    color: "#9CA3AF",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  button: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: PrimaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  helpText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    fontStyle: "italic",
  },
});
