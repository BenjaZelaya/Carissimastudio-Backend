// tests/unit/helpers/validarCampos.test.js
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

jest.unstable_mockModule("express-validator", () => ({
  validationResult: jest.fn(),
}));

const { validarCampos } = await import("../../../helpers/validar-campos.js");
const { validationResult } = await import("express-validator");

describe("validarCampos", () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("llama a next() cuando no hay errores de validacion", () => {
    validationResult.mockReturnValue({ isEmpty: () => true });
    validarCampos(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("responde con 400 y los errores cuando hay validaciones fallidas", () => {
    const erroresMock = [
      { type: "field", msg: "El nombre es obligatorio", path: "nombre" },
    ];
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => erroresMock,
    });
    validarCampos(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ errors: erroresMock });
    expect(next).not.toHaveBeenCalled();
  });

  it("no llama a next() cuando hay errores", () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: "error" }],
    });
    validarCampos(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });
});
