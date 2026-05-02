// services/pack.js
import Pack from "../models/Pack.js";
import PackCompra from "../models/PackCompra.js";
import Sesion from "../models/Sesion.js";
import { AppError } from "../helpers/AppError.js";

// ──────────────────────────────────────────────
// PACK (CATÁLOGO)
// ──────────────────────────────────────────────

export const listarPacks = async (soloActivos = true) => {
  const filtro = soloActivos ? { activo: true } : {};
  return Pack.find(filtro).sort({ createdAt: -1 });
};

export const obtenerPackPorId = async (id) => {
  const pack = await Pack.findById(id);
  if (!pack) throw new AppError("Pack no encontrado", 404);
  return pack;
};

export const crearPack = async (datos) => {
  const pack = new Pack(datos);
  await pack.save();
  return pack;
};

export const actualizarPack = async (id, datos) => {
  const pack = await Pack.findByIdAndUpdate(id, datos, {
    new: true,
    runValidators: true,
  });
  if (!pack) throw new AppError("Pack no encontrado", 404);
  return pack;
};

export const desactivarPack = async (id) => {
  const pack = await Pack.findByIdAndUpdate(
    id,
    { activo: false },
    { new: true }
  );
  if (!pack) throw new AppError("Pack no encontrado", 404);
  return pack;
};

export const eliminarPack = async (id) => {
  const pack = await Pack.findByIdAndDelete(id);
  if (!pack) throw new AppError("Pack no encontrado", 404);
  return pack;
};

export const eliminarPackCompra = async (id) => {
  const compra = await PackCompra.findById(id);
  if (!compra) throw new AppError("Compra no encontrada", 404);
  // Eliminar las sesiones asociadas
  await Sesion.deleteMany({ packCompra: id });
  await PackCompra.findByIdAndDelete(id);
};

// ──────────────────────────────────────────────
// PACK COMPRA
// ──────────────────────────────────────────────

export const crearPackCompra = async (packId, usuarioId, metodoPago) => {
  const pack = await Pack.findById(packId);
  if (!pack) throw new AppError("Pack no encontrado", 404);
  if (!pack.activo) throw new AppError("Este pack no está disponible", 400);

  const montoAbonado = Math.round(pack.precio * (pack.porcentajeSeña / 100));

  // Crear la compra
  const compra = new PackCompra({
    pack: packId,
    usuario: usuarioId,
    montoTotal: pack.precio,
    montoAbonado,
    metodoPago,
    estado: "pendiente",
  });
  await compra.save();

  // Crear las N sesiones
  const sesiones = [];
  for (let i = 1; i <= pack.totalSesiones; i++) {
    const sesion = new Sesion({
      packCompra: compra._id,
      numero: i,
      estado: "sin_fecha",
    });
    await sesion.save();
    sesiones.push(sesion._id);
  }

  compra.sesiones = sesiones;
  await compra.save();

  return compra.populate([
    { path: "pack", select: "nombre precio porcentajeSeña totalSesiones" },
    { path: "sesiones" },
  ]);
};

export const obtenerComprasUsuario = async (usuarioId) => {
  return PackCompra.find({ usuario: usuarioId })
    .populate("pack", "nombre precio porcentajeSeña totalSesiones imagen descripcion")
    .populate("sesiones")
    .sort({ createdAt: -1 });
};

export const obtenerComprasAdmin = async () => {
  return PackCompra.find()
    .populate("pack", "nombre precio totalSesiones")
    .populate("usuario", "nombre apellido email telefono")
    .populate("sesiones")
    .sort({ createdAt: -1 });
};

export const subirComprobanteCompra = async (compraId, urlComprobante, usuarioId) => {
  const compra = await PackCompra.findById(compraId);
  if (!compra) throw new AppError("Compra no encontrada", 404);
  if (compra.usuario.toString() !== usuarioId.toString()) {
    throw new AppError("No tenés permiso para modificar esta compra", 403);
  }
  if (!["pendiente"].includes(compra.estado)) {
    throw new AppError("Esta compra no puede actualizarse en su estado actual", 400);
  }

  compra.comprobantePago = urlComprobante;
  compra.estado = "señado";
  await compra.save();

  return compra.populate([
    { path: "pack", select: "nombre precio porcentajeSeña totalSesiones" },
    { path: "sesiones" },
  ]);
};

export const activarCompra = async (compraId) => {
  const compra = await PackCompra.findById(compraId);
  if (!compra) throw new AppError("Compra no encontrada", 404);
  if (!["señado"].includes(compra.estado)) {
    throw new AppError("Solo se pueden activar compras en estado señado", 400);
  }
  compra.estado = "activo";
  await compra.save();
  return compra.populate([
    { path: "pack", select: "nombre precio totalSesiones" },
    { path: "usuario", select: "nombre apellido email" },
    { path: "sesiones" },
  ]);
};

// ──────────────────────────────────────────────
// SESIONES
// ──────────────────────────────────────────────

export const agendarSesion = async (compraId, sesionId, fecha, horaInicio, usuarioId) => {
  const compra = await PackCompra.findById(compraId).populate("sesiones");
  if (!compra) throw new AppError("Compra no encontrada", 404);
  if (compra.usuario.toString() !== usuarioId.toString()) {
    throw new AppError("No tenés permiso para modificar esta compra", 403);
  }
  if (compra.estado !== "activo") {
    throw new AppError("La compra debe estar activa para agendar sesiones", 400);
  }

  const sesion = await Sesion.findOne({ _id: sesionId, packCompra: compraId });
  if (!sesion) throw new AppError("Sesión no encontrada", 404);
  if (!["sin_fecha", "cancelada"].includes(sesion.estado)) {
    throw new AppError("Esta sesión no puede ser agendada", 400);
  }

  sesion.fecha = fecha;
  sesion.horaInicio = horaInicio;
  sesion.estado = "pendiente";
  await sesion.save();

  return sesion;
};

export const confirmarSesion = async (compraId, sesionId) => {
  const sesion = await Sesion.findOne({ _id: sesionId, packCompra: compraId });
  if (!sesion) throw new AppError("Sesión no encontrada", 404);
  if (sesion.estado !== "pendiente") {
    throw new AppError("Solo se pueden confirmar sesiones pendientes", 400);
  }

  sesion.estado = "confirmada";
  await sesion.save();
  return sesion;
};

export const completarSesion = async (compraId, sesionId) => {
  const sesion = await Sesion.findOne({ _id: sesionId, packCompra: compraId });
  if (!sesion) throw new AppError("Sesión no encontrada", 404);
  if (sesion.estado !== "confirmada") {
    throw new AppError("Solo se pueden completar sesiones confirmadas", 400);
  }

  sesion.estado = "completada";
  await sesion.save();

  // Verificar si todas las sesiones están completadas
  const compra = await PackCompra.findById(compraId).populate("sesiones");
  const todasCompletadas = compra.sesiones.every(
    (s) => s.estado === "completada" || s.estado === "cancelada"
  );
  const hayAlCompletada = compra.sesiones.some((s) => s.estado === "completada");

  if (todasCompletadas && hayAlCompletada) {
    compra.estado = "completado";
    await compra.save();
  }

  return { sesion, compra };
};

export const cancelarSesion = async (compraId, sesionId) => {
  const sesion = await Sesion.findOne({ _id: sesionId, packCompra: compraId });
  if (!sesion) throw new AppError("Sesión no encontrada", 404);
  if (sesion.estado === "completada") {
    throw new AppError("No se puede cancelar una sesión completada", 400);
  }

  sesion.estado = "cancelada";
  await sesion.save();
  return sesion;
};
