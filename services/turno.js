// services/turno.js
import Turno from "../models/Turno.js";
import { AppError } from "../helpers/AppError.js";

// ─── Lógica de negocio ───────────────────────────────────────────────────────

const crearTurno = async (datos, usuarioId) => {
  const { productos, fecha, horaInicio, metodoPago, total } = datos;

  const seña = Math.round(total * 0.5);

  const turno = new Turno({
    usuario: usuarioId,
    productos,
    fecha: new Date(fecha),
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

const obtenerTurnosAdmin = async () => {
  return await Turno.find()
    .populate("usuario", "nombre apellido email telefono")
    .populate("productos", "nombreProducto precio img")
    .sort({ fecha: -1 });
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
  if (turno.estado !== "pendiente") {
    throw new AppError("Este turno ya tiene comprobante cargado", 400);
  }

  return await Turno.findByIdAndUpdate(
    id,
    { comprobante: urlComprobante, estado: "señado" },
    { new: true }
  );
};

const confirmarTurno = async (id) => {
  const turno = await Turno.findById(id);
  if (!turno) throw new AppError("Turno no encontrado", 404);
  if (turno.estado !== "señado") {
    throw new AppError("El turno no tiene comprobante cargado aún", 400);
  }
  return await Turno.findByIdAndUpdate(id, { estado: "confirmado" }, { new: true });
};

const cancelarTurno = async (id, usuarioId, esAdmin) => {
  const turno = await Turno.findById(id);
  if (!turno) throw new AppError("Turno no encontrado", 404);

  if (!esAdmin && turno.usuario.toString() !== usuarioId.toString()) {
    throw new AppError("No tenés permiso para cancelar este turno", 403);
  }

  return await Turno.findByIdAndUpdate(id, { estado: "cancelado" }, { new: true });
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

  // Máximo 2 cambios
  if (turno.cambiosHorario >= 2) {
    throw new AppError("Ya realizaste el máximo de cambios de horario permitidos", 400);
  }

  // Solo un cambio cada 24 horas
  if (turno.ultimoCambioHorario) {
    const diff = Date.now() - new Date(turno.ultimoCambioHorario).getTime();
    const horas = diff / (1000 * 60 * 60);
    if (horas < 24) {
      throw new AppError("Solo podés cambiar el horario una vez cada 24 horas", 400);
    }
  }
  const eliminarTurno = async (id) => {
  const turno = await Turno.findById(id);
  if (!turno) throw new AppError("Turno no encontrado", 404);
  if (turno.estado !== "cancelado") {
    throw new AppError("Solo se pueden eliminar turnos cancelados", 400);
  }
  await Turno.findByIdAndDelete(id);
};


  return await Turno.findByIdAndUpdate(
    id,
    {
      fecha: new Date(datos.fecha),
      horaInicio: datos.horaInicio,
      cambiosHorario: turno.cambiosHorario + 1,
      ultimoCambioHorario: new Date(),
    },
    { new: true }
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
};