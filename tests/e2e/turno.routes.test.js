// tests/e2e/turno.routes.test.js
import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connect, closeDatabase, clearDatabase } from "../setup/db.js";
import { createApp } from "../setup/createApp.js";
import Usuario from "../../models/Usuario.js";
import Turno from "../../models/Turno.js";
import ConfigHorario from "../../models/ConfigHorario.js";

const app = createApp();

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

// ─── Helpers ─────────────────────────────────────────────────────────────────

const crearUsuarioDB = async (overrides = {}) => {
  return await Usuario.create({
    nombre: "Test",
    apellido: "User",
    email: `user${Date.now()}@test.com`,
    password: bcrypt.hashSync("pass123", bcrypt.genSaltSync(10)),
    telefono: "1234567890",
    rol: "USER_ROLE",
    estado: true,
    ...overrides,
  });
};

const generarToken = (usuario) =>
  jwt.sign({ uid: usuario._id, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: "1h" });

const proximoLunes = () => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}T12:00:00`;
};

const crearTurnoDirecto = async (usuarioId, overrides = {}) => {
  return await Turno.create({
    usuario: usuarioId,
    productos: [],
    fecha: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    horaInicio: "10:00",
    metodoPago: "transferencia",
    total: 1000,
    seña: 500,
    estado: "pendiente",
    ...overrides,
  });
};

// ─── POST /api/turnos ─────────────────────────────────────────────────────────

describe("POST /api/turnos", () => {
  let usuario, token;

  beforeEach(async () => {
    usuario = await crearUsuarioDB();
    token = generarToken(usuario);
    await ConfigHorario.create({
      diasLaborales: [1, 2, 3, 4, 5],
      horaInicio: "09:00",
      horaFin: "18:00",
      duracionTurno: 60,
    });
  });

  it("crea un turno y retorna 201", async () => {
    const fecha = proximoLunes();
    // El route requiere al menos 1 producto (isArray({ min: 1 }))
    const fakeProductoId = "64a1b2c3d4e5f6a7b8c9d0e1";
    const res = await request(app)
      .post("/api/turnos")
      .set("x-token", token)
      .send({ productos: [fakeProductoId], fecha, horaInicio: "10:00", metodoPago: "transferencia", total: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe("pendiente");
    expect(res.body.seña).toBe(500);
  });

  it("retorna 401 sin token", async () => {
    const res = await request(app).post("/api/turnos").send({});
    expect(res.status).toBe(401);
  });

  it("retorna 400 si la fecha no es ISO8601 valida", async () => {
    const res = await request(app)
      .post("/api/turnos")
      .set("x-token", token)
      .send({ productos: [], fecha: "no-es-fecha", horaInicio: "10:00", metodoPago: "transferencia", total: 1000 });
    expect(res.status).toBe(400);
  });

  it("retorna 400 si el metodo de pago no es valido", async () => {
    const fecha = proximoLunes();
    const res = await request(app)
      .post("/api/turnos")
      .set("x-token", token)
      .send({ productos: [], fecha, horaInicio: "10:00", metodoPago: "efectivo", total: 1000 });
    expect(res.status).toBe(400);
  });

  it("retorna 400 si el total es negativo", async () => {
    const fecha = proximoLunes();
    const res = await request(app)
      .post("/api/turnos")
      .set("x-token", token)
      .send({ productos: [], fecha, horaInicio: "10:00", metodoPago: "transferencia", total: -100 });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/turnos/mis-turnos ───────────────────────────────────────────────

describe("GET /api/turnos/mis-turnos", () => {
  it("retorna los turnos del usuario autenticado", async () => {
    const usuario = await crearUsuarioDB();
    const token = generarToken(usuario);
    await crearTurnoDirecto(usuario._id);
    await crearTurnoDirecto(usuario._id);
    const res = await request(app)
      .get("/api/turnos/mis-turnos")
      .set("x-token", token);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("retorna 401 sin token", async () => {
    const res = await request(app).get("/api/turnos/mis-turnos");
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/turnos/admin ────────────────────────────────────────────────────

describe("GET /api/turnos/admin", () => {
  it("retorna todos los turnos paginados para el admin", async () => {
    const admin = await crearUsuarioDB({ rol: "ADMIN_ROLE" });
    const tokenAdmin = generarToken(admin);
    const usuario = await crearUsuarioDB();
    await crearTurnoDirecto(usuario._id);
    const res = await request(app)
      .get("/api/turnos/admin")
      .set("x-token", tokenAdmin);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("turnos");
    expect(res.body).toHaveProperty("totalPaginas");
  });

  it("retorna 403 si el usuario no es admin", async () => {
    const usuario = await crearUsuarioDB();
    const token = generarToken(usuario);
    const res = await request(app)
      .get("/api/turnos/admin")
      .set("x-token", token);
    expect(res.status).toBe(403);
  });

  it("retorna 401 sin token", async () => {
    const res = await request(app).get("/api/turnos/admin");
    expect(res.status).toBe(401);
  });

  it("retorna 400 si pagina no es entero positivo", async () => {
    const admin = await crearUsuarioDB({ rol: "ADMIN_ROLE" });
    const tokenAdmin = generarToken(admin);
    const res = await request(app)
      .get("/api/turnos/admin?pagina=0")
      .set("x-token", tokenAdmin);
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/turnos/:id/comprobante ───────────────────────────────────────

describe("PATCH /api/turnos/:id/comprobante", () => {
  it("sube el comprobante y transiciona a senado", async () => {
    const usuario = await crearUsuarioDB();
    const token = generarToken(usuario);
    const turno = await crearTurnoDirecto(usuario._id, { estado: "pendiente" });
    const res = await request(app)
      .patch(`/api/turnos/${turno._id}/comprobante`)
      .set("x-token", token)
      .send({ comprobante: "https://cloudinary.com/comp.jpg" });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("señado");
  });

  it("retorna 400 si no se envia la URL del comprobante", async () => {
    const usuario = await crearUsuarioDB();
    const token = generarToken(usuario);
    const turno = await crearTurnoDirecto(usuario._id);
    const res = await request(app)
      .patch(`/api/turnos/${turno._id}/comprobante`)
      .set("x-token", token)
      .send({});
    expect(res.status).toBe(400);
  });

  it("retorna 400 con ID de turno invalido", async () => {
    const usuario = await crearUsuarioDB();
    const token = generarToken(usuario);
    const res = await request(app)
      .patch("/api/turnos/id-invalido/comprobante")
      .set("x-token", token)
      .send({ comprobante: "https://url.com" });
    expect(res.status).toBe(400);
  });

  it("retorna 403 si el usuario no es el dueno del turno", async () => {
    const dueno = await crearUsuarioDB();
    const otro = await crearUsuarioDB();
    const tokenOtro = generarToken(otro);
    const turno = await crearTurnoDirecto(dueno._id, { estado: "pendiente" });
    const res = await request(app)
      .patch(`/api/turnos/${turno._id}/comprobante`)
      .set("x-token", tokenOtro)
      .send({ comprobante: "https://cloudinary.com/comp.jpg" });
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/turnos/:id/confirmar ─────────────────────────────────────────

describe("PATCH /api/turnos/:id/confirmar", () => {
  it("confirma el turno como admin (senado -> confirmado)", async () => {
    const admin = await crearUsuarioDB({ rol: "ADMIN_ROLE" });
    const tokenAdmin = generarToken(admin);
    const usuario = await crearUsuarioDB();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "señado" });
    const res = await request(app)
      .patch(`/api/turnos/${turno._id}/confirmar`)
      .set("x-token", tokenAdmin);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("confirmado");
  });

  it("retorna 403 si no es admin", async () => {
    const usuario = await crearUsuarioDB();
    const token = generarToken(usuario);
    const turno = await crearTurnoDirecto(usuario._id, { estado: "señado" });
    const res = await request(app)
      .patch(`/api/turnos/${turno._id}/confirmar`)
      .set("x-token", token);
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/turnos/:id/rechazar-pago ─────────────────────────────────────

describe("PATCH /api/turnos/:id/rechazar-pago", () => {
  it("rechaza el pago como admin (senado -> pago_rechazado)", async () => {
    const admin = await crearUsuarioDB({ rol: "ADMIN_ROLE" });
    const tokenAdmin = generarToken(admin);
    const usuario = await crearUsuarioDB();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "señado" });
    const res = await request(app)
      .patch(`/api/turnos/${turno._id}/rechazar-pago`)
      .set("x-token", tokenAdmin)
      .send({ motivo: "Comprobante ilegible" });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("pago_rechazado");
  });

  it("retorna 403 si no es admin", async () => {
    const usuario = await crearUsuarioDB();
    const token = generarToken(usuario);
    const turno = await crearTurnoDirecto(usuario._id, { estado: "señado" });
    const res = await request(app)
      .patch(`/api/turnos/${turno._id}/rechazar-pago`)
      .set("x-token", token);
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/turnos/:id/completar ─────────────────────────────────────────

describe("PATCH /api/turnos/:id/completar", () => {
  it("completa el turno como admin (confirmado -> completado)", async () => {
    const admin = await crearUsuarioDB({ rol: "ADMIN_ROLE" });
    const tokenAdmin = generarToken(admin);
    const usuario = await crearUsuarioDB();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "confirmado" });
    const res = await request(app)
      .patch(`/api/turnos/${turno._id}/completar`)
      .set("x-token", tokenAdmin);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("completado");
  });

  it("retorna 403 si no es admin", async () => {
    const usuario = await crearUsuarioDB();
    const token = generarToken(usuario);
    const turno = await crearTurnoDirecto(usuario._id, { estado: "confirmado" });
    const res = await request(app)
      .patch(`/api/turnos/${turno._id}/completar`)
      .set("x-token", token);
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/turnos/:id/cancelar ──────────────────────────────────────────

describe("PATCH /api/turnos/:id/cancelar", () => {
  it("permite al usuario cancelar su propio turno", async () => {
    const usuario = await crearUsuarioDB();
    const token = generarToken(usuario);
    const turno = await crearTurnoDirecto(usuario._id, { estado: "pendiente" });
    const res = await request(app)
      .patch(`/api/turnos/${turno._id}/cancelar`)
      .set("x-token", token);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("cancelado");
  });

  it("retorna 401 sin token", async () => {
    const usuario = await crearUsuarioDB();
    const turno = await crearTurnoDirecto(usuario._id);
    const res = await request(app).patch(`/api/turnos/${turno._id}/cancelar`);
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/turnos/:id/cambiar-horario ────────────────────────────────────

describe("PATCH /api/turnos/:id/cambiar-horario", () => {
  const nuevoLunes = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}T12:00:00`;
  };

  it("cambia el horario del turno", async () => {
    const usuario = await crearUsuarioDB();
    const token = generarToken(usuario);
    const turno = await crearTurnoDirecto(usuario._id, { estado: "pendiente" });
    const res = await request(app)
      .patch(`/api/turnos/${turno._id}/cambiar-horario`)
      .set("x-token", token)
      .send({ fecha: nuevoLunes(), horaInicio: "11:00" });
    expect(res.status).toBe(200);
    expect(res.body.horaInicio).toBe("11:00");
  });

  it("retorna 400 si la hora tiene formato invalido", async () => {
    const usuario = await crearUsuarioDB();
    const token = generarToken(usuario);
    const turno = await crearTurnoDirecto(usuario._id);
    const res = await request(app)
      .patch(`/api/turnos/${turno._id}/cambiar-horario`)
      .set("x-token", token)
      .send({ fecha: nuevoLunes(), horaInicio: "25:00" });
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/turnos/:id ───────────────────────────────────────────────────

describe("DELETE /api/turnos/:id", () => {
  it("elimina un turno cancelado como admin", async () => {
    const admin = await crearUsuarioDB({ rol: "ADMIN_ROLE" });
    const tokenAdmin = generarToken(admin);
    const usuario = await crearUsuarioDB();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "cancelado" });
    const res = await request(app)
      .delete(`/api/turnos/${turno._id}`)
      .set("x-token", tokenAdmin);
    expect(res.status).toBe(200);
    expect(res.body.msg).toMatch(/eliminado/i);
  });

  it("retorna 400 si el turno no esta cancelado", async () => {
    const admin = await crearUsuarioDB({ rol: "ADMIN_ROLE" });
    const tokenAdmin = generarToken(admin);
    const usuario = await crearUsuarioDB();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "pendiente" });
    const res = await request(app)
      .delete(`/api/turnos/${turno._id}`)
      .set("x-token", tokenAdmin);
    expect(res.status).toBe(400);
  });

  it("retorna 403 si no es admin", async () => {
    const usuario = await crearUsuarioDB();
    const token = generarToken(usuario);
    const turno = await crearTurnoDirecto(usuario._id, { estado: "cancelado" });
    const res = await request(app)
      .delete(`/api/turnos/${turno._id}`)
      .set("x-token", token);
    expect(res.status).toBe(403);
  });
});
