// services/Usuario.js
import Usuario from "../models/Usuario.js";
import { AppError } from "../helpers/AppError.js";
import bcrypt from "bcryptjs";

// ─── Helpers internos ────────────────────────────────────────────────────────

const buscarUsuarioActivo = async (id) => {
  const usuario = await Usuario.findById(id);
  if (!usuario || !usuario.estado) {
    throw new AppError("Usuario no encontrado", 404);
  }
  return usuario;
};

// ─── Lógica de negocio ───────────────────────────────────────────────────────

const obtenerUsuarios = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [usuarios, total] = await Promise.all([
    Usuario.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Usuario.countDocuments(),
  ]);
  return { total, page: Number(page), limit: Number(limit), usuarios };
};

const obtenerUsuarioPorId = async (id) => {
  return await buscarUsuarioActivo(id);
};

const actualizarUsuario = async (id, datos, usuarioActual) => {
  await buscarUsuarioActivo(id);

  // Solo el admin puede cambiar el rol
  const { password, estado, google, rol, ...camposPermitidos } = datos;

  if (rol && usuarioActual.rol !== "ADMIN_ROLE") {
    throw new AppError("No tenés permisos para cambiar el rol", 403);
  }

  if (rol) camposPermitidos.rol = rol;

  // Verifica duplicado de email con otro usuario distinto
  if (camposPermitidos.email) {
    const duplicado = await Usuario.findOne({
      _id: { $ne: id },
      email: camposPermitidos.email,
    });
    if (duplicado) {
      throw new AppError("El email ya está en uso por otro usuario", 409);
    }
  }

  // Si mandan password lo hasheamos
  if (datos.password) {
    const salt = bcrypt.genSaltSync(10);
    camposPermitidos.password = bcrypt.hashSync(datos.password, salt);
  }

  return await Usuario.findByIdAndUpdate(id, camposPermitidos, {
    new: true,
    runValidators: true,
  });
};

const actualizarPerfilPropio = async (id, datos) => {
  // El usuario solo puede editar estos campos
  const { nombre, apellido, telefono, password } = datos;
  const camposPermitidos = {};

  if (nombre) camposPermitidos.nombre = nombre;
  if (apellido) camposPermitidos.apellido = apellido;
  if (telefono) camposPermitidos.telefono = telefono;

  // Si mandan password lo hasheamos
  if (password) {
    const salt = bcrypt.genSaltSync(10);
    camposPermitidos.password = bcrypt.hashSync(password, salt);
  }

  if (Object.keys(camposPermitidos).length === 0) {
    throw new AppError("No se enviaron campos válidos para actualizar", 400);
  }

  return await Usuario.findByIdAndUpdate(id, camposPermitidos, {
    new: true,
    runValidators: true,
  });
};

const eliminarUsuario = async (id) => {
  await buscarUsuarioActivo(id);
  return await Usuario.findByIdAndUpdate(id, { estado: false }, { new: true });
};

const restaurarUsuario = async (id) => {
  const usuario = await Usuario.findById(id);
  if (!usuario) {
    throw new AppError("Usuario no encontrado", 404);
  }
  if (usuario.estado) {
    throw new AppError("El usuario ya se encuentra activo", 400);
  }
  return await Usuario.findByIdAndUpdate(id, { estado: true }, { new: true });
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  actualizarPerfilPropio,
  eliminarUsuario,
  restaurarUsuario,
};