import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.config";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "nutrition",
      format: file.mimetype.split("/")[1],
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    };
  },
});

const upload = multer({ storage });

export default upload;
