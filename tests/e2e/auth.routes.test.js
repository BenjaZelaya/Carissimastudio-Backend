// tests/e2e/auth.routes.test.js
import { describe, it, expect, beforeAll, afterEach, afterAll } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connect, closeDatabase, clearDatabase } from "../setup/db.js";
import { createApp } from "../setup/createApp.js";
import Usuario from "../../models/Usuario.js";

const app = createApp();

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

const datosRegistro = {
  nombre: "Ana",
  apellido: "Lopez",
  email: "ana@test.com",
  password: "password123",
  telefono: "1122334455",
};

describe("POST /api/auth/register", () => {
  it("registra un usuario y retorna 201", async () => {
    const res = await request(app).post("/api/auth/register").send(datosRegistro);
    expect(res.status).toBe(201);
    expect(res.body.msg).toMatch(/registrado/i);
    expect(res.body.usuario.email).toBe("ana@test.com");
    expect(res.body.usuario.password).toBeUndefined();
  });

  it("retorna 400 si faltan campos obligatorios", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@b.com" });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("retorna 400 si el email no es valido", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...datosRegistro, email: "no-es-email" });
    expect(res.status).toBe(400);
  });

  it("retorna 400 si la contrasena tiene menos de 6 caracteres", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...datosRegistro, password: "12345" });
    expect(res.status).toBe(400);
  });

  it("retorna 400 si el telefono tiene caracteres no numericos", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...datosRegistro, telefono: "12345abc" });
    expect(res.status).toBe(400);
  });

  it("retorna 409 si el email ya esta registrado", async () => {
    await request(app).post("/api/auth/register").send(datosRegistro);
    const res = await request(app).post("/api/auth/register").send(datosRegistro);
    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    const salt = bcrypt.genSaltSync(10);
    await Usuario.create({
      ...datosRegistro,
      password: bcrypt.hashSync(datosRegistro.password, salt),
    });
  });

  it("hace login con credenciales correctas y retorna token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: datosRegistro.email, password: datosRegistro.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario).toBeDefined();
    expect(res.body.usuario.password).toBeUndefined();
  });

  it("retorna 401 con contrasena incorrecta", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: datosRegistro.email, password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  it("retorna 401 con email inexistente", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "noexiste@test.com", password: "pass123" });
    expect(res.status).toBe(401);
  });

  it("retorna 400 si no se envia email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "pass123" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/renovar", () => {
  it("renueva el token con un JWT valido", async () => {
    const usuario = await Usuario.create({
      ...datosRegistro,
      email: "renovar@test.com",
      password: bcrypt.hashSync("pass123", bcrypt.genSaltSync(10)),
    });
    const token = jwt.sign(
      { uid: usuario._id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const res = await request(app)
      .get("/api/auth/renovar")
      .set("x-token", token);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("retorna 401 si no se envia el token", async () => {
    const res = await request(app).get("/api/auth/renovar");
    expect(res.status).toBe(401);
  });

  it("retorna 401 si el token es invalido", async () => {
    const res = await request(app)
      .get("/api/auth/renovar")
      .set("x-token", "token.invalido.falso");
    expect(res.status).toBe(401);
  });

  it("retorna 401 si el usuario del token no existe en la BD", async () => {
    const token = jwt.sign(
      { uid: "64a1b2c3d4e5f6a7b8c9d0e1", rol: "USER_ROLE" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const res = await request(app)
      .get("/api/auth/renovar")
      .set("x-token", token);
    expect(res.status).toBe(401);
  });
});
