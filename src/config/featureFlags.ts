import * as dotenv from "dotenv";

dotenv.config();

const ENABLE_PROCESS_IMAGE = process.env.ENABLE_PROCESS_IMAGE !== "false";

export const shouldProcessImages = () => ENABLE_PROCESS_IMAGE;

const logImageFlagStatus = () => {
  console.log(`[FEATURE FLAG] - ENABLE_PROCESS_IMAGE=${ENABLE_PROCESS_IMAGE ? "true" : "false"}`);
};

logImageFlagStatus();

