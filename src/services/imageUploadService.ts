import cloudinary from "../config/cloudinary.config";
import { UploadApiResponse } from "cloudinary";

export interface UploadImageOptions {
  folder?: string;
  publicId?: string;
  resourceType?: "image" | "video" | "raw" | "auto";
}

/**
 * Image Upload Service
 * Handles uploading images to Cloudinary from URLs or buffers
 */
export class ImageUploadService {
  private readonly defaultFolder = "nutrition";

  /**
   * Upload image from URL to Cloudinary
   * @param imageUrl - URL of the image to upload
   * @param options - Upload options (folder, publicId, etc.)
   * @returns Promise<string> - Cloudinary URL of the uploaded image
   */
  async uploadFromUrl(
    imageUrl: string,
    options: UploadImageOptions = {}
  ): Promise<string> {
    try {
      const uploadOptions = {
        folder: options.folder || this.defaultFolder,
        public_id: options.publicId,
        resource_type: options.resourceType || "image" as const,
        overwrite: true,
      };

      const result: UploadApiResponse = await cloudinary.uploader.upload(
        imageUrl,
        uploadOptions
      );

      console.log(
        `[CLOUDINARY] - Successfully uploaded image: ${result.public_id}`
      );
      return result.secure_url;
    } catch (error) {
      console.error(`[CLOUDINARY] - Failed to upload image from URL:`, error);
      throw new Error(
        `Failed to upload image to Cloudinary: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Upload image from buffer to Cloudinary
   * @param buffer - Image buffer
   * @param options - Upload options (folder, publicId, etc.)
   * @returns Promise<string> - Cloudinary URL of the uploaded image
   */
  async uploadFromBuffer(
    buffer: Buffer,
    options: UploadImageOptions = {}
  ): Promise<string> {
    try {
      return new Promise((resolve, reject) => {
        const uploadOptions = {
          folder: options.folder || this.defaultFolder,
          public_id: options.publicId,
          resource_type: options.resourceType || "image" as const,
          overwrite: true,
        };

        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error(`[CLOUDINARY] - Failed to upload buffer:`, error);
              reject(
                new Error(
                  `Failed to upload image to Cloudinary: ${error.message}`
                )
              );
              return;
            }

            if (!result) {
              reject(new Error("Upload result is null"));
              return;
            }

            console.log(
              `[CLOUDINARY] - Successfully uploaded image: ${result.public_id}`
            );
            resolve(result.secure_url);
          }
        );

        uploadStream.end(buffer);
      });
    } catch (error) {
      console.error(`[CLOUDINARY] - Failed to upload buffer:`, error);
      throw new Error(
        `Failed to upload image to Cloudinary: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Upload ingredient image to Cloudinary
   * @param imageUrl - URL of the ingredient image
   * @param ingredientId - ID of the ingredient
   * @returns Promise<string> - Cloudinary URL
   */
  async uploadIngredientImage(
    imageUrl: string,
    ingredientId: string
  ): Promise<string> {
    return this.uploadFromUrl(imageUrl, {
      folder: `${this.defaultFolder}/ingredients`,
      publicId: `ingredient_${ingredientId}`,
    });
  }

  /**
   * Upload recipe image to Cloudinary
   * @param imageUrl - URL of the recipe image
   * @param recipeId - ID of the recipe
   * @returns Promise<string> - Cloudinary URL
   */
  async uploadRecipeImage(
    imageUrl: string,
    recipeId: string
  ): Promise<string> {
    return this.uploadFromUrl(imageUrl, {
      folder: `${this.defaultFolder}/recipes`,
      publicId: `recipe_${recipeId}`,
    });
  }

  /**
   * Delete image from Cloudinary
   * @param publicId - Public ID of the image to delete
   * @returns Promise<void>
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`[CLOUDINARY] - Successfully deleted image: ${publicId}`);
    } catch (error) {
      console.error(`[CLOUDINARY] - Failed to delete image:`, error);
      throw new Error(
        `Failed to delete image from Cloudinary: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

export default new ImageUploadService();

