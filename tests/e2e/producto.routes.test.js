// tests/e2e/producto.routes.test.js
import { describe, it, expect, beforeAll, afterEach, afterAll } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connect, closeDatabase, clearDatabase } from "../setup/db.js";
import { createApp } from "../setup/createApp.js";
import Usuario from "../../models/Usuario.js";
import Producto from "../../models/Producto.js";

const app = createApp();

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

const crearUsuario = (rol = "USER_ROLE") =>
  Usuario.create({
    nombre: "Test", apellido: "User",
    email: `test${Date.now()}@test.com`,
    password: bcrypt.hashSync("pass123", bcrypt.genSaltSync(10)),
    telefono: "1234567890", rol, estado: true,
  });

const token = (u) => jwt.sign({ uid: u._id, rol: u.rol }, process.env.JWT_SECRET, { expiresIn: "1h" });

const imgValida = "https://res.cloudinary.com/test/image/upload/test.jpg";

const crearProductoDB = (overrides = {}) =>
  Producto.create({ nombreProducto: "Laminado", precio: 3500, img: imgValida, ...overrides });

describe("GET /api/productos", () => {
  it("retorna productos activos sin autenticacion", async () => {
    await crearProductoDB();
    const res = await request(app).get("/api/productos");
    expect(res.status).toBe(200);
    expect(res.body.productos).toBeDefined();
  });

  it("respeta paginacion", async () => {
    await crearProductoDB({ nombreProducto: "Prod1" });
    await crearProductoDB({ nombreProducto: "Prod2" });
    const res = await request(app).get("/api/productos?page=1&limit=1");
    expect(res.status).toBe(200);
    expect(res.body.productos).toHaveLength(1);
  });
});

describe("GET /api/productos/admin", () => {
  it("retorna todos los productos como admin", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    await crearProductoDB({ nombreProducto: "Activo" });
    await crearProductoDB({ nombreProducto: "Inactivo", estado: false });
    const res = await request(app)
      .get("/api/productos/admin")
      .set("x-token", token(admin));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
  });

  it("retorna 403 si no es admin", async () => {
    const user = await crearUsuario();
    const res = await request(app).get("/api/productos/admin").set("x-token", token(user));
    expect(res.status).toBe(403);
  });
});

describe("GET /api/productos/:id", () => {
  it("retorna el producto activo por ID", async () => {
    const prod = await crearProductoDB();
    const res = await request(app).get(`/api/productos/${prod._id}`);
    expect(res.status).toBe(200);
    expect(res.body.nombreProducto).toBe("Laminado");
  });

  it("retorna 404 si el producto no existe", async () => {
    const res = await request(app).get("/api/productos/64a1b2c3d4e5f6a7b8c9d0e1");
    expect(res.status).toBe(404);
  });

  it("retorna 400 con ID invalido", async () => {
    const res = await request(app).get("/api/productos/id-invalido");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/productos", () => {
  it("crea un producto como admin", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const res = await request(app)
      .post("/api/productos")
      .set("x-token", token(admin))
      .send({ nombreProducto: "Extension de pestanas", precio: 4500, img: imgValida });
    expect(res.status).toBe(201);
    expect(res.body.nombreProducto).toBe("Extension de pestanas");
  });

  it("retorna 409 si el nombre ya existe", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    await crearProductoDB({ nombreProducto: "Laminado" });
    const res = await request(app)
      .post("/api/productos")
      .set("x-token", token(admin))
      .send({ nombreProducto: "Laminado", precio: 1000, img: imgValida });
    expect(res.status).toBe(409);
  });

  it("retorna 400 si la URL de imagen no es de Cloudinary", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const res = await request(app)
      .post("/api/productos")
      .set("x-token", token(admin))
      .send({ nombreProducto: "Test", precio: 1000, img: "https://otro.com/img.jpg" });
    expect(res.status).toBe(400);
  });

  it("retorna 403 si no es admin", async () => {
    const user = await crearUsuario();
    const res = await request(app)
      .post("/api/productos")
      .set("x-token", token(user))
      .send({ nombreProducto: "Test", precio: 1000, img: imgValida });
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/productos/:id", () => {
  it("actualiza un producto como admin", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const prod = await crearProductoDB();
    const res = await request(app)
      .put(`/api/productos/${prod._id}`)
      .set("x-token", token(admin))
      .send({ precio: 4000 });
    expect(res.status).toBe(200);
    expect(res.body.precio).toBe(4000);
  });

  it("retorna 404 si el producto no existe", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const res = await request(app)
      .put("/api/productos/64a1b2c3d4e5f6a7b8c9d0e1")
      .set("x-token", token(admin))
      .send({ precio: 1000 });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/productos/:id", () => {
  it("hace soft delete de un producto como admin", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const prod = await crearProductoDB();
    const res = await request(app)
      .delete(`/api/productos/${prod._id}`)
      .set("x-token", token(admin));
    expect(res.status).toBe(200);
    expect(res.body.msg).toMatch(/desactivado/i);
  });

  it("retorna 403 si no es admin", async () => {
    const user = await crearUsuario();
    const prod = await crearProductoDB();
    const res = await request(app)
      .delete(`/api/productos/${prod._id}`)
      .set("x-token", token(user));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/productos/:id/restaurar", () => {
  it("restaura un producto inactivo como admin", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const prod = await crearProductoDB({ estado: false });
    const res = await request(app)
      .patch(`/api/productos/${prod._id}/restaurar`)
      .set("x-token", token(admin));
    expect(res.status).toBe(200);
    expect(res.body.producto.estado).toBe(true);
  });
});
