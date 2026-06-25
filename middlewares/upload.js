// middlewares/upload.js
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];

/**
 * Middleware de multer con almacenamiento en memoria.
 * El archivo queda disponible en req.file.buffer para luego
 * ser enviado a Cloudinary via subirACloudinary.
 * Limita el tamaño a 5MB y sólo acepta imágenes JPEG/PNG/WEBP.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
      return cb(new Error("Tipo de archivo no permitido. Solo se aceptan imágenes JPEG, PNG o WEBP."));
    }
    cb(null, true);
  },
});

/**
 * Middleware de manejo de errores para upload.single/array. Multer (o el
 * fileFilter de arriba) llama a next(err) en vez de lanzar dentro del
 * handler async, por lo que sin esto el error se propaga como 500 genérico.
 * Debe montarse inmediatamente después de upload.single(...)/upload.array(...).
 */
export const manejarErrorUpload = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ msg: "El archivo no puede superar los 5MB" });
    }
    return res.status(400).json({ msg: "Error al subir el archivo" });
  }
  if (err) {
    return res.status(400).json({ msg: err.message || "Archivo inválido" });
  }
  next();
};

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