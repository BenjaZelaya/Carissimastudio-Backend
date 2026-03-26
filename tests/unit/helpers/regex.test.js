// tests/unit/helpers/regex.test.js
import { describe, it, expect } from "@jest/globals";
import { escapeRegex, busquedaExacta } from "../../../helpers/regex.js";

describe("escapeRegex", () => {
  it("devuelve la misma cadena si no tiene caracteres especiales", () => {
    expect(escapeRegex("hello")).toBe("hello");
    expect(escapeRegex("Carissima Studio")).toBe("Carissima Studio");
  });

  it("escapa el punto", () => {
    expect(escapeRegex("a.b")).toBe("a\\.b");
  });

  it("escapa el asterisco", () => {
    expect(escapeRegex("a*b")).toBe("a\\*b");
  });

  it("escapa todos los caracteres especiales de regex", () => {
    const especiales = ".*+?^${}()|[]\\";
    const escapado = escapeRegex(especiales);
    // El resultado debe poder compilarse como regex sin errores
    expect(() => new RegExp(escapado)).not.toThrow();
    // El resultado debe matchear la cadena original literalmente
    expect(new RegExp(escapado).test(especiales)).toBe(true);
  });

  it("previene inyeccion de regex: '.*' no actua como wildcard", () => {
    const escapado = escapeRegex(".*");
    expect(escapado).toBe("\\.\\*");
    expect(new RegExp(escapado).test("cualquier cosa")).toBe(false);
    expect(new RegExp(escapado).test(".*")).toBe(true);
  });

  it("escapa parentesis y llaves", () => {
    expect(escapeRegex("(test)")).toBe("\\(test\\)");
    expect(escapeRegex("{3}")).toBe("\\{3\\}");
  });
});

describe("busquedaExacta", () => {
  it("retorna un objeto con clave $regex de tipo RegExp", () => {
    const resultado = busquedaExacta("Hola");
    expect(resultado).toHaveProperty("$regex");
    expect(resultado.$regex).toBeInstanceOf(RegExp);
  });

  it("matchea la cadena exacta independientemente de mayusculas", () => {
    const { $regex } = busquedaExacta("Hola");
    expect($regex.test("Hola")).toBe(true);
    expect($regex.test("hola")).toBe(true);
    expect($regex.test("HOLA")).toBe(true);
    expect($regex.test("HoLa")).toBe(true);
  });

  it("no matchea cadenas parciales", () => {
    const { $regex } = busquedaExacta("Hola");
    expect($regex.test("Hola Mundo")).toBe(false);
    expect($regex.test("Di Hola")).toBe(false);
    expect($regex.test("Holaa")).toBe(false);
  });

  it("no matchea cadena vacia contra un valor con contenido", () => {
    const { $regex } = busquedaExacta("Test");
    expect($regex.test("")).toBe(false);
  });

  it("escapa inyeccion de regex en el valor de busqueda", () => {
    const { $regex } = busquedaExacta(".*");
    expect($regex.test("cualquier cosa")).toBe(false);
    expect($regex.test(".*")).toBe(true);
  });

  it("maneja nombres con caracteres especiales de regex", () => {
    const { $regex } = busquedaExacta("Precio (Oferta)");
    expect($regex.test("Precio (Oferta)")).toBe(true);
    expect($regex.test("Precio Oferta")).toBe(false);
  });
});
