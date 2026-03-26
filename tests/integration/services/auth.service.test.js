// tests/integration/services/auth.service.test.js
import { describe, it, expect, beforeAll, afterEach, afterAll } from "@jest/globals";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connect, closeDatabase, clearDatabase } from "../../setup/db.js";
import { registrar, login, renovarToken } from "../../../services/auth.js";
import Usuario from "../../../models/Usuario.js";

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

const datosBase = {
  nombre: "Ana",
  apellido: "Lopez",
  email: "ana@test.com",
  password: "password123",
  telefono: "1122334455",
};

describe("auth service - registrar", () => {
  it("crea un usuario con la contrasena hasheada", async () => {
    const usuario = await registrar(datosBase);
    expect(usuario._id).toBeDefined();
    expect(usuario.email).toBe("ana@test.com");
    const passwordValida = bcrypt.compareSync("password123", usuario.password);
    expect(passwordValida).toBe(true);
  });

  it("asigna el rol USER_ROLE por defecto", async () => {
    const usuario = await registrar(datosBase);
    expect(usuario.rol).toBe("USER_ROLE");
  });

  it("lanza AppError 409 si el email ya esta registrado", async () => {
    await registrar(datosBase);
    await expect(registrar(datosBase)).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("ya está registrado"),
    });
  });
});

describe("auth service - login", () => {
  beforeAll(async () => {
    // Crear usuario activo para los tests de login
    const salt = bcrypt.genSaltSync(10);
    await Usuario.create({
      ...datosBase,
      password: bcrypt.hashSync(datosBase.password, salt),
    });
  });

  it("retorna usuario y token con credenciales correctas", async () => {
    const resultado = await login({ email: datosBase.email, password: datosBase.password });
    expect(resultado.usuario).toBeDefined();
    expect(resultado.token).toBeDefined();
    const payload = jwt.verify(resultado.token, process.env.JWT_SECRET);
    expect(payload.uid).toBeDefined();
    expect(payload.rol).toBe("USER_ROLE");
  });

  it("lanza AppError 401 con contrasena incorrecta", async () => {
    await expect(
      login({ email: datosBase.email, password: "wrongpassword" })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("lanza AppError 401 con email inexistente", async () => {
    await expect(
      login({ email: "noexiste@test.com", password: "cualquiera" })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("lanza AppError 401 si el usuario esta inactivo", async () => {
    await Usuario.findOneAndUpdate({ email: datosBase.email }, { estado: false });
    await expect(
      login({ email: datosBase.email, password: datosBase.password })
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe("auth service - renovarToken", () => {
  it("retorna un token JWT valido con uid y rol", async () => {
    const usuario = await registrar(datosBase);
    const resultado = await renovarToken(usuario);
    expect(resultado.token).toBeDefined();
    const payload = jwt.verify(resultado.token, process.env.JWT_SECRET);
    expect(payload.uid.toString()).toBe(usuario._id.toString());
    expect(payload.rol).toBe("USER_ROLE");
  });
});
