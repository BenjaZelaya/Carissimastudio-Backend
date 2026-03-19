// middlewares/validar-jwt.js
import jwt from "jsonwebtoken";

// TODO (punto 7): importar el modelo de Usuario cuando esté creado y hacer
//   lookup en DB para verificar que el usuario todavía existe y está activo.

const validarJWT = async (req, res, next) => {
  const token = req.header("x-token");

  if (!token) {
    return res.status(401).json({ msg: "No hay token en la petición" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;
    next();
  } catch {
    return res.status(401).json({ msg: "Token no válido" });
  }
};

export { validarJWT };
