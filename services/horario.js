// services/horario.js
import ConfigHorario from "../models/ConfigHorario.js";
import Bloqueo from "../models/Bloqueo.js";
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
    // Si no existe, crea la config por defecto
    config = await ConfigHorario.create({});
  }
  return config;
};

const actualizarConfig = async (datos) => {
  const { diasLaborales, horaInicio, horaFin, duracionTurno } = datos;

  let config = await ConfigHorario.findOne({ activo: true });

  if (!config) {
    return await ConfigHorario.create({ diasLaborales, horaInicio, horaFin, duracionTurno });
  }

  return await ConfigHorario.findByIdAndUpdate(
    config._id,
    { diasLaborales, horaInicio, horaFin, duracionTurno },
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

    // Verifica si este horario está bloqueado
    const estaBloqueado = bloqueosDia.some((b) => {
      if (b.tipo === "horario") {
        const bloqInicio = horaAMinutos(b.horaInicio);
        const bloqFin = horaAMinutos(b.horaFin);
        return minutos >= bloqInicio && minutos < bloqFin;
      }
      return false;
    });

    if (!estaBloqueado) {
      turnos.push(horaSlot);
    }
  }

  return turnos;
};

const obtenerDisponibilidadSemana = async (fechaInicio) => {
  const config = await obtenerConfig();
  const resultado = [];

  // Genera 14 días desde la fecha de inicio
  for (let i = 0; i < 14; i++) {
    const fecha = new Date(fechaInicio);
    fecha.setDate(fecha.getDate() + i);
    fecha.setHours(0, 0, 0, 0);

    // getDia: 0=domingo, 1=lunes ... 6=sábado → convertimos a 1=lunes ... 7=domingo
    const diaSemana = fecha.getDay() === 0 ? 7 : fecha.getDay();

    // Verifica si es día laboral
    const esLaboral = config.diasLaborales.includes(diaSemana);

    // Busca bloqueos para este día
    const bloqueos = await Bloqueo.find({
      fecha: {
        $gte: fechaSinHora(fecha),
        $lt: new Date(fechaSinHora(fecha).getTime() + 24 * 60 * 60 * 1000),
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

    const turnos = generarTurnosDelDia(config, bloqueos);

    resultado.push({
      fecha: fecha.toISOString().split("T")[0],
      disponible: turnos.length > 0,
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
  obtenerDisponibilidadSemana,
  crearBloqueo,
  obtenerBloqueos,
  eliminarBloqueo,
};