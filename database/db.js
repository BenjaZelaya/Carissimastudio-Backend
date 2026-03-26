// database/db.js
import mongoose from "mongoose";
import logger from "../helpers/logger.js";

/**
 * Establece la conexion con MongoDB usando la URI definida en MONGO_URI.
 * Termina el proceso con codigo 1 si la conexion falla.
 */
export const dbConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("MongoDB conectado correctamente");
  } catch (error) {
    logger.error({ message: "Error al conectar a MongoDB", stack: error.stack });
    process.exit(1);
  }
};