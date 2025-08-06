import axios from "axios";

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadImageToCloudinary = async (
  file: File | any,
  folder: string = "teranggo"
): Promise<ImageUploadResult> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "unsigned_preset");
    formData.append("folder", folder);
    
    const cloudName = "dkpi5ij2t";
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    const response = await axios.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return {
      success: true,
      url: response.data.secure_url,
    };
  } catch (error) {
    console.error("Image upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
};

export const uploadMultipleImages = async (
  files: File[],
  folder: string = "teranggo"
): Promise<string[]> => {
  const uploadPromises = files.map((file) => uploadImageToCloudinary(file, folder));
  const results = await Promise.all(uploadPromises);
  
  return results
    .filter((result) => result.success)
    .map((result) => result.url!)
    .filter(Boolean);
};
