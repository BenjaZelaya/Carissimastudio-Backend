// middlewares/validarRoles.js

/**
 * Middleware que verifica que el usuario autenticado tenga rol ADMIN_ROLE.
 * Debe ejecutarse despues de validarJWT, que es quien popula req.usuario.
 *
 * @throws 500 si validarJWT no se ejecuto antes (req.usuario ausente).
 * @throws 403 si el usuario no tiene rol de administrador.
 */
export const esAdminRole = (req, res, next) => {
  if (!req.usuario) {
    return res.status(500).json({ msg: "Necesita un token válido" });
  }

  if (req.usuario.rol !== "ADMIN_ROLE") {
    return res.status(403).json({ msg: "No tiene permiso para realizar esta acción" });
  }

  next();
};
