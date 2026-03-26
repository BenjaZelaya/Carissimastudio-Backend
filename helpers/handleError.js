// helpers/handleError.js
import { AppError } from "./AppError.js";
import logger from "./logger.js";

/**
 * Maneja errores de controladores y envia la respuesta HTTP apropiada.
 *
 * - Si el error es una instancia de AppError, responde con el codigo y
 *   mensaje definidos al lanzarlo (errores de negocio esperados).
 * - Cualquier otro error se trata como falla interna: se loguea con stack
 *   trace completo y se devuelve un 500 generico al cliente.
 *
 * @param {import("express").Response} res - Objeto de respuesta de Express.
 * @param {Error} error - Error capturado en el bloque catch del controlador.
 */
const handleError = (res, error) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ msg: error.message });
  }
  logger.error({ message: error.message, stack: error.stack });
  return res.status(500).json({ msg: "Error interno del servidor" });
};

export { handleError };
