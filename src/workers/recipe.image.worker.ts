import dotenv from "dotenv";
import { Worker } from "bullmq";
import { RecipeService } from "../services/recipeService";
import MessageQueueEnum from "../enums/message.enum";
import fs from "fs";
import path from "path";
dotenv.config();

export function handleUpdateRecipeImageWorker(connection: any) {
  const recipeService = new RecipeService();

  const worker = new Worker(
    MessageQueueEnum.RECIPE_IMAGE_GENERATION,
    async (job) => {
        const { recipeId, url } = job.data;
        console.log("[DEBUG] __dirname =", __dirname);
        console.log(`[GEN_RECIPE_IMAGE] - Generating image for recipe ${recipeId}`);
        
        const fileName = path.basename(`recipe_${recipeId}.jpg`);
        const filePath = path.join(__dirname, "../images", fileName);
        console.log("[DEBUG] filePath =", filePath);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Không thể tải ảnh: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await fs.promises.writeFile(filePath, buffer);

        const result = await recipeService.updateRecipe(recipeId, { 
            image_url: `${process.env.HOST}/nutrition-images/${fileName}` 
        });

        return result;
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
