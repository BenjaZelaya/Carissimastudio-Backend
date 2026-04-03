// middlewares/validar-jwt.js
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";

const validarJWT = async (req, res, next) => {
  // Soporta tanto "x-token" como "Authorization: Bearer ..."
  let token = req.header("x-token");

  if (!token) {
    const authHeader = req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "").trim();
    }
  }

  if (!token) {
    return res.status(401).json({ 
      msg: "No hay token en la petición. Inicia sesión nuevamente." 
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await Usuario.findById(payload.uid);

    if (!usuario || !usuario.estado) {
      return res.status(401).json({ 
        msg: "Token no válido - usuario inexistente o inactivo" 
      });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    console.error("Error validarJWT:", error.message);
    return res.status(401).json({ 
      msg: "Token no válido o expirado" 
    });
  }
};

export { validarJWT };