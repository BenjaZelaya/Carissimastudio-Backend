// services/horario.js
import ConfigHorario from "../models/ConfigHorario.js";
import Bloqueo from "../models/Bloqueo.js";
import Turno from "../models/Turno.js";
import { AppError } from "../helpers/AppError.js";

// ─── Helpers internos ────────────────────────────────────────────────────────

const horaAMinutos = (hora) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

const minutosAHora = (minutos) => {
  const h = Math.floor(minutos / 60).toString().padStart(2, "0");
  const m = (minutos % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

const fechaSinHora = (fecha) => {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ─── Lógica de negocio ───────────────────────────────────────────────────────

const obtenerConfig = async () => {
  let config = await ConfigHorario.findOne({ activo: true });
  if (!config) {
    config = await ConfigHorario.create({});
  }
  return config;
};

const actualizarConfig = async (datos) => {
  const { diasLaborales, horaInicio, horaFin, duracionTurno, capacidadPorTurno } = datos;
  let config = await ConfigHorario.findOne({ activo: true });
  if (!config) {
    return await ConfigHorario.create({ diasLaborales, horaInicio, horaFin, duracionTurno, capacidadPorTurno });
  }
  return await ConfigHorario.findByIdAndUpdate(
    config._id,
    { diasLaborales, horaInicio, horaFin, duracionTurno, capacidadPorTurno },
    { new: true, runValidators: true }
  );
};

const generarTurnosDelDia = (config, bloqueosDia) => {
  const inicio = horaAMinutos(config.horaInicio);
  const fin = horaAMinutos(config.horaFin);
  const duracion = config.duracionTurno;
  const turnos = [];

  for (let minutos = inicio; minutos + duracion <= fin; minutos += duracion) {
    const horaSlot = minutosAHora(minutos);
    const estaBloqueado = bloqueosDia.some((b) => {
      if (b.tipo === "horario") {
        const bloqInicio = horaAMinutos(b.horaInicio);
        const bloqFin = horaAMinutos(b.horaFin);
        return minutos >= bloqInicio && minutos < bloqFin;
      }
      return false;
    });
    if (!estaBloqueado) turnos.push(horaSlot);
  }

  return turnos;
};

const obtenerDisponibilidadSemana = async (fechaInicio) => {
  const config = await obtenerConfig();
  const resultado = [];
  // Usar zona horaria de Argentina (UTC-3): restar 3 horas de UTC
  const ahoraUTC = new Date();
  const ahora = new Date(ahoraUTC.getTime() - 3 * 60 * 60 * 1000);
  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);

  for (let i = 0; i < 14; i++) {
    const fecha = new Date(fechaInicio);
    fecha.setDate(fecha.getDate() + i);
    fecha.setHours(0, 0, 0, 0);

    if (fecha < hoy) continue;

    const fechaConHora = new Date(fecha.toISOString().split("T")[0] + "T12:00:00");
    const diaNum = fechaConHora.getDay() + 1;
    const esLaboral = config.diasLaborales.includes(diaNum);

    const bloqueos = await Bloqueo.find({
      fecha: {
        $gte: new Date(fecha.toISOString().split("T")[0] + "T00:00:00.000Z"),
        $lt: new Date(fecha.toISOString().split("T")[0] + "T23:59:59.999Z"),
      },
    });

    const bloqueoDia = bloqueos.some((b) => b.tipo === "dia");

    if (!esLaboral || bloqueoDia) {
      resultado.push({
        fecha: fecha.toISOString().split("T")[0],
        disponible: false,
        turnos: [],
      });
      continue;
    }

    const esHoy = fecha.toDateString() === ahora.toDateString();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

    // Turnos ya reservados para ese día
    const turnosOcupados = await Turno.find({
      fecha: {
        $gte: fechaSinHora(fecha),
        $lt: new Date(fechaSinHora(fecha).getTime() + 24 * 60 * 60 * 1000),
      },
      estado: { $in: ["pendiente", "señado", "confirmado"] },
    }).select("horaInicio");

    const capacidad = config.capacidadPorTurno || 1;

    // Contar cuántos turnos hay por hora
    const conteoHoras = {};
    turnosOcupados.forEach((t) => {
      conteoHoras[t.horaInicio] = (conteoHoras[t.horaInicio] || 0) + 1;
    });

    const inicio = horaAMinutos(config.horaInicio);
    const fin = horaAMinutos(config.horaFin);
    const duracion = config.duracionTurno;
    const turnos = [];

    for (let minutos = inicio; minutos + duracion <= fin; minutos += duracion) {
      const horaSlot = minutosAHora(minutos);

      if (esHoy && minutos < minutosAhora) continue;

      const estaBloqueado = bloqueos.some((b) => {
        if (b.tipo === "horario") {
          const bloqInicio = horaAMinutos(b.horaInicio);
          const bloqFin = horaAMinutos(b.horaFin);
          return minutos >= bloqInicio && minutos < bloqFin;
        }
        return false;
      });

      if (!estaBloqueado) {
        turnos.push({
          hora: horaSlot,
          ocupado: (conteoHoras[horaSlot] || 0) >= capacidad,
          reservas: conteoHoras[horaSlot] || 0,
          capacidad,
        });
      }
    }

    resultado.push({
      fecha: fecha.toISOString().split("T")[0],
      disponible: turnos.some((t) => !t.ocupado),
      turnos,
    });
  }

  return resultado;
};

const crearBloqueo = async (datos) => {
  const { tipo, fecha, horaInicio, horaFin, motivo } = datos;

  if (tipo === "horario" && (!horaInicio || !horaFin)) {
    throw new AppError("Para bloquear un horario debés indicar horaInicio y horaFin", 400);
  }

  if (tipo === "horario" && horaAMinutos(horaInicio) >= horaAMinutos(horaFin)) {
    throw new AppError("La hora de inicio debe ser anterior a la hora de fin", 400);
  }

  return await Bloqueo.create({ tipo, fecha, horaInicio, horaFin, motivo });
};

const obtenerBloqueos = async () => {
  return await Bloqueo.find().sort({ fecha: 1 });
};

const eliminarBloqueo = async (id) => {
  const bloqueo = await Bloqueo.findById(id);
  if (!bloqueo) throw new AppError("Bloqueo no encontrado", 404);
  await Bloqueo.findByIdAndDelete(id);
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  obtenerConfig,
  actualizarConfig,
  generarTurnosDelDia,
  obtenerDisponibilidadSemana,
  crearBloqueo,
  obtenerBloqueos,
  eliminarBloqueo,
};