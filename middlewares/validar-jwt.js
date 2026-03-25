// middlewares/validar-jwt.js
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";

const validarJWT = async (req, res, next) => {
  const token = req.header("x-token");

  if (!token) {
    return res.status(401).json({ msg: "No hay token en la petición" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Verifica que el usuario exista y esté activo en la DB
    const usuario = await Usuario.findById(payload.uid);
    if (!usuario || !usuario.estado) {
      return res.status(401).json({ msg: "Token no válido - usuario inexistente o inactivo" });
    }

    req.usuario = usuario;
    next();
  } catch {
    return res.status(401).json({ msg: "Token no válido" });
  }
};

export { validarJWT };
