import axios from "axios";
import { API_URL } from "@/constants/config";

export interface VendorApplication {
  id: string;
  businessName: string;
  businessType: "RESTAURANT" | "SHOP" | "PHARMACY";
  description?: string;
  businessAddress: string;
  businessPhone?: string;
  businessEmail?: string;
  experience?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WAITING_LIST";
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
}

export interface CreateVendorApplicationRequest {
  businessName: string;
  businessType: "RESTAURANT" | "SHOP" | "PHARMACY";
  description?: string;
  businessAddress: string;
  businessPhone?: string;
  businessEmail?: string;
  experience?: string;
}

export const VendorApplicationAPI = {
  async createApplication(data: CreateVendorApplicationRequest, token: string) {
    try {
      const response = await axios.post(
        `${API_URL}/api/vendor-applications`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error creating vendor application:", error);

      // Handle different error types
      if (error.response) {
        // Server responded with error status
        const errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          "Failed to create application";
        throw new Error(errorMessage);
      } else if (error.request) {
        // Network error
        throw new Error(
          "Network error. Please check your connection and try again."
        );
      } else {
        // Other error
        throw new Error("An unexpected error occurred. Please try again.");
      }
    }
  },

  async getUserApplication(
    token: string
  ): Promise<{ application: VendorApplication }> {
    try {
      const response = await axios.get(
        `${API_URL}/api/vendor-applications/my-application`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching user application:", error);

      if (error.response?.status === 404) {
        throw new Error("No application found");
      } else if (error.response) {
        const errorMessage =
          error.response.data?.message || "Failed to fetch application";
        throw new Error(errorMessage);
      } else if (error.request) {
        throw new Error(
          "Network error. Please check your connection and try again."
        );
      } else {
        throw new Error("An unexpected error occurred. Please try again.");
      }
    }
  },

  async getAllApplications(
    token: string,
    params?: {
      status?: string;
      businessType?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      const response = await axios.get(
        `${API_URL}/api/vendor-applications/admin/all`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params,
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching all applications:", error);

      if (error.response) {
        const errorMessage =
          error.response.data?.message || "Failed to fetch applications";
        throw new Error(errorMessage);
      } else if (error.request) {
        throw new Error(
          "Network error. Please check your connection and try again."
        );
      } else {
        throw new Error("An unexpected error occurred. Please try again.");
      }
    }
  },

  async updateApplicationStatus(
    applicationId: string,
    data: {
      status: "PENDING" | "APPROVED" | "REJECTED" | "WAITING_LIST";
      reviewNotes?: string;
    },
    token: string
  ) {
    try {
      const response = await axios.patch(
        `${API_URL}/api/vendor-applications/admin/${applicationId}/status`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error updating application status:", error);

      if (error.response) {
        const errorMessage =
          error.response.data?.message || "Failed to update application status";
        throw new Error(errorMessage);
      } else if (error.request) {
        throw new Error(
          "Network error. Please check your connection and try again."
        );
      } else {
        throw new Error("An unexpected error occurred. Please try again.");
      }
    }
  },

  async getApplicationStats(token: string) {
    try {
      const response = await axios.get(
        `${API_URL}/api/vendor-applications/admin/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching application stats:", error);

      if (error.response) {
        const errorMessage =
          error.response.data?.message || "Failed to fetch application stats";
        throw new Error(errorMessage);
      } else if (error.request) {
        throw new Error(
          "Network error. Please check your connection and try again."
        );
      } else {
        throw new Error("An unexpected error occurred. Please try again.");
      }
    }
  },
};
