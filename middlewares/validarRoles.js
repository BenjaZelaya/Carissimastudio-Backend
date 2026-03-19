// middlewares/validarRoles.js
export const esAdminRole = (req, res, next) => {
  if (!req.usuario) {
    return res.status(500).json({ msg: "Necesita un token válido" });
  }

  if (req.usuario.rol !== "ADMIN_ROLE") {
    return res.status(401).json({ msg: "No tiene permiso para realizar esta acción" });
  }

  next();
};

export const tieneRole = (...roles) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(500).json({ msg: "Necesita un token válido" });
    }

    if (!roles.includes(req.usuario.rol)) {
      return res.status(401).json({ msg: "No tiene permiso para realizar esta acción" });
    }

    next();
  };
};

