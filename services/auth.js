// services/auth.js
import Usuario from "../models/Usuario.js";
import { AppError } from "../helpers/AppError.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ─── Lógica de negocio ───────────────────────────────────────────────────────

const registrar = async (datos) => {
  const { nombre, apellido, email, password, telefono } = datos;

  // Verifica si el email ya está en uso
  const existente = await Usuario.findOne({ email });
  if (existente) {
    throw new AppError("El email ya está registrado", 409);
  }

  // Hashea la contraseña
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const usuario = new Usuario({
    nombre,
    apellido,
    email,
    password: passwordHash,
    telefono,
  });

  return await usuario.save();
};

const login = async ({ email, password }) => {
  // Verifica que el email exista y el usuario esté activo
  const usuario = await Usuario.findOne({ email });
  if (!usuario || !usuario.estado) {
    throw new AppError("Credenciales incorrectas", 401);
  }

  // Verifica la contraseña
  const passwordValida = bcrypt.compareSync(password, usuario.password);
  if (!passwordValida) {
    throw new AppError("Credenciales incorrectas", 401);
  }

  // Genera el token
  const token = jwt.sign(
    { uid: usuario._id, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  return { usuario, token };
};

const renovarToken = async (usuario) => {
  const token = jwt.sign(
    { uid: usuario._id, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  return { usuario, token };
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export { registrar, login, renovarToken };