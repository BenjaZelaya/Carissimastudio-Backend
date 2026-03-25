// middlewares/upload.js
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Usamos memoria en vez de multer-storage-cloudinary
export const upload = multer({ storage: multer.memoryStorage() });

// Sube el buffer a Cloudinary manualmente
export const subirACloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "carissima-studio",
        transformation: [{ width: 800, crop: "limit" }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
};