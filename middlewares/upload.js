// middlewares/upload.js
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Middleware de multer con almacenamiento en memoria.
 * El archivo queda disponible en req.file.buffer para luego
 * ser enviado a Cloudinary via subirACloudinary.
 */
export const upload = multer({ storage: multer.memoryStorage() });

/**
 * Sube un buffer de imagen a Cloudinary y devuelve el resultado.
 * Las imagenes se almacenan en la carpeta "carissima-studio" y se
 * redimensionan a un maximo de 800px de ancho.
 *
 * @param {Buffer} buffer - Buffer del archivo a subir.
 * @returns {Promise<import("cloudinary").UploadApiResponse>} Resultado de Cloudinary con url, public_id, etc.
 */
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
      },
    );
    Readable.from(buffer).pipe(stream);
  });
};