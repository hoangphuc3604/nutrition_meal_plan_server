import dotenv from "dotenv";
import { Worker } from "bullmq";
import { IngredientService } from "../services/ingredientService";
import MessageQueueEnum from "../enums/message.enum";
import fs from "fs";
import path from "path";
dotenv.config();

export function handleUpdateImageWorker(connection: any) {
  const ingredientService = new IngredientService();

  const worker = new Worker(
    MessageQueueEnum.IMAGE_GENERATION,
    async (job) => {
        const { ingredientId, url } = job.data;
        console.log("[DEBUG] __dirname =", __dirname);
// c       console.log("[DEBUG] filePath =", filePath);
        console.log(`[GEN_IMAGE] - Generating image for ingredient ${ingredientId}`);
        const fileName = path.basename(`ingredient_${ingredientId}.jpg`);
        const filePath = path.join(__dirname, "../images", fileName);
        console.log("[DEBUG] filePath =", filePath);
    // Gọi fetch để tải ảnh
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Không thể tải ảnh: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Ghi file xuống thư mục images/
        await fs.promises.writeFile(filePath, buffer);

        const result = await ingredientService.updateIngredient(ingredientId, { image_url: `${process.env.HOST}/nutrition-images/${fileName}` });

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

  worker.on("completed", (job) => console.log(`[GEN_IMAGE] Job ${job.id} done`));
  worker.on("failed", (job, err) => console.error(`[GEN_IMAGE] Job ${job?.id} failed: ${err.message}`));

  console.log("[INIT] Worker started for queue: gen_image");
  return worker;
}
