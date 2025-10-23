// utils/errorHandler.ts
import { Alert } from "react-native";

export interface AppError {
  type: "NETWORK" | "API" | "VALIDATION" | "AUTH" | "UNKNOWN";
  message: string;
  details?: any;
  statusCode?: number;
}

export class ErrorHandler {
  /**
   * Parse error from API call or exception
   */
  static parseError(error: any): AppError {
    console.error("🚨 Error occurred:", error);

    // Network errors
    if (
      error.message === "Network request failed" ||
      error.code === "ERR_NETWORK"
    ) {
      return {
        type: "NETWORK",
        message:
          "No internet connection. Please check your network and try again.",
        details: error,
      };
    }

    // Timeout errors
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      return {
        type: "NETWORK",
        message: "Request timed out. Please try again.",
        details: error,
      };
    }

    // API Response errors
    if (error.response) {
      const statusCode = error.response.status;
      const data = error.response.data;

      switch (statusCode) {
        case 400:
          return {
            type: "VALIDATION",
            message:
              data?.message || "Invalid request. Please check your input.",
            statusCode,
            details: data,
          };

        case 401:
          return {
            type: "AUTH",
            message: "Session expired. Please log in again.",
            statusCode,
            details: data,
          };

        case 403:
          return {
            type: "AUTH",
            message: "You don&apos;t have permission to perform this action.",
            statusCode,
            details: data,
          };

        case 404:
          return {
            type: "API",
            message: "Resource not found. Please try again.",
            statusCode,
            details: data,
          };

        case 429:
          return {
            type: "API",
            message: "Too many requests. Please slow down and try again.",
            statusCode,
            details: data,
          };

        case 500:
        case 502:
        case 503:
        case 504:
          return {
            type: "API",
            message:
              "Server error. Our team has been notified. Please try again later.",
            statusCode,
            details: data,
          };

        default:
          return {
            type: "API",
            message: data?.message || "Something went wrong. Please try again.",
            statusCode,
            details: data,
          };
      }
    }

    // Validation errors
    if (error.name === "ValidationError") {
      return {
        type: "VALIDATION",
        message: error.message || "Please check your input and try again.",
        details: error,
      };
    }

    // Authentication errors
    if (
      error.message?.toLowerCase().includes("unauthorized") ||
      error.message?.toLowerCase().includes("token")
    ) {
      return {
        type: "AUTH",
        message: "Session expired. Please log in again.",
        details: error,
      };
    }

    // Unknown errors
    return {
      type: "UNKNOWN",
      message:
        error.message || "An unexpected error occurred. Please try again.",
      details: error,
    };
  }

  /**
   * Show error alert to user
   */
  static showError(error: any, title?: string) {
    const appError = this.parseError(error);

    Alert.alert(title || this.getErrorTitle(appError.type), appError.message, [
      { text: "OK" },
    ]);
  }

  /**
   * Get appropriate title for error type
   */
  static getErrorTitle(type: AppError["type"]): string {
    switch (type) {
      case "NETWORK":
        return "Connection Error";
      case "API":
        return "Server Error";
      case "VALIDATION":
        return "Validation Error";
      case "AUTH":
        return "Authentication Error";
      default:
        return "Error";
    }
  }

  /**
   * Get user-friendly message with suggestions
   */
  static getUserFriendlyMessage(error: any): string {
    const appError = this.parseError(error);

    switch (appError.type) {
      case "NETWORK":
        return `${appError.message}\n\n• Check your Wi-Fi or mobile data\n• Try turning airplane mode off\n• Move to an area with better signal`;

      case "AUTH":
        return `${appError.message}\n\nYou'll be redirected to the login screen.`;

      case "API":
        if (appError.statusCode === 429) {
          return `${appError.message}\n\nPlease wait a moment before trying again.`;
        }
        return `${appError.message}\n\nIf this persists, please contact support.`;

      case "VALIDATION":
        return appError.message;

      default:
        return `${appError.message}\n\nIf this continues, please restart the app.`;
    }
  }

  /**
   * Log error for debugging/tracking
   */
  static logError(error: any, context?: string) {
    const appError = this.parseError(error);

    console.error("=== ERROR LOG ===");
    console.error("Context:", context || "Unknown");
    console.error("Type:", appError.type);
    console.error("Message:", appError.message);
    console.error("Status Code:", appError.statusCode);
    console.error("Details:", appError.details);
    console.error("=================");

    // TODO: Send to error tracking service (Sentry, Bugsnag, etc.)
    // trackError(appError, context);
  }

  /**
   * Check if error is network-related
   */
  static isNetworkError(error: any): boolean {
    const appError = this.parseError(error);
    return appError.type === "NETWORK";
  }

  /**
   * Check if error is authentication-related
   */
  static isAuthError(error: any): boolean {
    const appError = this.parseError(error);
    return appError.type === "AUTH";
  }
}

/**
 * Wrapper for async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: {
    showAlert?: boolean;
    context?: string;
    fallback?: T;
  } = {}
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    ErrorHandler.logError(error, options.context);

    if (options.showAlert) {
      ErrorHandler.showError(error);
    }

    return options.fallback;
  }
}
