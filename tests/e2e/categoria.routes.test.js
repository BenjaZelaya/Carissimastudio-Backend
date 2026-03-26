// tests/e2e/categoria.routes.test.js
import { describe, it, expect, beforeAll, afterEach, afterAll } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connect, closeDatabase, clearDatabase } from "../setup/db.js";
import { createApp } from "../setup/createApp.js";
import Usuario from "../../models/Usuario.js";
import Categoria from "../../models/Categoria.js";
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

const crearCategoriaDB = (overrides = {}) =>
  Categoria.create({ nombreCategoria: "Cejas", descripcion: "Servicios para cejas y laminado", ...overrides });

describe("GET /api/categorias", () => {
  it("retorna categorias activas sin autenticacion", async () => {
    await crearCategoriaDB();
    const res = await request(app).get("/api/categorias");
    expect(res.status).toBe(200);
    expect(res.body.categorias).toBeDefined();
  });

  it("respeta paginacion", async () => {
    await crearCategoriaDB({ nombreCategoria: "Cat1" });
    await crearCategoriaDB({ nombreCategoria: "Cat2" });
    const res = await request(app).get("/api/categorias?page=1&limit=1");
    expect(res.status).toBe(200);
    expect(res.body.categorias).toHaveLength(1);
  });

  it("retorna 400 con parametro de paginacion invalido", async () => {
    const res = await request(app).get("/api/categorias?page=0");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/categorias/admin", () => {
  it("retorna todas las categorias como admin", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    await crearCategoriaDB({ nombreCategoria: "Activa" });
    await crearCategoriaDB({ nombreCategoria: "Inactiva", estado: false });
    const res = await request(app)
      .get("/api/categorias/admin")
      .set("x-token", token(admin));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
  });

  it("retorna 403 si no es admin", async () => {
    const user = await crearUsuario();
    const res = await request(app).get("/api/categorias/admin").set("x-token", token(user));
    expect(res.status).toBe(403);
  });
});

describe("GET /api/categorias/:id", () => {
  it("retorna la categoria activa por ID sin auth", async () => {
    const cat = await crearCategoriaDB();
    const res = await request(app).get(`/api/categorias/${cat._id}`);
    expect(res.status).toBe(200);
    expect(res.body.nombreCategoria).toBe("Cejas");
  });

  it("retorna 404 si la categoria no existe", async () => {
    const res = await request(app).get("/api/categorias/64a1b2c3d4e5f6a7b8c9d0e1");
    expect(res.status).toBe(404);
  });

  it("retorna 400 con ID invalido", async () => {
    const res = await request(app).get("/api/categorias/id-invalido");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/categorias", () => {
  it("crea una categoria como admin", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const res = await request(app)
      .post("/api/categorias")
      .set("x-token", token(admin))
      .send({ nombreCategoria: "Pestanas", descripcion: "Servicios de extension de pestanas" });
    expect(res.status).toBe(201);
    expect(res.body.nombreCategoria).toBe("Pestanas");
  });

  it("retorna 409 si el nombre ya existe", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    await crearCategoriaDB({ nombreCategoria: "Cejas" });
    const res = await request(app)
      .post("/api/categorias")
      .set("x-token", token(admin))
      .send({ nombreCategoria: "Cejas" });
    expect(res.status).toBe(409);
  });

  it("retorna 400 si falta el nombre", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const res = await request(app)
      .post("/api/categorias")
      .set("x-token", token(admin))
      .send({});
    expect(res.status).toBe(400);
  });

  it("retorna 403 si no es admin", async () => {
    const user = await crearUsuario();
    const res = await request(app)
      .post("/api/categorias")
      .set("x-token", token(user))
      .send({ nombreCategoria: "Test" });
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/categorias/:id", () => {
  it("actualiza una categoria como admin", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const cat = await crearCategoriaDB();
    const res = await request(app)
      .put(`/api/categorias/${cat._id}`)
      .set("x-token", token(admin))
      .send({ nombreCategoria: "Cejas Nuevo" });
    expect(res.status).toBe(200);
    expect(res.body.nombreCategoria).toBe("Cejas Nuevo");
  });

  it("retorna 404 si la categoria no existe", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const res = await request(app)
      .put("/api/categorias/64a1b2c3d4e5f6a7b8c9d0e1")
      .set("x-token", token(admin))
      .send({ nombreCategoria: "Nuevo" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/categorias/:id", () => {
  it("hace soft delete de una categoria como admin", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const cat = await crearCategoriaDB();
    const res = await request(app)
      .delete(`/api/categorias/${cat._id}`)
      .set("x-token", token(admin));
    expect(res.status).toBe(200);
    expect(res.body.msg).toMatch(/desactivada/i);
  });

  it("retorna 403 si no es admin", async () => {
    const user = await crearUsuario();
    const cat = await crearCategoriaDB();
    const res = await request(app)
      .delete(`/api/categorias/${cat._id}`)
      .set("x-token", token(user));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/categorias/:id/restaurar", () => {
  it("restaura una categoria inactiva como admin", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const cat = await crearCategoriaDB({ estado: false });
    const res = await request(app)
      .patch(`/api/categorias/${cat._id}/restaurar`)
      .set("x-token", token(admin));
    expect(res.status).toBe(200);
    expect(res.body.categoria.estado).toBe(true);
  });
});

describe("PATCH /api/categorias/:id/agregar-producto", () => {
  it("agrega un producto a la categoria", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const cat = await crearCategoriaDB();
    const prod = await Producto.create({
      nombreProducto: "Henna",
      precio: 1500,
      img: "https://res.cloudinary.com/test/image/upload/test.jpg",
    });
    const res = await request(app)
      .patch(`/api/categorias/${cat._id}/agregar-producto`)
      .set("x-token", token(admin))
      .send({ productoId: prod._id.toString() });
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/categorias/:id/quitar-producto", () => {
  it("quita un producto de la categoria", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const cat = await crearCategoriaDB();
    const prod = await Producto.create({
      nombreProducto: "Henna",
      precio: 1500,
      img: "https://res.cloudinary.com/test/image/upload/test.jpg",
    });
    await Categoria.findByIdAndUpdate(cat._id, { $push: { productos: prod._id } });
    const res = await request(app)
      .patch(`/api/categorias/${cat._id}/quitar-producto`)
      .set("x-token", token(admin))
      .send({ productoId: prod._id.toString() });
    expect(res.status).toBe(200);
  });
});
