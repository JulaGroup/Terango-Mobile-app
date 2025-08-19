import axios from "axios";
import { API_URL } from "@/constants/config";

export interface VendorApplication {
  id: string;
  businessName: string;
  businessType: "RESTAURANT" | "SHOP" | "PHARMACY";
  status: "PENDING" | "APPROVED" | "REJECTED" | "WAITING_LIST";
  description?: string;
  businessAddress: string;
  businessPhone?: string;
  businessEmail?: string;
  categoryId?: string;
  documents?: any;
  experience?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorApplicationResponse {
  application: VendorApplication;
}

class VendorApplicationAPI {
  /**
   * Get user's vendor application
   */
  static async getUserApplication(
    token: string
  ): Promise<VendorApplicationResponse> {
    try {
      const response = await axios.get(
        `${API_URL}/api/vendor-applications/user`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error("No application found");
      }
      throw error;
    }
  }

  /**
   * Create a new vendor application
   */
  static async createApplication(
    token: string,
    applicationData: {
      businessName: string;
      businessType: "RESTAURANT" | "SHOP" | "PHARMACY";
      description?: string;
      businessAddress: string;
      businessPhone?: string;
      businessEmail?: string;
      categoryId?: string;
      experience?: string;
    }
  ): Promise<VendorApplicationResponse> {
    try {
      const response = await axios.post(
        `${API_URL}/api/vendor-applications`,
        applicationData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Update an existing vendor application
   */
  static async updateApplication(
    token: string,
    applicationId: string,
    applicationData: Partial<{
      businessName: string;
      businessType: "RESTAURANT" | "SHOP" | "PHARMACY";
      description?: string;
      businessAddress: string;
      businessPhone?: string;
      businessEmail?: string;
      categoryId?: string;
      experience?: string;
    }>
  ): Promise<VendorApplicationResponse> {
    try {
      const response = await axios.put(
        `${API_URL}/api/vendor-applications/${applicationId}`,
        applicationData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }
}

export default VendorApplicationAPI;
