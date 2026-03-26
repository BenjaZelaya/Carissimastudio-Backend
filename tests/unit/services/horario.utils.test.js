// tests/unit/services/horario.utils.test.js
// generarTurnosDelDia es una funcion pura exportada: no requiere DB.
import { describe, it, expect } from "@jest/globals";
import { generarTurnosDelDia } from "../../../services/horario.js";

const configBase = {
  horaInicio: "09:00",
  horaFin: "17:00",
  duracionTurno: 60, // 1 hora
};

describe("generarTurnosDelDia", () => {
  it("retorna todos los slots cuando no hay bloqueos", () => {
    const turnos = generarTurnosDelDia(configBase, []);
    expect(turnos).toEqual([
      "09:00", "10:00", "11:00", "12:00",
      "13:00", "14:00", "15:00", "16:00",
    ]);
  });

  it("excluye slots cubiertos por un bloqueo de tipo horario", () => {
    const bloqueos = [
      { tipo: "horario", horaInicio: "10:00", horaFin: "12:00" },
    ];
    const turnos = generarTurnosDelDia(configBase, bloqueos);
    expect(turnos).not.toContain("10:00");
    expect(turnos).not.toContain("11:00");
    expect(turnos).toContain("09:00");
    expect(turnos).toContain("12:00");
  });

  it("excluye solo el slot exacto que cae dentro del bloqueo", () => {
    const bloqueos = [
      { tipo: "horario", horaInicio: "13:00", horaFin: "14:00" },
    ];
    const turnos = generarTurnosDelDia(configBase, bloqueos);
    expect(turnos).not.toContain("13:00");
    expect(turnos).toContain("12:00");
    expect(turnos).toContain("14:00");
  });

  it("retorna array vacio si el bloqueo cubre todo el horario", () => {
    const bloqueos = [
      { tipo: "horario", horaInicio: "09:00", horaFin: "17:00" },
    ];
    const turnos = generarTurnosDelDia(configBase, bloqueos);
    expect(turnos).toHaveLength(0);
  });

  it("ignora bloqueos de tipo dia (solo procesa tipo horario)", () => {
    const bloqueos = [{ tipo: "dia" }];
    const turnos = generarTurnosDelDia(configBase, bloqueos);
    expect(turnos).toHaveLength(8);
  });

  it("maneja multiples bloqueos no contiguos", () => {
    const bloqueos = [
      { tipo: "horario", horaInicio: "09:00", horaFin: "10:00" },
      { tipo: "horario", horaInicio: "14:00", horaFin: "16:00" },
    ];
    const turnos = generarTurnosDelDia(configBase, bloqueos);
    expect(turnos).not.toContain("09:00");
    expect(turnos).not.toContain("14:00");
    expect(turnos).not.toContain("15:00");
    expect(turnos).toContain("10:00");
    expect(turnos).toContain("13:00");
    expect(turnos).toContain("16:00");
  });

  it("no incluye un slot si no hay duracion completa hasta el fin", () => {
    const config = { horaInicio: "09:00", horaFin: "09:30", duracionTurno: 60 };
    const turnos = generarTurnosDelDia(config, []);
    expect(turnos).toHaveLength(0);
  });

  it("funciona con duraciones de 30 minutos", () => {
    const config = { horaInicio: "09:00", horaFin: "10:00", duracionTurno: 30 };
    const turnos = generarTurnosDelDia(config, []);
    expect(turnos).toEqual(["09:00", "09:30"]);
  });

  it("retorna array vacio si no hay bloqueos pero el horario esta cerrado", () => {
    const config = { horaInicio: "17:00", horaFin: "09:00", duracionTurno: 60 };
    const turnos = generarTurnosDelDia(config, []);
    expect(turnos).toHaveLength(0);
  });
});
