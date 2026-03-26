// tests/integration/services/turno.service.test.js
import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from "@jest/globals";
import { connect, closeDatabase, clearDatabase } from "../../setup/db.js";
import {
  crearTurno,
  subirComprobante,
  confirmarTurno,
  cancelarTurno,
  cambiarHorario,
  eliminarTurno,
  rechazarPago,
  completarTurno,
  obtenerTurnosAdmin,
  obtenerTurnosUsuario,
  obtenerTurnoPorId,
} from "../../../services/turno.js";
import Usuario from "../../../models/Usuario.js";
import Turno from "../../../models/Turno.js";
import Bloqueo from "../../../models/Bloqueo.js";
import ConfigHorario from "../../../models/ConfigHorario.js";
// Necesario para que mongoose registre el schema antes de que populate("productos") lo use
import Producto from "../../../models/Producto.js";
import bcrypt from "bcryptjs";

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

// ─── Helpers ─────────────────────────────────────────────────────────────────

const crearUsuario = async (overrides = {}) => {
  const salt = bcrypt.genSaltSync(10);
  return await Usuario.create({
    nombre: "Test",
    apellido: "User",
    email: `user${Date.now()}@test.com`,
    password: bcrypt.hashSync("pass123", salt),
    telefono: "1234567890",
    rol: "USER_ROLE",
    estado: true,
    ...overrides,
  });
};

// Retorna una fecha ISO string de un lunes al menos 3 días en el futuro.
// Usa T12:00:00 (mediodia local) para evitar que la timezone desplace la fecha al día anterior.
const proximoLunes = () => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}T12:00:00`;
};

// Crea un turno directo en la DB (sin pasar por validaciones del service)
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

// ─── crearTurno ──────────────────────────────────────────────────────────────

describe("crearTurno", () => {
  let usuario;

  beforeEach(async () => {
    usuario = await crearUsuario();
    await ConfigHorario.create({
      diasLaborales: [1, 2, 3, 4, 5],
      horaInicio: "09:00",
      horaFin: "18:00",
      duracionTurno: 60,
    });
  });

  it("crea el turno en estado pendiente con seña del 50%", async () => {
    const fecha = proximoLunes();
    const turno = await crearTurno(
      { productos: [], fecha, horaInicio: "10:00", metodoPago: "transferencia", total: 2000 },
      usuario._id
    );
    expect(turno._id).toBeDefined();
    expect(turno.estado).toBe("pendiente");
    expect(turno.seña).toBe(1000);
    expect(turno.usuario.toString()).toBe(usuario._id.toString());
  });

  it("lanza AppError 400 si la fecha tiene menos de 24hs de antelacion", async () => {
    const ahora = new Date();
    const fechaCercana = ahora.toISOString().split("T")[0];
    await expect(
      crearTurno(
        { productos: [], fecha: fechaCercana, horaInicio: "10:00", metodoPago: "transferencia", total: 1000 },
        usuario._id
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lanza AppError 409 si el slot ya esta reservado", async () => {
    const fecha = proximoLunes();
    await crearTurno(
      { productos: [], fecha, horaInicio: "10:00", metodoPago: "transferencia", total: 1000 },
      usuario._id
    );
    const usuario2 = await crearUsuario();
    await expect(
      crearTurno(
        { productos: [], fecha, horaInicio: "10:00", metodoPago: "transferencia", total: 1000 },
        usuario2._id
      )
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("lanza AppError 400 si el dia no es laborable", async () => {
    // Buscar un domingo al menos 3 dias en el futuro
    const d = new Date();
    d.setDate(d.getDate() + 3);
    while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    const domingo = `${y}-${m}-${day}T12:00:00`;
    await expect(
      crearTurno(
        { productos: [], fecha: domingo, horaInicio: "10:00", metodoPago: "transferencia", total: 1000 },
        usuario._id
      )
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("laborable") });
  });

  it("lanza AppError 400 si el dia esta bloqueado", async () => {
    const fecha = proximoLunes();
    await Bloqueo.create({ tipo: "dia", fecha: new Date(fecha) });
    await expect(
      crearTurno(
        { productos: [], fecha, horaInicio: "10:00", metodoPago: "transferencia", total: 1000 },
        usuario._id
      )
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("bloqueado") });
  });

  it("lanza AppError 400 si el horario esta bloqueado", async () => {
    const fecha = proximoLunes();
    await Bloqueo.create({
      tipo: "horario",
      fecha: new Date(fecha),
      horaInicio: "09:00",
      horaFin: "12:00",
    });
    await expect(
      crearTurno(
        { productos: [], fecha, horaInicio: "10:00", metodoPago: "transferencia", total: 1000 },
        usuario._id
      )
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("bloqueado") });
  });

  it("crea config por defecto si no existe ninguna", async () => {
    await ConfigHorario.deleteMany({});
    const fecha = proximoLunes();
    const turno = await crearTurno(
      { productos: [], fecha, horaInicio: "10:00", metodoPago: "transferencia", total: 500 },
      usuario._id
    );
    expect(turno._id).toBeDefined();
    const configCreada = await ConfigHorario.countDocuments();
    expect(configCreada).toBe(1);
  });
});

// ─── obtenerTurnoPorId ────────────────────────────────────────────────────────

describe("obtenerTurnoPorId", () => {
  it("retorna el turno existente", async () => {
    const usuario = await crearUsuario();
    const turno = await crearTurnoDirecto(usuario._id);
    const resultado = await obtenerTurnoPorId(turno._id.toString());
    expect(resultado._id.toString()).toBe(turno._id.toString());
  });

  it("lanza AppError 404 si el turno no existe", async () => {
    await expect(
      obtenerTurnoPorId("64a1b2c3d4e5f6a7b8c9d0e1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── obtenerTurnosAdmin paginacion ───────────────────────────────────────────

describe("obtenerTurnosAdmin", () => {
  it("retorna estructura paginada correcta", async () => {
    const usuario = await crearUsuario();
    await crearTurnoDirecto(usuario._id);
    await crearTurnoDirecto(usuario._id);
    const resultado = await obtenerTurnosAdmin({ pagina: 1, limite: 10 });
    expect(resultado).toMatchObject({
      total: 2,
      pagina: 1,
      totalPaginas: 1,
    });
    expect(resultado.turnos).toHaveLength(2);
  });

  it("pagina correctamente cuando hay mas items que el limite", async () => {
    const usuario = await crearUsuario();
    for (let i = 0; i < 5; i++) await crearTurnoDirecto(usuario._id);
    const resultado = await obtenerTurnosAdmin({ pagina: 2, limite: 2 });
    expect(resultado.turnos).toHaveLength(2);
    expect(resultado.pagina).toBe(2);
    expect(resultado.totalPaginas).toBe(3);
  });

  it("sanitiza limite mayor a 100 a 100", async () => {
    const resultado = await obtenerTurnosAdmin({ pagina: 1, limite: 999 });
    expect(resultado.turnos.length).toBeLessThanOrEqual(100);
  });
});

// ─── obtenerTurnosUsuario ─────────────────────────────────────────────────────

describe("obtenerTurnosUsuario", () => {
  it("retorna solo los turnos del usuario indicado", async () => {
    const u1 = await crearUsuario();
    const u2 = await crearUsuario();
    await crearTurnoDirecto(u1._id);
    await crearTurnoDirecto(u1._id);
    await crearTurnoDirecto(u2._id);
    const turnos = await obtenerTurnosUsuario(u1._id);
    expect(turnos).toHaveLength(2);
    turnos.forEach((t) => expect(t.usuario.toString()).toBe(u1._id.toString()));
  });
});

// ─── subirComprobante ─────────────────────────────────────────────────────────

describe("subirComprobante", () => {
  it("transiciona pendiente -> senado", async () => {
    const usuario = await crearUsuario();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "pendiente" });
    const resultado = await subirComprobante(turno._id.toString(), "https://cloudinary.com/comp.jpg", usuario._id);
    expect(resultado.estado).toBe("señado");
    expect(resultado.comprobante).toBe("https://cloudinary.com/comp.jpg");
  });

  it("transiciona pago_rechazado -> senado (retry)", async () => {
    const usuario = await crearUsuario();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "pago_rechazado" });
    const resultado = await subirComprobante(turno._id.toString(), "https://cloudinary.com/nuevo.jpg", usuario._id);
    expect(resultado.estado).toBe("señado");
  });

  it("lanza AppError 403 si el usuario no es el dueno", async () => {
    const dueno = await crearUsuario();
    const otro = await crearUsuario();
    const turno = await crearTurnoDirecto(dueno._id, { estado: "pendiente" });
    await expect(
      subirComprobante(turno._id.toString(), "https://comp.jpg", otro._id)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("lanza AppError 400 si el turno no esta en estado pendiente o pago_rechazado", async () => {
    const usuario = await crearUsuario();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "confirmado" });
    await expect(
      subirComprobante(turno._id.toString(), "https://comp.jpg", usuario._id)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lanza AppError 404 si el turno no existe", async () => {
    const usuario = await crearUsuario();
    await expect(
      subirComprobante("64a1b2c3d4e5f6a7b8c9d0e1", "https://comp.jpg", usuario._id)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── confirmarTurno ───────────────────────────────────────────────────────────

describe("confirmarTurno", () => {
  it("transiciona senado -> confirmado", async () => {
    const usuario = await crearUsuario();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "señado" });
    const resultado = await confirmarTurno(turno._id.toString());
    expect(resultado.estado).toBe("confirmado");
  });

  it("lanza AppError 400 si el turno no esta en estado senado", async () => {
    const usuario = await crearUsuario();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "pendiente" });
    await expect(confirmarTurno(turno._id.toString())).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lanza AppError 404 si el turno no existe", async () => {
    await expect(confirmarTurno("64a1b2c3d4e5f6a7b8c9d0e1")).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── rechazarPago ─────────────────────────────────────────────────────────────

describe("rechazarPago", () => {
  it("transiciona senado -> pago_rechazado y limpia comprobante", async () => {
    const usuario = await crearUsuario();
    const turno = await crearTurnoDirecto(usuario._id, {
      estado: "señado",
      comprobante: "https://cloudinary.com/comp.jpg",
    });
    const resultado = await rechazarPago(turno._id.toString(), "Comprobante ilegible");
    expect(resultado.estado).toBe("pago_rechazado");
    expect(resultado.comprobante).toBeNull();
    expect(resultado.motivoRechazo).toBe("Comprobante ilegible");
  });

  it("lanza AppError 400 si el turno no esta en estado senado", async () => {
    const usuario = await crearUsuario();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "pendiente" });
    await expect(rechazarPago(turno._id.toString(), "motivo")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lanza AppError 404 si el turno no existe", async () => {
    await expect(rechazarPago("64a1b2c3d4e5f6a7b8c9d0e1", "motivo")).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── completarTurno ───────────────────────────────────────────────────────────

describe("completarTurno", () => {
  it("transiciona confirmado -> completado", async () => {
    const usuario = await crearUsuario();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "confirmado" });
    const resultado = await completarTurno(turno._id.toString());
    expect(resultado.estado).toBe("completado");
  });

  it("lanza AppError 400 si el turno no esta confirmado", async () => {
    const usuario = await crearUsuario();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "señado" });
    await expect(completarTurno(turno._id.toString())).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lanza AppError 404 si el turno no existe", async () => {
    await expect(completarTurno("64a1b2c3d4e5f6a7b8c9d0e1")).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── cancelarTurno ────────────────────────────────────────────────────────────

describe("cancelarTurno", () => {
  it("permite al usuario cancelar su propio turno", async () => {
    const usuario = await crearUsuario();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "pendiente" });
    const resultado = await cancelarTurno(turno._id.toString(), usuario._id, false);
    expect(resultado.estado).toBe("cancelado");
  });

  it("permite al admin cancelar cualquier turno", async () => {
    const usuario = await crearUsuario();
    const admin = await crearUsuario({ rol: "ADMIN_ROLE" });
    const turno = await crearTurnoDirecto(usuario._id, { estado: "confirmado" });
    const resultado = await cancelarTurno(turno._id.toString(), admin._id, true);
    expect(resultado.estado).toBe("cancelado");
  });

  it("lanza AppError 403 si el usuario intenta cancelar un turno ajeno", async () => {
    const dueno = await crearUsuario();
    const otro = await crearUsuario();
    const turno = await crearTurnoDirecto(dueno._id, { estado: "pendiente" });
    await expect(
      cancelarTurno(turno._id.toString(), otro._id, false)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("lanza AppError 404 si el turno no existe", async () => {
    const usuario = await crearUsuario();
    await expect(
      cancelarTurno("64a1b2c3d4e5f6a7b8c9d0e1", usuario._id, false)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── eliminarTurno ────────────────────────────────────────────────────────────

describe("eliminarTurno", () => {
  it("elimina definitivamente un turno cancelado", async () => {
    const usuario = await crearUsuario();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "cancelado" });
    await eliminarTurno(turno._id.toString());
    const encontrado = await Turno.findById(turno._id);
    expect(encontrado).toBeNull();
  });

  it("lanza AppError 400 si el turno no esta cancelado", async () => {
    const usuario = await crearUsuario();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "pendiente" });
    await expect(eliminarTurno(turno._id.toString())).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lanza AppError 404 si el turno no existe", async () => {
    await expect(eliminarTurno("64a1b2c3d4e5f6a7b8c9d0e1")).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── cambiarHorario ───────────────────────────────────────────────────────────

describe("cambiarHorario", () => {
  let usuario;
  const nuevoLunes = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}T12:00:00`;
  };

  beforeEach(async () => {
    usuario = await crearUsuario();
  });

  it("cambia la fecha y hora correctamente e incrementa cambiosHorario", async () => {
    const turno = await crearTurnoDirecto(usuario._id, { estado: "pendiente", cambiosHorario: 0 });
    const nuevaFecha = nuevoLunes();
    const resultado = await cambiarHorario(
      turno._id.toString(),
      { fecha: nuevaFecha, horaInicio: "11:00" },
      usuario._id
    );
    expect(resultado.horaInicio).toBe("11:00");
    expect(resultado.cambiosHorario).toBe(1);
    expect(resultado.ultimoCambioHorario).toBeDefined();
  });

  it("lanza AppError 403 si el usuario no es el dueno", async () => {
    const otro = await crearUsuario();
    const turno = await crearTurnoDirecto(usuario._id, { estado: "pendiente" });
    await expect(
      cambiarHorario(turno._id.toString(), { fecha: nuevoLunes(), horaInicio: "11:00" }, otro._id)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("lanza AppError 400 si el turno esta en estado cancelado", async () => {
    const turno = await crearTurnoDirecto(usuario._id, { estado: "cancelado" });
    await expect(
      cambiarHorario(turno._id.toString(), { fecha: nuevoLunes(), horaInicio: "11:00" }, usuario._id)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lanza AppError 400 si ya se hicieron 2 cambios de horario", async () => {
    const turno = await crearTurnoDirecto(usuario._id, { estado: "pendiente", cambiosHorario: 2 });
    await expect(
      cambiarHorario(turno._id.toString(), { fecha: nuevoLunes(), horaInicio: "11:00" }, usuario._id)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lanza AppError 400 si el ultimo cambio fue hace menos de 24hs", async () => {
    const hace12hs = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const turno = await crearTurnoDirecto(usuario._id, {
      estado: "pendiente",
      cambiosHorario: 1,
      ultimoCambioHorario: hace12hs,
    });
    await expect(
      cambiarHorario(turno._id.toString(), { fecha: nuevoLunes(), horaInicio: "11:00" }, usuario._id)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lanza AppError 400 si el nuevo slot tiene menos de 24hs de antelacion", async () => {
    const turno = await crearTurnoDirecto(usuario._id, { estado: "pendiente" });
    const ahora = new Date();
    const fechaCercana = ahora.toISOString().split("T")[0];
    await expect(
      cambiarHorario(turno._id.toString(), { fecha: fechaCercana, horaInicio: "10:00" }, usuario._id)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lanza AppError 409 si el nuevo slot ya esta ocupado por otro turno", async () => {
    const fecha = nuevoLunes();
    const fechaBase = fecha.split("T")[0];
    // Crear un turno existente en el mismo slot
    await crearTurnoDirecto(usuario._id, {
      fecha: new Date(`${fechaBase}T12:00:00`),
      horaInicio: "11:00",
      estado: "confirmado",
    });
    const turnoACambiar = await crearTurnoDirecto(usuario._id, { estado: "pendiente" });
    await expect(
      cambiarHorario(turnoACambiar._id.toString(), { fecha, horaInicio: "11:00" }, usuario._id)
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("lanza AppError 404 si el turno no existe", async () => {
    await expect(
      cambiarHorario("64a1b2c3d4e5f6a7b8c9d0e1", { fecha: nuevoLunes(), horaInicio: "11:00" }, usuario._id)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
