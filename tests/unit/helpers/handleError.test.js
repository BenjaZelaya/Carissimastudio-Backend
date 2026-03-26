// tests/unit/helpers/handleError.test.js
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Registrar el mock ANTES de importar cualquier modulo que use logger
jest.unstable_mockModule("../../../helpers/logger.js", () => ({
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Importaciones dinamicas (deben ser posteriores al mock)
const { AppError } = await import("../../../helpers/AppError.js");
const { handleError } = await import("../../../helpers/handleError.js");
const logger = (await import("../../../helpers/logger.js")).default;

describe("handleError", () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("responde con el statusCode y mensaje del AppError", () => {
    const err = new AppError("No encontrado", 404);
    handleError(res, err);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ msg: "No encontrado" });
  });

  it("responde con 409 para AppError de conflicto", () => {
    const err = new AppError("Ya existe", 409);
    handleError(res, err);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ msg: "Ya existe" });
  });

  it("responde con 500 para errores genericos", () => {
    const err = new Error("Fallo inesperado de BD");
    handleError(res, err);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ msg: "Error interno del servidor" });
  });

  it("llama a logger.error para errores genericos", () => {
    const err = new Error("Fallo critico");
    handleError(res, err);
    expect(logger.error).toHaveBeenCalledWith({
      message: "Fallo critico",
      stack: expect.any(String),
    });
  });

  it("no llama a logger.error para AppError", () => {
    const err = new AppError("Error controlado", 400);
    handleError(res, err);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
