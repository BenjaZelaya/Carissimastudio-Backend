// tests/integration/services/horario.service.test.js
import { describe, it, expect, beforeAll, afterEach, afterAll } from "@jest/globals";
import { connect, closeDatabase, clearDatabase } from "../../setup/db.js";
import {
  obtenerConfig,
  actualizarConfig,
  obtenerDisponibilidadSemana,
  crearBloqueo,
  obtenerBloqueos,
  eliminarBloqueo,
} from "../../../services/horario.js";
import ConfigHorario from "../../../models/ConfigHorario.js";
import Bloqueo from "../../../models/Bloqueo.js";

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

describe("obtenerConfig", () => {
  it("crea una configuracion por defecto si no existe ninguna", async () => {
    const config = await obtenerConfig();
    expect(config).toBeDefined();
    expect(config.diasLaborales).toEqual([1, 2, 3, 4, 5]);
    expect(config.horaInicio).toBe("09:00");
    expect(config.horaFin).toBe("18:00");
    expect(config.duracionTurno).toBe(60);
  });

  it("retorna la configuracion existente sin crear una nueva", async () => {
    await ConfigHorario.create({
      horaInicio: "08:00",
      horaFin: "16:00",
      duracionTurno: 30,
    });
    const config = await obtenerConfig();
    expect(config.horaInicio).toBe("08:00");
    const total = await ConfigHorario.countDocuments();
    expect(total).toBe(1);
  });
});

describe("actualizarConfig", () => {
  it("actualiza la configuracion existente", async () => {
    await ConfigHorario.create({});
    const datos = {
      diasLaborales: [1, 2, 3],
      horaInicio: "10:00",
      horaFin: "19:00",
      duracionTurno: 45,
    };
    const config = await actualizarConfig(datos);
    expect(config.diasLaborales).toEqual([1, 2, 3]);
    expect(config.horaInicio).toBe("10:00");
    expect(config.horaFin).toBe("19:00");
    expect(config.duracionTurno).toBe(45);
  });

  it("crea una configuracion si no existe ninguna", async () => {
    const config = await actualizarConfig({
      diasLaborales: [1, 2, 3, 4, 5],
      horaInicio: "09:00",
      horaFin: "17:00",
      duracionTurno: 60,
    });
    expect(config._id).toBeDefined();
  });
});

describe("crearBloqueo", () => {
  it("crea un bloqueo de tipo dia correctamente", async () => {
    const datos = { tipo: "dia", fecha: new Date("2027-01-15") };
    const bloqueo = await crearBloqueo(datos);
    expect(bloqueo._id).toBeDefined();
    expect(bloqueo.tipo).toBe("dia");
  });

  it("crea un bloqueo de tipo horario con horas validas", async () => {
    const datos = {
      tipo: "horario",
      fecha: new Date("2027-01-15"),
      horaInicio: "10:00",
      horaFin: "12:00",
    };
    const bloqueo = await crearBloqueo(datos);
    expect(bloqueo.tipo).toBe("horario");
    expect(bloqueo.horaInicio).toBe("10:00");
  });

  it("lanza AppError 400 si tipo horario no tiene horas", async () => {
    await expect(
      crearBloqueo({ tipo: "horario", fecha: new Date("2027-01-15") })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lanza AppError 400 si horaInicio >= horaFin", async () => {
    await expect(
      crearBloqueo({
        tipo: "horario",
        fecha: new Date("2027-01-15"),
        horaInicio: "14:00",
        horaFin: "10:00",
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lanza AppError 400 si horaInicio === horaFin", async () => {
    await expect(
      crearBloqueo({
        tipo: "horario",
        fecha: new Date("2027-01-15"),
        horaInicio: "10:00",
        horaFin: "10:00",
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("obtenerBloqueos", () => {
  it("retorna todos los bloqueos ordenados por fecha", async () => {
    await Bloqueo.create({ tipo: "dia", fecha: new Date("2027-02-01") });
    await Bloqueo.create({ tipo: "dia", fecha: new Date("2027-01-01") });
    const bloqueos = await obtenerBloqueos();
    expect(bloqueos).toHaveLength(2);
    expect(new Date(bloqueos[0].fecha) < new Date(bloqueos[1].fecha)).toBe(true);
  });

  it("retorna array vacio si no hay bloqueos", async () => {
    const bloqueos = await obtenerBloqueos();
    expect(bloqueos).toHaveLength(0);
  });
});

describe("eliminarBloqueo", () => {
  it("elimina el bloqueo existente", async () => {
    const bloqueo = await Bloqueo.create({
      tipo: "dia",
      fecha: new Date("2027-03-01"),
    });
    await eliminarBloqueo(bloqueo._id.toString());
    const encontrado = await Bloqueo.findById(bloqueo._id);
    expect(encontrado).toBeNull();
  });

  it("lanza AppError 404 si el bloqueo no existe", async () => {
    const idFalso = "64a1b2c3d4e5f6a7b8c9d0e1";
    await expect(eliminarBloqueo(idFalso)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("obtenerDisponibilidadSemana", () => {
  it("retorna 14 dias de disponibilidad", async () => {
    await ConfigHorario.create({
      diasLaborales: [1, 2, 3, 4, 5],
      horaInicio: "09:00",
      horaFin: "17:00",
      duracionTurno: 60,
    });
    const hoy = new Date();
    const resultado = await obtenerDisponibilidadSemana(hoy);
    expect(resultado).toHaveLength(14);
    resultado.forEach((dia) => {
      expect(dia).toHaveProperty("fecha");
      expect(dia).toHaveProperty("disponible");
      expect(dia).toHaveProperty("turnos");
    });
  });

  it("marca como no disponibles los dias no laborales", async () => {
    // Solo lunes (1) es laborable
    await ConfigHorario.create({
      diasLaborales: [1],
      horaInicio: "09:00",
      horaFin: "17:00",
      duracionTurno: 60,
    });
    // 2027-01-05 es martes. Usar T12:00:00 para evitar desplazamiento de timezone.
    const martes = new Date("2027-01-05T12:00:00");
    const resultado = await obtenerDisponibilidadSemana(martes);
    const diaMartes = resultado[0]; // primer dia = el martes indicado
    expect(diaMartes.disponible).toBe(false);
    expect(diaMartes.turnos).toHaveLength(0);
  });

  it("marca como no disponible un dia bloqueado por bloqueo de tipo dia", async () => {
    const fechaBloqueo = new Date("2027-06-01T12:00:00");
    await ConfigHorario.create({
      diasLaborales: [1, 2, 3, 4, 5],
      horaInicio: "09:00",
      horaFin: "17:00",
      duracionTurno: 60,
    });
    await Bloqueo.create({ tipo: "dia", fecha: fechaBloqueo });
    const resultado = await obtenerDisponibilidadSemana(fechaBloqueo);
    const primerDia = resultado[0];
    expect(primerDia.disponible).toBe(false);
  });
});
