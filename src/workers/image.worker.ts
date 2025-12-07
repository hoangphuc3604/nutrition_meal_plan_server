import dotenv from "dotenv";
import { Worker } from "bullmq";
import { IngredientService } from "../services/ingredientService";
import { ImageUploadService } from "../services/imageUploadService";
import MessageQueueEnum from "../enums/message.enum";
dotenv.config();

export function handleUpdateImageWorker(connection: any) {
  const ingredientService = new IngredientService();
  const imageUploadService = new ImageUploadService();

  const worker = new Worker(
    MessageQueueEnum.IMAGE_GENERATION,
    async (job) => {
        const { ingredientId, url } = job.data;
        console.log(`[GEN_IMAGE] - Processing image for ingredient ${ingredientId}`);
        
        try {
            // Upload image to Cloudinary
            const cloudinaryUrl = await imageUploadService.uploadIngredientImage(
                url,
                ingredientId
            );

            // Update ingredient with Cloudinary URL
            const result = await ingredientService.updateIngredient(ingredientId, { 
                image_url: cloudinaryUrl 
            });

            console.log(`[GEN_IMAGE] - Successfully updated ingredient ${ingredientId} with Cloudinary URL`);
            return result;
        } catch (error) {
            console.error(`[GEN_IMAGE] - Failed to process image for ingredient ${ingredientId}:`, error);
            throw error;
        }
    },
    {
      connection,
      concurrency: 2,
      limiter: {
        max: 5,
        duration: 60000,
      },
    }
  );

  worker.on("completed", (job) => console.log(`[GEN_IMAGE] Job ${job.id} done`));
  worker.on("failed", (job, err) => console.error(`[GEN_IMAGE] Job ${job?.id} failed: ${err.message}`));

  console.log("[INIT] Worker started for queue: gen_image");
  return worker;
}
