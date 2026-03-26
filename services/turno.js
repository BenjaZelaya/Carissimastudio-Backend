// services/turno.js
import Turno from "../models/Turno.js";
import Bloqueo from "../models/Bloqueo.js";
import ConfigHorario from "../models/ConfigHorario.js";
import { AppError } from "../helpers/AppError.js";

// ─── Helpers internos ────────────────────────────────────────────────────────

/**
 * Convierte una hora en formato "HH:MM" a minutos totales desde medianoche.
 * @param {string} hora - Hora en formato "HH:MM".
 * @returns {number} Minutos totales.
 */
const horaAMinutos = (hora) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

// ─── Lógica de negocio ───────────────────────────────────────────────────────

/**
 * Crea un nuevo turno para un usuario.
 *
 * Validaciones aplicadas:
 * - El turno debe reservarse con al menos 24 horas de antelación.
 * - El slot (fecha + horaInicio) no debe estar ocupado por otro turno activo.
 * - El día debe ser laborable según la configuración de horarios.
 * - El slot no debe estar dentro de un bloqueo de día o de horario.
 *
 * La seña se calcula automáticamente como el 50% del total.
 *
 * @param {Object} datos - Datos del turno.
 * @param {string[]} datos.productos - Array de IDs de productos.
 * @param {string} datos.fecha - Fecha en formato ISO8601.
 * @param {string} datos.horaInicio - Hora en formato "HH:MM".
 * @param {string} datos.metodoPago - "transferencia" o "mercadopago".
 * @param {number} datos.total - Monto total del turno.
 * @param {string} usuarioId - ID del usuario que reserva.
 * @returns {Promise<Turno>} El turno creado.
 * @throws {AppError} 400 si no cumple las validaciones de tiempo, dia o bloqueo.
 * @throws {AppError} 409 si el slot ya está reservado.
 */
const crearTurno = async (datos, usuarioId) => {
  const { productos, fecha, horaInicio, metodoPago, total } = datos;

  // Validar mínimo 24hs de antelación
  const ahora = new Date();
  const fechaTurno = new Date(`${fecha.split("T")[0]}T${horaInicio}:00`);
  const diferencia = fechaTurno - ahora;

  if (diferencia < 24 * 60 * 60 * 1000) {
    throw new AppError(
      "El turno debe reservarse con al menos 24 horas de antelación",
      400,
    );
  }

  // Validar que el slot no esté ocupado por otro turno activo
  const inicioDelDia = new Date(fecha);
  inicioDelDia.setHours(0, 0, 0, 0);
  const finDelDia = new Date(inicioDelDia.getTime() + 24 * 60 * 60 * 1000);

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

  const diaSemana = new Date(fecha).getDay();
  const diaNum = diaSemana === 0 ? 7 : diaSemana; // 1=lunes ... 7=domingo

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

  // Crear turno con seña calculada automáticamente (50% del total)
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

/**
 * Retorna todos los turnos de un usuario ordenados por fecha descendente.
 * @param {string} usuarioId - ID del usuario.
 * @returns {Promise<Turno[]>} Lista de turnos con productos populados.
 */
const obtenerTurnosUsuario = async (usuarioId) => {
  return await Turno.find({ usuario: usuarioId })
    .populate("productos", "nombreProducto precio img")
    .sort({ fecha: -1 });
};

/**
 * Retorna los turnos del sistema paginados, con usuario y productos populados.
 * Uso exclusivo del administrador.
 *
 * @param {Object} [opciones] - Opciones de paginacion.
 * @param {number} [opciones.pagina=1] - Numero de pagina (base 1).
 * @param {number} [opciones.limite=20] - Cantidad de turnos por pagina (max 100).
 * @returns {Promise<{turnos: Turno[], total: number, pagina: number, totalPaginas: number}>}
 */
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

/**
 * Retorna un turno por su ID con usuario y productos populados.
 * @param {string} id - ID del turno.
 * @returns {Promise<Turno>} El turno encontrado.
 * @throws {AppError} 404 si el turno no existe.
 */
const obtenerTurnoPorId = async (id) => {
  const turno = await Turno.findById(id)
    .populate("usuario", "nombre apellido email telefono")
    .populate("productos", "nombreProducto precio img");
  if (!turno) throw new AppError("Turno no encontrado", 404);
  return turno;
};

/**
 * Registra el comprobante de pago de la seña y avanza el estado a "señado".
 * Solo puede ejecutarlo el usuario dueño del turno y únicamente si está en estado "pendiente".
 * @param {string} id - ID del turno.
 * @param {string} urlComprobante - URL del comprobante subido a Cloudinary.
 * @param {string} usuarioId - ID del usuario autenticado.
 * @returns {Promise<Turno>} El turno actualizado.
 * @throws {AppError} 403 si el usuario no es el dueño del turno.
 * @throws {AppError} 400 si el turno no está en estado "pendiente".
 */
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

/**
 * Confirma un turno luego de que el administrador verifica el comprobante de pago.
 * Solo puede ejecutarse si el turno está en estado "señado".
 * @param {string} id - ID del turno.
 * @returns {Promise<Turno>} El turno confirmado.
 * @throws {AppError} 400 si el turno no está en estado "señado".
 */
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

/**
 * Cancela un turno. El usuario solo puede cancelar su propio turno.
 * El administrador puede cancelar cualquier turno.
 * @param {string} id - ID del turno.
 * @param {string} usuarioId - ID del usuario autenticado.
 * @param {boolean} esAdmin - Indica si el usuario tiene rol administrador.
 * @returns {Promise<Turno>} El turno cancelado.
 * @throws {AppError} 403 si el usuario intenta cancelar un turno ajeno.
 */
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

/**
 * Permite al usuario reprogramar la fecha y hora de su turno.
 *
 * Restricciones:
 * - Solo el dueño del turno puede reprogramarlo.
 * - El turno debe estar en estado "pendiente", "señado" o "confirmado".
 * - Se permiten como máximo 2 cambios de horario por turno.
 * - Entre cambios debe transcurrir al menos 24 horas.
 * - El nuevo slot debe tener al menos 24 horas de antelacion desde ahora.
 * - El nuevo slot no puede estar ocupado por otro turno activo.
 *
 * @param {string} id - ID del turno.
 * @param {Object} datos - Nuevos datos de horario.
 * @param {string} datos.fecha - Nueva fecha en formato ISO8601.
 * @param {string} datos.horaInicio - Nueva hora en formato "HH:MM".
 * @param {string} usuarioId - ID del usuario autenticado.
 * @returns {Promise<Turno>} El turno actualizado.
 * @throws {AppError} 403 si el usuario no es el dueño del turno.
 * @throws {AppError} 400 si el estado, limite de cambios, cooldown, antelacion
 *                       o disponibilidad del slot no lo permiten.
 * @throws {AppError} 409 si el nuevo slot ya esta ocupado por otro turno activo.
 */
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
    throw new AppError(
      "Ya realizaste el máximo de cambios de horario permitidos",
      400,
    );
  }

  if (turno.ultimoCambioHorario) {
    const diff = Date.now() - new Date(turno.ultimoCambioHorario).getTime();
    if (diff / (1000 * 60 * 60) < 24) {
      throw new AppError(
        "Solo podés cambiar el horario una vez cada 24 horas",
        400,
      );
    }
  }

  // Validar que el nuevo slot tenga al menos 24hs de antelacion
  const nuevoSlot = new Date(`${datos.fecha.split("T")[0]}T${datos.horaInicio}:00`);
  if (nuevoSlot - Date.now() < 24 * 60 * 60 * 1000) {
    throw new AppError(
      "El nuevo horario debe reservarse con al menos 24 horas de antelación",
      400,
    );
  }

  // Validar que el nuevo slot no esté ocupado por otro turno activo
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

/**
 * Elimina permanentemente un turno de la base de datos.
 * Solo se pueden eliminar turnos en estado "cancelado".
 * Uso exclusivo del administrador.
 * @param {string} id - ID del turno.
 * @returns {Promise<void>}
 * @throws {AppError} 404 si el turno no existe.
 * @throws {AppError} 400 si el turno no está cancelado.
 */
const eliminarTurno = async (id) => {
  const turno = await Turno.findById(id);
  if (!turno) throw new AppError("Turno no encontrado", 404);
  if (turno.estado !== "cancelado") {
    throw new AppError("Solo se pueden eliminar turnos cancelados", 400);
  }
  await Turno.findByIdAndDelete(id);
};

/**
 * Rechaza el comprobante de pago subido por el usuario.
 * Devuelve el turno al estado "pago_rechazado" para que el usuario pueda
 * subir un nuevo comprobante. Uso exclusivo del administrador.
 *
 * @param {string} id - ID del turno.
 * @param {string} motivo - Motivo del rechazo para informar al usuario.
 * @returns {Promise<Turno>} El turno actualizado.
 * @throws {AppError} 404 si el turno no existe.
 * @throws {AppError} 400 si el turno no esta en estado "señado".
 */
const rechazarPago = async (id, motivo) => {
  const turno = await Turno.findById(id);

  if (!turno) throw new AppError("Turno no encontrado", 404);
  if (turno.estado !== "señado") {
    throw new AppError(
      "Solo se puede rechazar el pago de un turno en estado señado",
      400,
    );
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

/**
 * Marca un turno como completado una vez finalizado el servicio.
 * Solo puede ejecutarse sobre turnos en estado "confirmado".
 * Uso exclusivo del administrador.
 *
 * @param {string} id - ID del turno.
 * @returns {Promise<Turno>} El turno actualizado.
 * @throws {AppError} 404 si el turno no existe.
 * @throws {AppError} 400 si el turno no esta en estado "confirmado".
 */

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
