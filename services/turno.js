// services/turno.js
import mongoose from "mongoose";
import Turno from "../models/Turno.js";
import Producto from "../models/Producto.js";
import Bloqueo from "../models/Bloqueo.js";
import ConfigHorario from "../models/ConfigHorario.js";
import SlotLock from "../models/SlotLock.js";
import { AppError } from "../helpers/AppError.js";
import { enviarEmailConfirmacionReserva, enviarEmailNotificacionAdmin, enviarEmailConfirmacionTurno, enviarEmailCancelacionTurnoAlUsuario, enviarEmailCancelacionTurnoAlAdmin, enviarEmailCambioHorario } from "./email.js";
import logger from "../helpers/logger.js";

// ─── Helpers internos ────────────────────────────────────────────────────────

const horaAMinutos = (hora) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

// Fuerza un conflicto real de escritura entre transacciones concurrentes que
// compiten por el mismo slot: un countDocuments + insert por sí solos no
// generan conflicto en MongoDB porque cada uno escribe un documento Turno
// distinto. Al incrementar siempre el mismo documento de lock dentro de la
// transacción, dos requests para el mismo slot chocan en esa escritura y
// session.withTransaction reintenta automáticamente a la perdedora con los
// datos ya confirmados de la ganadora.
const tomarLockDeSlot = async (fechaStr, horaInicio, session) => {
  const slotKey = `${fechaStr}_${horaInicio}`;
  await SlotLock.findOneAndUpdate(
    { slotKey },
    { $setOnInsert: { slotKey }, $inc: { version: 1 } },
    { upsert: true, session }
  );
};

const validarAntelacionMinima = (fechaStr, horaInicio) => {
  const fechaHora = new Date(`${fechaStr}T${horaInicio}:00`);
  const veinticuatroHs = 24 * 60 * 60 * 1000;
  if (fechaHora.getTime() - Date.now() < veinticuatroHs) {
    throw new AppError("El turno debe reservarse con al menos 24 horas de antelación", 400);
  }
};

// ─── Lógica de negocio ───────────────────────────────────────────────────────

const crearTurno = async (datos, usuarioId) => {
  const { productos, fecha, horaInicio, metodoPago } = datos;

  if (!Array.isArray(productos) || productos.length === 0) {
    throw new AppError("Debe seleccionar al menos un producto", 400);
  }

  // El total nunca se confía del cliente: se recalcula a partir del precio
  // real de los productos activos para evitar manipulación del monto a pagar.
  const productosDb = await Producto.find({
    _id: { $in: productos },
    estado: true,
  });

  if (productosDb.length !== new Set(productos.map(String)).size) {
    throw new AppError("Uno o más productos no existen o no están disponibles", 400);
  }

  const total = productosDb.reduce((suma, p) => suma + p.precio, 0);

  const fechaStr = fecha.split("T")[0];
  validarAntelacionMinima(fechaStr, horaInicio);

  // Validar que el slot no esté lleno según la capacidad configurada
  const inicioDelDia = new Date(fechaStr + "T00:00:00.000Z");
  const finDelDia = new Date(fechaStr + "T23:59:59.999Z");

  // Validar que el día sea laborable según la configuración activa
  let config = await ConfigHorario.findOne({ activo: true });
  if (!config) config = await ConfigHorario.create({});

  const capacidad = config.capacidadPorTurno || 1;

  // getDay() devuelve 0=domingo..6=sábado; ConfigHorario.diasLaborales usa 1=lunes..7=domingo.
  const diaSemana = new Date(fechaStr + "T12:00:00").getDay();
  const diaNum = diaSemana === 0 ? 7 : diaSemana;

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

  // El chequeo de capacidad y la creación del turno se hacen dentro de una
  // misma transacción para evitar overbooking: sin esto, dos requests
  // concurrentes para el mismo slot podrían pasar el chequeo de capacidad
  // antes de que cualquiera de las dos escriba.
  const session = await mongoose.startSession();
  let turnoCreado;
  try {
    await session.withTransaction(async () => {
      await tomarLockDeSlot(fechaStr, horaInicio, session);

      const turnosEnSlot = await Turno.countDocuments({
        fecha: { $gte: inicioDelDia, $lt: finDelDia },
        horaInicio,
        estado: { $in: ["pendiente", "señado", "confirmado"] },
      }).session(session);

      if (turnosEnSlot >= capacidad) {
        throw new AppError("Ese horario ya está reservado", 409);
      }

      const turno = new Turno({
        usuario: usuarioId,
        productos,
        fecha: new Date(fecha.split("T")[0] + "T12:00:00"),
        horaInicio,
        total,
        seña,
        metodoPago,
        estado: "pendiente",
      });

      await turno.save({ session });
      turnoCreado = turno;
    });
  } finally {
    await session.endSession();
  }

  return turnoCreado;
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
  if (!["borrador", "pendiente", "pago_rechazado"].includes(turno.estado)) {
    throw new AppError("Este turno no puede ser cargado en su estado actual", 400);
  }

  const turnoActualizado = await Turno.findByIdAndUpdate(
    id,
    { comprobante: urlComprobante, estado: "señado" },
    { new: true },
  ).populate("usuario", "nombre apellido email telefono")
   .populate("productos", "nombreProducto precio img");

  // ─── Iniciar emails antes de retornar (conexiones SMTP abiertas inmediatamente)
  const emailUsuario = enviarEmailConfirmacionReserva(turnoActualizado.usuario, turnoActualizado);
  const emailAdmin = enviarEmailNotificacionAdmin(turnoActualizado.usuario, turnoActualizado);
  emailUsuario.catch((e) => logger.error(`Error email usuario:`, e.message));
  emailAdmin.catch((e) => logger.error(`Error email admin:`, e.message));

  logger.info(`✓ Turno ${id} actualizado con estado "señado"`);

  return turnoActualizado;
};

const confirmarTurno = async (id) => {
  const turno = await Turno.findById(id);
  if (!turno) throw new AppError("Turno no encontrado", 404);
  if (turno.estado !== "señado") {
    throw new AppError("El turno no tiene comprobante cargado aún", 400);
  }

  const turnoConfirmado = await Turno.findByIdAndUpdate(
    id,
    { estado: "confirmado", fechaConfirmacion: new Date() },
    { new: true },
  ).populate("usuario", "nombre apellido email telefono")
   .populate("productos", "nombreProducto precio img");

  // ─── Enviar email al usuario notificando la confirmación ───────────────────

  try {
    await enviarEmailConfirmacionTurno(turnoConfirmado.usuario, turnoConfirmado);
  } catch (emailError) {
    logger.error(`Error enviando email de confirmación al usuario:`, emailError.message);
    // No interrumpimos el flujo, el turno ya está confirmado
  }

  logger.info(`✓ Turno ${id} confirmado y email enviado al usuario`);

  return turnoConfirmado;
};

const cancelarTurno = async (id, usuarioId, esAdmin) => {
  const turno = await Turno.findById(id);
  if (!turno) throw new AppError("Turno no encontrado", 404);

  if (!esAdmin && turno.usuario.toString() !== usuarioId.toString()) {
    throw new AppError("No tenés permiso para cancelar este turno", 403);
  }

  const turnoCancelado = await Turno.findByIdAndUpdate(
    id,
    { estado: "cancelado" },
    { new: true },
  ).populate("usuario", "nombre apellido email telefono")
   .populate("productos", "nombreProducto precio img");

  // ─── Enviar emails según quién canceló ─────────────────────────────────────

  try {
    if (esAdmin) {
      // Si el admin cancela, notificar al usuario
      await enviarEmailCancelacionTurnoAlUsuario(turnoCancelado.usuario, turnoCancelado);
    } else {
      // Si el usuario cancela, notificar al admin
      await enviarEmailCancelacionTurnoAlAdmin(turnoCancelado.usuario, turnoCancelado);
    }
  } catch (emailError) {
    logger.error(`Error enviando email de cancelación:`, emailError.message);
    // No interrumpimos el flujo, la cancelación ya está lista
  }

  logger.info(`✓ Turno ${id} cancelado y email enviado`);

  return turnoCancelado;
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

  // Validar que estén dentro de 24 horas desde la confirmación
  if (turno.fechaConfirmacion) {
    const tiempoDesdeConfirmacion = Date.now() - new Date(turno.fechaConfirmacion).getTime();
    const horasTranscurridas = tiempoDesdeConfirmacion / (1000 * 60 * 60);
    
    if (horasTranscurridas > 24) {
      throw new AppError("Solo podés cambiar el horario dentro de 24 horas después de confirmar el turno", 400);
    }
  }

  validarAntelacionMinima(datos.fecha.split("T")[0], datos.horaInicio);

  // Validar que el nuevo slot no esté ocupado y aplicar el cambio dentro de
  // una misma transacción, para evitar que dos cambios concurrentes hacia el
  // mismo slot pasen ambos el chequeo antes de que cualquiera escriba.
  const inicioDia = new Date(datos.fecha);
  inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await tomarLockDeSlot(datos.fecha.split("T")[0], datos.horaInicio, session);

      const conflicto = await Turno.findOne({
        _id: { $ne: id },
        fecha: { $gte: inicioDia, $lt: finDia },
        horaInicio: datos.horaInicio,
        estado: { $in: ["pendiente", "señado", "confirmado"] },
      }).session(session);

      if (conflicto) {
        throw new AppError("Ese horario ya está reservado", 409);
      }

      await Turno.findByIdAndUpdate(
        id,
        {
          fecha: new Date(datos.fecha),
          horaInicio: datos.horaInicio,
          cambiosHorario: turno.cambiosHorario + 1,
          ultimoCambioHorario: new Date(),
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  const turnoActualizado = await Turno.findById(id)
    .populate("usuario", "nombre email")
    .populate("productos", "nombreProducto precio");

  // ─── Enviar email al usuario notificando el cambio ───
  try {
    await enviarEmailCambioHorario(turnoActualizado.usuario, turnoActualizado);
  } catch (emailError) {
    logger.error(`Error enviando email de cambio de horario:`, emailError.message);
    // No interrumpimos el flujo, el cambio ya está hecho
  }

  logger.info(`✓ Turno ${id} modificado y email de cambio enviado al usuario`);

  return turnoActualizado;
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

const obtenerInfoCambiosDisponibles = async (id, usuarioId) => {
  const turno = await Turno.findById(id);
  if (!turno) throw new AppError("Turno no encontrado", 404);

  if (turno.usuario.toString() !== usuarioId.toString()) {
    throw new AppError("No tenés permiso para acceder a esta información", 403);
  }

  let cambiosRestantes = 2 - turno.cambiosHorario;
  let tiempoRestante = null;
  let puedesCambiar = false;

  if (turno.fechaConfirmacion) {
    const tiempoDesdeConfirmacion = Date.now() - new Date(turno.fechaConfirmacion).getTime();
    const horasTranscurridas = tiempoDesdeConfirmacion / (1000 * 60 * 60);
    
    if (horasTranscurridas <= 24) {
      puedesCambiar = cambiosRestantes > 0;
      tiempoRestante = Math.ceil(24 - horasTranscurridas);
    } else {
      cambiosRestantes = 0;
      tiempoRestante = 0;
    }
  } else {
    // Si no ha sido confirmado, no puede cambiar
    cambiosRestantes = 0;
    puedesCambiar = false;
  }

  return {
    cambiosRestantes,
    cambiosRealizados: turno.cambiosHorario,
    tiempoRestanteHoras: tiempoRestante,
    puedesCambiar,
    fechaConfirmacion: turno.fechaConfirmacion,
    estado: turno.estado,
  };
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
  obtenerInfoCambiosDisponibles,
};