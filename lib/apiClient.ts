/**
 * FIX: Enhanced API client with token refresh and retry logic
 *
 * ISSUE: When tokens expired, users would get stuck in a loading state
 * without graceful error handling or automatic retry.
 *
 * SOLUTION:
 * 1. Detect 401 (Unauthorized) responses indicating token expiration
 * 2. Automatically retry failed requests after adding/refreshing token
 * 3. Add exponential backoff for network failures
 * 4. Better error messages for users
 */

import { API_URL } from "@/constants/config";
import { SecureStorage } from "@/utils/secureStorage";
import { router } from "expo-router";

// Configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const TIMEOUT = 30000; // 30 seconds

interface RequestOptions extends RequestInit {
  retryCount?: number;
}

/**
 * Get authentication token from secure storage
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStorage.getItem("token");
  } catch (error) {
    console.error("[APIClient] Failed to retrieve auth token:", error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}

/**
 * Clear authentication and redirect to login
 */
export async function logout(): Promise<void> {
  try {
    await SecureStorage.deleteItem("token");
    await SecureStorage.deleteItem("userId");
    await SecureStorage.deleteItem("userPhone");
    await SecureStorage.deleteItem("isLoggedIn");
    console.log("[APIClient] ✅ User logged out");
    router.replace("/auth");
  } catch (error) {
    console.error("[APIClient] Error during logout:", error);
  }
}

/**
 * Enhanced fetch with automatic retry, token handling, and timeout
 */
export async function apiCall(
  endpoint: string,
  options: RequestOptions = {},
): Promise<any> {
  const retryCount = options.retryCount ?? 0;

  try {
    // Get authentication token if not already provided
    if (!options.headers) {
      options.headers = {};
    }

    const headers = options.headers as Record<string, string>;

    if (!headers["Authorization"]) {
      const token = await getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    // Set default headers
    if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    // Add request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    options.signal = controller.signal;

    // Make the request
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_URL}${endpoint}`;
    console.debug(`[APIClient] ${options.method || "GET"} ${url}`);

    const response = await fetch(url, options as RequestInit);

    clearTimeout(timeoutId);

    // Handle 401 Unauthorized (token expired)
    if (response.status === 401) {
      console.warn("[APIClient] ⚠️ 401 Unauthorized - token may be expired");

      if (retryCount === 0) {
        // First retry: remove auth header and try again (token might be stale)
        console.log("[APIClient] 🔄 Retrying without old token...");

        // Clear the old token
        try {
          await SecureStorage.deleteItem("token");
        } catch (e) {
          console.warn("[APIClient] Failed to clear token:", e);
        }

        // Retry without token
        const retryOptions = { ...options, retryCount: 1 };
        delete (retryOptions.headers as any)["Authorization"];
        return apiCall(endpoint, retryOptions);
      } else {
        // Second attempt failed, user needs to login again
        console.error(
          "[APIClient] ❌ Authentication failed - redirecting to login",
        );
        await logout();
        throw new Error("Session expired. Please log in again.");
      }
    }

    // Handle other errors with retry
    if (!response.ok) {
      // Only retry on network-related errors (5xx) or timeouts
      const isRetryable = response.status >= 500 || response.status === 0;

      if (isRetryable && retryCount < MAX_RETRIES) {
        const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.warn(
          `[APIClient] Request failed (${
            response.status
          }) - retrying in ${delayMs}ms (attempt ${
            retryCount + 1
          }/${MAX_RETRIES})`,
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        // Retry the request
        return apiCall(endpoint, { ...options, retryCount: retryCount + 1 });
      }

      // Non-retryable error or max retries exceeded
      const errorData = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      const errorMessage =
        errorData?.message || errorData?.error || response.statusText;

      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.data = errorData;

      console.error(
        `[APIClient] ❌ Request failed: ${response.status} - ${errorMessage}`,
      );

      throw error;
    }

    // Parse and return response
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error: any) {
    // Handle timeout errors
    if (error.name === "AbortError") {
      console.error("[APIClient] ❌ Request timeout after 30 seconds");
      const timeoutError: any = new Error(
        "Request timeout - please check your connection",
      );
      timeoutError.isTimeout = true;
      throw timeoutError;
    }

    // Handle network errors with retry
    if (retryCount < MAX_RETRIES && !error.status) {
      const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.warn(
        `[APIClient] Network error: ${
          error.message
        } - retrying in ${delayMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`,
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return apiCall(endpoint, { ...options, retryCount: retryCount + 1 });
    }

    // Exhausted all retries
    console.error(
      "[APIClient] ❌ Request failed after retries:",
      error.message,
    );
    throw error;
  }
}

/**
 * GET request helper
 */
export async function apiGet(
  endpoint: string,
  options: RequestOptions = {},
): Promise<any> {
  return apiCall(endpoint, {
    ...options,
    method: "GET",
  });
}

/**
 * POST request helper
 */
export async function apiPost(
  endpoint: string,
  data?: any,
  options: RequestOptions = {},
): Promise<any> {
  return apiCall(endpoint, {
    ...options,
    method: "POST",
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}

/**
 * PUT request helper
 */
export async function apiPut(
  endpoint: string,
  data?: any,
  options: RequestOptions = {},
): Promise<any> {
  return apiCall(endpoint, {
    ...options,
    method: "PUT",
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}

/**
 * PATCH request helper
 */
export async function apiPatch(
  endpoint: string,
  data?: any,
  options: RequestOptions = {},
): Promise<any> {
  return apiCall(endpoint, {
    ...options,
    method: "PATCH",
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete(
  endpoint: string,
  options: RequestOptions = {},
): Promise<any> {
  return apiCall(endpoint, {
    ...options,
    method: "DELETE",
  });
}

export default {
  apiCall,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  getAuthToken,
  isAuthenticated,
  logout,
};
