// tests/unit/helpers/AppError.test.js
import { describe, it, expect } from "@jest/globals";
import { AppError } from "../../../helpers/AppError.js";

describe("AppError", () => {
  it("almacena el mensaje y el statusCode indicados", () => {
    const err = new AppError("Recurso no encontrado", 404);
    expect(err.message).toBe("Recurso no encontrado");
    expect(err.statusCode).toBe(404);
  });

  it("usa 400 como statusCode por defecto", () => {
    const err = new AppError("Datos inválidos");
    expect(err.statusCode).toBe(400);
  });

  it("es instancia de Error", () => {
    const err = new AppError("error");
    expect(err).toBeInstanceOf(Error);
  });

  it("tiene name igual a AppError", () => {
    const err = new AppError("error");
    expect(err.name).toBe("AppError");
  });

  it("conserva el stack trace", () => {
    const err = new AppError("error");
    expect(err.stack).toBeDefined();
  });
});
