// services/turno.js
import Turno from "../models/Turno.js";
import Bloqueo from "../models/Bloqueo.js";
import ConfigHorario from "../models/ConfigHorario.js";
import { AppError } from "../helpers/AppError.js";

// ─── Helpers internos ────────────────────────────────────────────────────────

const horaAMinutos = (hora) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

// ─── Lógica de negocio ───────────────────────────────────────────────────────

const crearTurno = async (datos, usuarioId) => {
  const { productos, fecha, horaInicio, metodoPago, total } = datos;

  // Validar que el slot no esté ocupado por otro turno activo
  const fechaStr = fecha.split("T")[0];
  const inicioDelDia = new Date(fechaStr + "T00:00:00.000Z");
  const finDelDia = new Date(fechaStr + "T23:59:59.999Z");

  const turnoExistente = await Turno.findOne({
    fecha: { $gte: inicioDelDia, $lt: finDelDia },
    horaInicio,
    estado: { $in: ["pendiente", "señado", "confirmado"] },
  });

  if (turnoExistente) {
    throw new AppError("Ese horario ya está reservado", 409);
  }

  // Validar que el día sea laborable según la configuración activa
  let config = await ConfigHorario.findOne({ activo: true });
  if (!config) config = await ConfigHorario.create({});

  const diaSemana = new Date(fecha + "T12:00:00").getDay();
  const diaNum = diaSemana + 1;

  if (!config.diasLaborales.includes(diaNum)) {
    throw new AppError("Ese día no es laborable", 400);
  }

  // Validar bloqueos activos para la fecha solicitada
  const bloqueos = await Bloqueo.find({
    fecha: { $gte: inicioDelDia, $lt: finDelDia },
  });

  if (bloqueos.some((b) => b.tipo === "dia")) {
    throw new AppError("Ese día está bloqueado", 400);
  }

  const slotBloqueado = bloqueos.some((b) => {
    if (b.tipo === "horario") {
      const slotMin = horaAMinutos(horaInicio);
      return (
        slotMin >= horaAMinutos(b.horaInicio) &&
        slotMin < horaAMinutos(b.horaFin)
      );
    }
    return false;
  });

  if (slotBloqueado) throw new AppError("Ese horario está bloqueado", 400);

  const seña = Math.round(total * 0.5);

  const turno = new Turno({
    usuario: usuarioId,
    productos,
    fecha: new Date(fecha.split("T")[0] + "T12:00:00"),
    horaInicio,
    total,
    seña,
    metodoPago,
  });

  return await turno.save();
};

const obtenerTurnosUsuario = async (usuarioId) => {
  return await Turno.find({ usuario: usuarioId })
    .populate("productos", "nombreProducto precio img")
    .sort({ fecha: -1 });
};

const obtenerTurnosAdmin = async ({ pagina = 1, limite = 20 } = {}) => {
  const limiteSanitizado = Math.min(Math.max(Number(limite), 1), 100);
  const paginaSanitizada = Math.max(Number(pagina), 1);
  const skip = (paginaSanitizada - 1) * limiteSanitizado;

  const [turnos, total] = await Promise.all([
    Turno.find()
      .populate("usuario", "nombre apellido email telefono")
      .populate("productos", "nombreProducto precio img")
      .sort({ fecha: -1 })
      .skip(skip)
      .limit(limiteSanitizado),
    Turno.countDocuments(),
  ]);

  return {
    turnos,
    total,
    pagina: paginaSanitizada,
    totalPaginas: Math.ceil(total / limiteSanitizado),
  };
};

const obtenerTurnoPorId = async (id) => {
  const turno = await Turno.findById(id)
    .populate("usuario", "nombre apellido email telefono")
    .populate("productos", "nombreProducto precio img");
  if (!turno) throw new AppError("Turno no encontrado", 404);
  return turno;
};

const subirComprobante = async (id, urlComprobante, usuarioId) => {
  const turno = await Turno.findById(id);
  if (!turno) throw new AppError("Turno no encontrado", 404);
  if (turno.usuario.toString() !== usuarioId.toString()) {
    throw new AppError("No tenés permiso para modificar este turno", 403);
  }
  if (!["pendiente", "pago_rechazado"].includes(turno.estado)) {
    throw new AppError("Este turno no puede ser cargado en su estado actual", 400);
  }

  return await Turno.findByIdAndUpdate(
    id,
    { comprobante: urlComprobante, estado: "señado" },
    { new: true },
  );
};

const confirmarTurno = async (id) => {
  const turno = await Turno.findById(id);
  if (!turno) throw new AppError("Turno no encontrado", 404);
  if (turno.estado !== "señado") {
    throw new AppError("El turno no tiene comprobante cargado aún", 400);
  }
  return await Turno.findByIdAndUpdate(
    id,
    { estado: "confirmado" },
    { new: true },
  );
};

const cancelarTurno = async (id, usuarioId, esAdmin) => {
  const turno = await Turno.findById(id);
  if (!turno) throw new AppError("Turno no encontrado", 404);

  if (!esAdmin && turno.usuario.toString() !== usuarioId.toString()) {
    throw new AppError("No tenés permiso para cancelar este turno", 403);
  }

  return await Turno.findByIdAndUpdate(
    id,
    { estado: "cancelado" },
    { new: true },
  );
};

const cambiarHorario = async (id, datos, usuarioId) => {
  const turno = await Turno.findById(id);
  if (!turno) throw new AppError("Turno no encontrado", 404);

  if (turno.usuario.toString() !== usuarioId.toString()) {
    throw new AppError("No tenés permiso para modificar este turno", 403);
  }

  if (!["pendiente", "señado", "confirmado"].includes(turno.estado)) {
    throw new AppError("No se puede cambiar el horario de este turno", 400);
  }

  if (turno.cambiosHorario >= 2) {
    throw new AppError("Ya realizaste el máximo de cambios de horario permitidos", 400);
  }

  if (turno.ultimoCambioHorario) {
    const diff = Date.now() - new Date(turno.ultimoCambioHorario).getTime();
    if (diff / (1000 * 60 * 60) < 24) {
      throw new AppError("Solo podés cambiar el horario una vez cada 24 horas", 400);
    }
  }

  // Validar que el nuevo slot no esté ocupado
  const inicioDia = new Date(datos.fecha);
  inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

  const conflicto = await Turno.findOne({
    _id: { $ne: id },
    fecha: { $gte: inicioDia, $lt: finDia },
    horaInicio: datos.horaInicio,
    estado: { $in: ["pendiente", "señado", "confirmado"] },
  });

  if (conflicto) {
    throw new AppError("Ese horario ya está reservado", 409);
  }

  return await Turno.findByIdAndUpdate(
    id,
    {
      fecha: new Date(datos.fecha),
      horaInicio: datos.horaInicio,
      cambiosHorario: turno.cambiosHorario + 1,
      ultimoCambioHorario: new Date(),
    },
    { new: true },
  );
};

const eliminarTurno = async (id) => {
  const turno = await Turno.findById(id);
  if (!turno) throw new AppError("Turno no encontrado", 404);
  if (turno.estado !== "cancelado") {
    throw new AppError("Solo se pueden eliminar turnos cancelados", 400);
  }
  await Turno.findByIdAndDelete(id);
};

const rechazarPago = async (id, motivo) => {
  const turno = await Turno.findById(id);
  if (!turno) throw new AppError("Turno no encontrado", 404);
  if (turno.estado !== "señado") {
    throw new AppError("Solo se puede rechazar el pago de un turno en estado señado", 400);
  }

  return await Turno.findByIdAndUpdate(
    id,
    {
      estado: "pago_rechazado",
      comprobante: null,
      motivoRechazo: motivo || null,
    },
    { new: true },
  );
};

const completarTurno = async (id) => {
  const turno = await Turno.findById(id);
  if (!turno) throw new AppError("Turno no encontrado", 404);
  if (turno.estado !== "confirmado") {
    throw new AppError("Solo se pueden completar turnos confirmados", 400);
  }

  return await Turno.findByIdAndUpdate(
    id,
    { estado: "completado" },
    { new: true },
  );
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  crearTurno,
  obtenerTurnosUsuario,
  obtenerTurnosAdmin,
  obtenerTurnoPorId,
  subirComprobante,
  confirmarTurno,
  cancelarTurno,
  cambiarHorario,
  eliminarTurno,
  rechazarPago,
  completarTurno,
};