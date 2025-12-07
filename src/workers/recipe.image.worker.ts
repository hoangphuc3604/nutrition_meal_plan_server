import dotenv from "dotenv";
import { Worker } from "bullmq";
import { RecipeService } from "../services/recipeService";
import { ImageUploadService } from "../services/imageUploadService";
import MessageQueueEnum from "../enums/message.enum";
dotenv.config();

export function handleUpdateRecipeImageWorker(connection: any) {
  const recipeService = new RecipeService();
  const imageUploadService = new ImageUploadService();

  const worker = new Worker(
    MessageQueueEnum.RECIPE_IMAGE_GENERATION,
    async (job) => {
        const { recipeId, url } = job.data;
        console.log(`[GEN_RECIPE_IMAGE] - Processing image for recipe ${recipeId}`);
        
        try {
            // Upload image to Cloudinary
            const cloudinaryUrl = await imageUploadService.uploadRecipeImage(
                url,
                recipeId
            );

            // Update recipe with Cloudinary URL
            const result = await recipeService.updateRecipe(recipeId, { 
                image_url: cloudinaryUrl 
            });

            console.log(`[GEN_RECIPE_IMAGE] - Successfully updated recipe ${recipeId} with Cloudinary URL`);
            return result;
        } catch (error) {
            console.error(`[GEN_RECIPE_IMAGE] - Failed to process image for recipe ${recipeId}:`, error);
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

  worker.on("completed", (job) => console.log(`[GEN_RECIPE_IMAGE] Job ${job.id} done`));
  worker.on("failed", (job, err) => console.error(`[GEN_RECIPE_IMAGE] Job ${job?.id} failed: ${err.message}`));

  console.log("[INIT] Worker started for queue: gen_recipe_image");
  return worker;
}
