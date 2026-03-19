const { response } = require("express");

const esAdminRole = (req, res = response, next) => {
  if (!req.usuario) {
    return res.status(500).json({
      msg: "Necesita un token valido",
    });
  }

  const { rol } = req.usuario;

  if (rol !== "ADMIN_ROLE") {
    return res.status(401).json({
      msg: "No tiene permiso para realizar esta acción",
    });
  }

  next();
};

const tieneRole = (...roles) => {
  return (req, res = response, next) => {
    if (!req.usuario) {
      return res.status(500).json({
        msg: "Necesita un token valido",
      });
    }

    if (!roles.includes(req.usuario.rol)) {
      return res.status(401).json({
        msg: "No tiene permiso para realizar esta acción",
      });
    }

    next();
  };
};

module.exports = {
  esAdminRole,
  tieneRole,
};
