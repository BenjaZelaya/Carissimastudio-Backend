// tests/e2e/horario.routes.test.js
import { describe, it, expect, beforeAll, afterEach, afterAll } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connect, closeDatabase, clearDatabase } from "../setup/db.js";
import { createApp } from "../setup/createApp.js";
import Usuario from "../../models/Usuario.js";
import Bloqueo from "../../models/Bloqueo.js";

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

describe("GET /api/horarios/config", () => {
  it("retorna la configuracion de horario sin auth", async () => {
    const res = await request(app).get("/api/horarios/config");
    expect(res.status).toBe(200);
    expect(res.body.diasLaborales).toBeDefined();
    expect(res.body.horaInicio).toBeDefined();
    expect(res.body.horaFin).toBeDefined();
  });
});

describe("PUT /api/horarios/config", () => {
  it("actualiza la configuracion como admin", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const res = await request(app)
      .put("/api/horarios/config")
      .set("x-token", token(admin))
      .send({ horaInicio: "10:00", horaFin: "19:00", duracionTurno: 30, diasLaborales: [1, 2, 3] });
    expect(res.status).toBe(200);
    expect(res.body.horaInicio).toBe("10:00");
    expect(res.body.duracionTurno).toBe(30);
  });

  it("retorna 400 si faltan campos obligatorios", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const res = await request(app)
      .put("/api/horarios/config")
      .set("x-token", token(admin))
      .send({ horaInicio: "10:00" });
    expect(res.status).toBe(400);
  });

  it("retorna 403 si no es admin", async () => {
    const user = await crearUsuario();
    const res = await request(app)
      .put("/api/horarios/config")
      .set("x-token", token(user))
      .send({ horaInicio: "09:00", horaFin: "18:00", duracionTurno: 60, diasLaborales: [1, 2, 3, 4, 5] });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/horarios/disponibilidad", () => {
  it("retorna disponibilidad de 14 dias", async () => {
    const res = await request(app)
      .get("/api/horarios/disponibilidad?fecha=2027-06-01");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(14);
  });

  it("retorna 400 con fecha invalida", async () => {
    const res = await request(app)
      .get("/api/horarios/disponibilidad?fecha=no-es-fecha");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/horarios/bloqueos", () => {
  it("retorna lista de bloqueos como admin", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    await Bloqueo.create({ tipo: "dia", fecha: new Date("2027-01-15T12:00:00") });
    const res = await request(app)
      .get("/api/horarios/bloqueos")
      .set("x-token", token(admin));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  it("retorna 403 si no es admin", async () => {
    const user = await crearUsuario();
    const res = await request(app)
      .get("/api/horarios/bloqueos")
      .set("x-token", token(user));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/horarios/bloqueos", () => {
  it("crea un bloqueo de tipo dia como admin", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const res = await request(app)
      .post("/api/horarios/bloqueos")
      .set("x-token", token(admin))
      .send({ tipo: "dia", fecha: "2027-05-01" });
    expect(res.status).toBe(201);
    expect(res.body.tipo).toBe("dia");
  });

  it("crea un bloqueo de tipo horario con horas validas", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const res = await request(app)
      .post("/api/horarios/bloqueos")
      .set("x-token", token(admin))
      .send({ tipo: "horario", fecha: "2027-05-01", horaInicio: "10:00", horaFin: "12:00" });
    expect(res.status).toBe(201);
    expect(res.body.tipo).toBe("horario");
  });

  it("retorna 400 si el tipo es invalido", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const res = await request(app)
      .post("/api/horarios/bloqueos")
      .set("x-token", token(admin))
      .send({ tipo: "semana", fecha: "2027-05-01" });
    expect(res.status).toBe(400);
  });

  it("retorna 400 si tipo horario no tiene horas", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const res = await request(app)
      .post("/api/horarios/bloqueos")
      .set("x-token", token(admin))
      .send({ tipo: "horario", fecha: "2027-05-01" });
    expect(res.status).toBe(400);
  });

  it("retorna 403 si no es admin", async () => {
    const user = await crearUsuario();
    const res = await request(app)
      .post("/api/horarios/bloqueos")
      .set("x-token", token(user))
      .send({ tipo: "dia", fecha: "2027-05-01" });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/horarios/bloqueos/:id", () => {
  it("elimina un bloqueo como admin", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const bloqueo = await Bloqueo.create({ tipo: "dia", fecha: new Date("2027-03-01T12:00:00") });
    const res = await request(app)
      .delete(`/api/horarios/bloqueos/${bloqueo._id}`)
      .set("x-token", token(admin));
    expect(res.status).toBe(200);
    expect(res.body.msg).toMatch(/eliminado/i);
  });

  it("retorna 404 si el bloqueo no existe", async () => {
    const admin = await crearUsuario("ADMIN_ROLE");
    const res = await request(app)
      .delete("/api/horarios/bloqueos/64a1b2c3d4e5f6a7b8c9d0e1")
      .set("x-token", token(admin));
    expect(res.status).toBe(404);
  });

  it("retorna 403 si no es admin", async () => {
    const user = await crearUsuario();
    const res = await request(app)
      .delete("/api/horarios/bloqueos/64a1b2c3d4e5f6a7b8c9d0e1")
      .set("x-token", token(user));
    expect(res.status).toBe(403);
  });
});
