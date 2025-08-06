import axios, { isAxiosError } from "axios";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/**
 * Direct Cloudinary upload using your unsigned preset
 * @param {string} imageUri - The local URI of the image to upload
 * @returns {Promise<string|null>} - The Cloudinary secure URL or null if upload failed
 */
export async function uploadToCloudinary(
  imageUri: string
): Promise<string | null> {
  try {
    if (!imageUri) {
      console.error("No image URI provided");
      return null;
    }

    console.log("Starting Cloudinary upload with URI:", imageUri);

    // Optimize image before upload (resize and compress)
    const manipulatedImage = await manipulateAsync(
      imageUri,
      [{ resize: { width: 1000 } }], // Resize to reasonable width
      { compress: 0.8, format: SaveFormat.JPEG }
    );

    // For React Native, we need to use FormData with the file
    const formData = new FormData();

    // Get file info
    const uriParts = manipulatedImage.uri.split("/");
    const fileName = uriParts[uriParts.length - 1] || `image-${Date.now()}.jpg`;

    // Add file to FormData (React Native specific format)
    formData.append("file", {
      uri: manipulatedImage.uri,
      type: "image/jpeg",
      name: fileName,
    } as any);

    formData.append("upload_preset", "unsigned_preset");

    const cloudName = "dkpi5ij2t";
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    console.log("Uploading to Cloudinary...");
    const response = await axios.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("Cloudinary upload successful:", response.data.secure_url);
    return response.data.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    if (isAxiosError(error) && error.response) {
      console.error("Cloudinary response:", error.response.data);
    }
    return null;
  }
}

/**
 * Upload menu item image (legacy function for compatibility)
 */
export async function uploadMenuItemImage(
  imageUri: string
): Promise<string | null> {
  return uploadToCloudinary(imageUri);
}

/**
 * Upload multiple images to Cloudinary
 */
export async function uploadMultipleImages(
  imageUris: string[]
): Promise<string[]> {
  const uploadPromises = imageUris.map((uri) => uploadToCloudinary(uri));
  const results = await Promise.all(uploadPromises);
  return results.filter((url) => url !== null) as string[];
}

/**
 * Upload restaurant profile image
 */
export async function uploadRestaurantImage(
  imageUri: string
): Promise<string | null> {
  return uploadToCloudinary(imageUri);
}

/**
 * Upload shop/store profile image
 */
export async function uploadShopImage(
  imageUri: string
): Promise<string | null> {
  return uploadToCloudinary(imageUri);
}

/**
 * Upload product images for shops
 */
export async function uploadProductImages(
  imageUris: string[]
): Promise<string[]> {
  return uploadMultipleImages(imageUris);
}
