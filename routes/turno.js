// routes/turno.js
import { Router } from "express";
import { check, param } from "express-validator";
import { validarCampos } from "../helpers/validar-campos.js";
import { validarJWT } from "../middlewares/validar-jwt.js";
import { esAdminRole } from "../middlewares/validarRoles.js";
import {
  postTurno,
  getTurnosUsuario,
  getTurnosAdmin,
  getTurnoById,
  patchSubirComprobante,
  patchConfirmarTurno,
  patchCancelarTurno,
  patchCambiarHorario,
  deleteTurno,
} from "../controllers/turno.js";

const router = Router();

// POST /api/turnos  → crea un turno (usuario logueado)
router.post(
  "/",
  [
    validarJWT,
    check("productos", "Los productos son obligatorios").isArray({ min: 1 }),
    check("fecha", "La fecha es obligatoria").notEmpty().isISO8601(),
    check("horaInicio", "La hora es obligatoria").notEmpty()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    check("metodoPago", "El método de pago debe ser transferencia o mercadopago")
      .isIn(["transferencia", "mercadopago"]),
    check("total", "El total es obligatorio").isFloat({ min: 0 }),
    validarCampos,
  ],
  postTurno
);

// GET /api/turnos/mis-turnos  → turnos del usuario logueado
router.get("/mis-turnos", [validarJWT], getTurnosUsuario);

// GET /api/turnos/admin  → todos los turnos (admin)
router.get("/admin", [validarJWT, esAdminRole], getTurnosAdmin);

// GET /api/turnos/:id  → turno por ID
router.get(
  "/:id",
  [validarJWT, param("id").isMongoId().withMessage("ID no válido"), validarCampos],
  getTurnoById
);

// PATCH /api/turnos/:id/comprobante  → sube comprobante de transferencia
router.patch(
  "/:id/comprobante",
  [
    validarJWT,
    param("id").isMongoId().withMessage("ID no válido"),
    check("comprobante", "La URL del comprobante es obligatoria").notEmpty(),
    validarCampos,
  ],
  patchSubirComprobante
);

// PATCH /api/turnos/:id/confirmar  → confirma el turno (admin)
router.patch(
  "/:id/confirmar",
  [validarJWT, esAdminRole, param("id").isMongoId().withMessage("ID no válido"), validarCampos],
  patchConfirmarTurno
);

// PATCH /api/turnos/:id/cancelar  → cancela el turno (usuario o admin)
router.patch(
  "/:id/cancelar",
  [validarJWT, param("id").isMongoId().withMessage("ID no válido"), validarCampos],
  patchCancelarTurno
);

// PATCH /api/turnos/:id/cambiar-horario  → cambia fecha y hora (usuario)
router.patch(
  "/:id/cambiar-horario",
  [
    validarJWT,
    param("id").isMongoId().withMessage("ID no válido"),
    check("fecha", "La fecha es obligatoria").notEmpty().isISO8601(),
    check("horaInicio", "La hora es obligatoria").notEmpty()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    validarCampos,
  ],
  patchCambiarHorario
);

// DELETE /api/turnos/:id  → elimina definitivamente un turno cancelado (admin)
router.delete(
  "/:id",
  [validarJWT, esAdminRole, param("id").isMongoId().withMessage("ID no válido"), validarCampos],
  deleteTurno
);

export default router;