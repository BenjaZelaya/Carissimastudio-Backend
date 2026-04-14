// routes/turno.js
import { Router } from "express";
import { check, param } from "express-validator";

import { validarCampos } from "../helpers/validar-campos.js";
import { validarJWT } from "../middlewares/validar-jwt.js";
import { esAdminRole } from "../middlewares/validarRoles.js";
import { upload, subirACloudinary } from "../middlewares/upload.js";

import {
  postTurno,
  getTurnosUsuario,
  getTurnosAdmin,
  getTurnoById,
  getMisTurnos,
  patchSubirComprobante,
  patchConfirmarTurno,
  patchCancelarTurno,
  patchCambiarHorario,
  patchRechazarPago,
  patchCompletarTurno,
  deleteTurno,
  getInfoCambiosDisponibles,
} from "../controllers/turno.js";

const router = Router();

// ==================== RUTAS ====================

// POST /api/turnos → crea un turno (usuario logueado)
router.post(
  "/",
  [
    validarJWT,
    check("productos", "Los productos son obligatorios").isArray({ min: 1 }),
    check("fecha", "La fecha es obligatoria").notEmpty().isISO8601(),
    check("horaInicio", "La hora es obligatoria")
      .notEmpty()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    check("metodoPago", "El método de pago debe ser transferencia o mercadopago")
      .isIn(["transferencia", "mercadopago"]),
    check("total", "El total es obligatorio").isFloat({ min: 0 }),
    validarCampos,
  ],
  postTurno
);

// GET /api/turnos/mis-turnos → turnos del usuario logueado
router.get("/mis-turnos", validarJWT, getMisTurnos);

// GET /api/turnos/admin → todos los turnos paginados (admin)
router.get(
  "/admin",
  [
    validarJWT,
    esAdminRole,
    check("pagina").optional().isInt({ min: 1 }),
    check("limite").optional().isInt({ min: 1, max: 100 }),
    validarCampos,
  ],
  getTurnosAdmin
);

// POST /api/turnos/:id/subir-comprobante → sube imagen (ANTES de /:id)
router.post(
  "/:id/subir-comprobante",
  [
    validarJWT,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
    upload.single("img"),
  ],
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ msg: "No se subió ninguna imagen" });
      }

      const resultado = await subirACloudinary(req.file.buffer);

      const { subirComprobante } = await import("../services/turno.js");
      const turno = await subirComprobante(
        req.params.id,
        resultado.secure_url,
        req.usuario._id
      );

      res.json(turno);
    } catch (error) {
      console.error("Error subir comprobante:", error);
      if (error.statusCode) {
        return res.status(error.statusCode).json({ msg: error.message });
      }
      res.status(500).json({ msg: "Error interno del servidor" });
    }
  }
);

// GET /api/turnos/:id/cambios-disponibles (ANTES de /:id)
router.get(
  "/:id/cambios-disponibles",
  [
    validarJWT,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  getInfoCambiosDisponibles
);

// PATCH /api/turnos/:id/comprobante (ANTES de /:id)
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

// PATCH /api/turnos/:id/confirmar (ANTES de /:id)
router.patch(
  "/:id/confirmar",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  patchConfirmarTurno
);

// PATCH /api/turnos/:id/cancelar (ANTES de /:id)
router.patch(
  "/:id/cancelar",
  [
    validarJWT,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  patchCancelarTurno
);

// PATCH /api/turnos/:id/cambiar-horario (ANTES de /:id)
router.patch(
  "/:id/cambiar-horario",
  [
    validarJWT,
    param("id").isMongoId().withMessage("ID no válido"),
    check("fecha", "La fecha es obligatoria").notEmpty().isISO8601(),
    check("horaInicio", "La hora es obligatoria")
      .notEmpty()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    validarCampos,
  ],
  patchCambiarHorario
);

// PATCH /api/turnos/:id/rechazar-pago (ANTES de /:id)
router.patch(
  "/:id/rechazar-pago",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    check("motivo", "El motivo debe ser un texto").optional().isString(),
    validarCampos,
  ],
  patchRechazarPago
);

// PATCH /api/turnos/:id/completar (ANTES de /:id)
router.patch(
  "/:id/completar",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  patchCompletarTurno
);

// DELETE /api/turnos/:id (ANTES de GET /:id)
router.delete(
  "/:id",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  deleteTurno
);

// GET /api/turnos/:id → AL FINAL, después de todas las rutas específicas
router.get(
  "/:id",
  [
    validarJWT,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  getTurnoById
);

export default router;