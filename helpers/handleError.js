// helpers/handleError.js
import { AppError } from "./AppError.js";

const handleError = (res, error) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ msg: error.message });
  }
  console.error(error);
  return res.status(500).json({ msg: "Error interno del servidor" });
};

export { handleError };
