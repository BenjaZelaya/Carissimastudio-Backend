// tests/e2e/usuario.routes.test.js
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

const crearUsuario = (overrides = {}) =>
  Usuario.create({
    nombre: "Test", apellido: "User",
    email: `test${Date.now()}@test.com`,
    password: bcrypt.hashSync("pass123", bcrypt.genSaltSync(10)),
    telefono: "1234567890", rol: "USER_ROLE", estado: true,
    ...overrides,
  });

const token = (u) => jwt.sign({ uid: u._id, rol: u.rol }, process.env.JWT_SECRET, { expiresIn: "1h" });

describe("GET /api/usuarios", () => {
  it("retorna lista de usuarios como admin", async () => {
    const admin = await crearUsuario({ rol: "ADMIN_ROLE" });
    await crearUsuario();
    const res = await request(app)
      .get("/api/usuarios")
      .set("x-token", token(admin));
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
  });

  it("retorna 403 si no es admin", async () => {
    const user = await crearUsuario();
    const res = await request(app).get("/api/usuarios").set("x-token", token(user));
    expect(res.status).toBe(403);
  });

  it("retorna 401 sin token", async () => {
    const res = await request(app).get("/api/usuarios");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/usuarios/perfil", () => {
  it("retorna el perfil del usuario autenticado", async () => {
    const user = await crearUsuario();
    const res = await request(app)
      .get("/api/usuarios/perfil")
      .set("x-token", token(user));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
  });

  it("retorna 401 sin token", async () => {
    const res = await request(app).get("/api/usuarios/perfil");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/usuarios/:id", () => {
  it("retorna el usuario por ID como admin", async () => {
    const admin = await crearUsuario({ rol: "ADMIN_ROLE" });
    const user = await crearUsuario();
    const res = await request(app)
      .get(`/api/usuarios/${user._id}`)
      .set("x-token", token(admin));
    expect(res.status).toBe(200);
    expect(res.body._id.toString()).toBe(user._id.toString());
  });

  it("retorna 404 si el usuario no existe", async () => {
    const admin = await crearUsuario({ rol: "ADMIN_ROLE" });
    const res = await request(app)
      .get("/api/usuarios/64a1b2c3d4e5f6a7b8c9d0e1")
      .set("x-token", token(admin));
    expect(res.status).toBe(404);
  });

  it("retorna 403 si no es admin", async () => {
    const user = await crearUsuario();
    const res = await request(app)
      .get(`/api/usuarios/${user._id}`)
      .set("x-token", token(user));
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/usuarios/perfil", () => {
  it("actualiza el perfil propio del usuario", async () => {
    const user = await crearUsuario({ nombre: "Viejo" });
    const res = await request(app)
      .put("/api/usuarios/perfil")
      .set("x-token", token(user))
      .send({ nombre: "Nuevo" });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Nuevo");
  });

  it("retorna 400 si no se envia ningun campo valido", async () => {
    const user = await crearUsuario();
    const res = await request(app)
      .put("/api/usuarios/perfil")
      .set("x-token", token(user))
      .send({});
    expect(res.status).toBe(400);
  });

  it("retorna 401 sin token", async () => {
    const res = await request(app).put("/api/usuarios/perfil").send({ nombre: "Test" });
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/usuarios/:id", () => {
  it("actualiza un usuario por ID como admin", async () => {
    const admin = await crearUsuario({ rol: "ADMIN_ROLE" });
    const user = await crearUsuario({ nombre: "Original" });
    const res = await request(app)
      .put(`/api/usuarios/${user._id}`)
      .set("x-token", token(admin))
      .send({ nombre: "Actualizado" });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Actualizado");
  });

  it("retorna 403 si no es admin", async () => {
    const user1 = await crearUsuario();
    const user2 = await crearUsuario();
    const res = await request(app)
      .put(`/api/usuarios/${user2._id}`)
      .set("x-token", token(user1))
      .send({ nombre: "Hack" });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/usuarios/:id", () => {
  it("hace soft delete de un usuario como admin", async () => {
    const admin = await crearUsuario({ rol: "ADMIN_ROLE" });
    const user = await crearUsuario();
    const res = await request(app)
      .delete(`/api/usuarios/${user._id}`)
      .set("x-token", token(admin));
    expect(res.status).toBe(200);
    expect(res.body.msg).toMatch(/desactivado/i);
  });

  it("retorna 403 si no es admin", async () => {
    const user = await crearUsuario();
    const res = await request(app)
      .delete(`/api/usuarios/${user._id}`)
      .set("x-token", token(user));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/usuarios/:id/restaurar", () => {
  it("restaura un usuario inactivo como admin", async () => {
    const admin = await crearUsuario({ rol: "ADMIN_ROLE" });
    const user = await crearUsuario({ estado: false });
    const res = await request(app)
      .patch(`/api/usuarios/${user._id}/restaurar`)
      .set("x-token", token(admin));
    expect(res.status).toBe(200);
    expect(res.body.usuario.estado).toBe(true);
  });
});
