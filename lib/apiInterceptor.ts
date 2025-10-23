/**
 * FIX: Axios Interceptor for Automatic Token Refresh and Retry
 * 
 * ISSUE: When tokens expired, users would get stuck in a loading state with 
 * no clear error message or way to recover.
 * 
 * SOLUTION:
 * 1. Intercept all 401 (Unauthorized) responses
 * 2. Attempt to refresh the token using backend endpoint
 * 3. Retry the original request with new token
 * 4. If refresh fails, redirect to login
 * 5. Add retry logic with exponential backoff for network errors
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { Alert } from "react-native";
import { API_URL } from "@/constants/config";

// Track whether we're already attempting to refresh
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Notify all pending requests when token is refreshed
 */
const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

/**
 * Subscribe to token refresh events
 */
const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

/**
 * Attempt to refresh the authentication token
 */
async function refreshAuthToken(): Promise<string | null> {
  try {
    console.log("[ApiInterceptor] 🔄 Attempting to refresh token...");
    
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    const userId = await SecureStore.getItemAsync("userId");

    if (!refreshToken || !userId) {
      console.warn("[ApiInterceptor] ❌ No refresh token or userId found");
      return null;
    }

    const response = await axios.post(
      `${API_URL}/auth/refresh-token`,
      { refreshToken, userId },
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const { token: newToken } = response.data;

    if (newToken) {
      console.log("[ApiInterceptor] ✅ Token refreshed successfully");
      await SecureStore.setItemAsync("token", newToken);
      return newToken;
    }

    return null;
  } catch (error) {
    console.error("[ApiInterceptor] ❌ Failed to refresh token:", error);
    return null;
  }
}

/**
 * Setup axios interceptors for the API client
 */
export function setupAxiosInterceptors(instance: AxiosInstance) {
  /**
   * Response interceptor for handling 401 errors and retrying
   */
  instance.interceptors.response.use(
    (response) => {
      // Success - return response as is
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: number;
      };

      // Check for 401 Unauthorized
      if (error.response?.status === 401) {
        console.warn("[ApiInterceptor] ⚠️ Received 401 Unauthorized");

        if (!originalRequest._retry) {
          originalRequest._retry = 0;
        }

        // If already tried refreshing, show login screen
        if (isRefreshing) {
          // Wait for refresh to complete and retry
          return new Promise((resolve, reject) => {
            addRefreshSubscriber((token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers["Authorization"] = `Bearer ${token}`;
              }
              resolve(instance(originalRequest));
            });
          });
        }

        isRefreshing = true;

        try {
          const newToken = await refreshAuthToken();

          if (newToken) {
            // Update authorization header
            if (originalRequest.headers) {
              originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            }

            isRefreshing = false;
            onRefreshed(newToken);

            // Retry original request
            return instance(originalRequest);
          } else {
            // Refresh failed - redirect to login
            isRefreshing = false;
            console.error("[ApiInterceptor] 🔴 Token refresh failed, redirecting to login");

            Alert.alert(
              "Session Expired",
              "Your session has expired. Please log in again.",
              [
                {
                  text: "OK",
                  onPress: async () => {
                    // Clear auth data
                    await SecureStore.deleteItemAsync("token");
                    await SecureStore.deleteItemAsync("userId");
                    await SecureStore.deleteItemAsync("refreshToken");
                    await SecureStore.deleteItemAsync("isLoggedIn");

                    // Redirect to login
                    router.replace("/auth");
                  },
                },
              ]
            );

            return Promise.reject(error);
          }
        } catch (err) {
          isRefreshing = false;
          return Promise.reject(err);
        }
      }

      // Handle other errors with retry logic for network errors
      if (
        error.code === "ERR_NETWORK" ||
        error.code === "ECONNABORTED" ||
        error.message?.includes("Network Error")
      ) {
        const retryCount = originalRequest._retry || 0;
        const maxRetries = 3;

        if (retryCount < maxRetries) {
          originalRequest._retry = retryCount + 1;

          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(
            `[ApiInterceptor] 🔄 Network error - Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`
          );

          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(instance(originalRequest));
            }, delay);
          });
        }
      }

      // For all other errors, reject
      return Promise.reject(error);
    }
  );

  /**
   * Request interceptor for adding auth token to all requests
   */
  instance.interceptors.request.use(
    async (config) => {
      try {
        const token = await SecureStore.getItemAsync("token");

        if (token && config.headers) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }

        return config;
      } catch (error) {
        console.error("[ApiInterceptor] Error getting token:", error);
        return config;
      }
    },
    (error) => {
      return Promise.reject(error);
    }
  );
}

export default {
  setupAxiosInterceptors,
};
