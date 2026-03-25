// routes/horario.js
import { Router } from "express";
import { check, param, query } from "express-validator";
import { validarCampos } from "../helpers/validar-campos.js";
import { validarJWT } from "../middlewares/validar-jwt.js";
import { esAdminRole } from "../middlewares/validarRoles.js";
import {
  getConfig,
  putConfig,
  getDisponibilidad,
  getBloqueos,
  postBloqueo,
  deleteBloqueo,
} from "../controllers/horario.js";

const router = Router();

// GET /api/horarios/config  → obtiene la configuración (público)
router.get("/config", getConfig);

// PUT /api/horarios/config  → actualiza la configuración (admin)
router.put(
  "/config",
  [
    validarJWT,
    esAdminRole,
    check("horaInicio", "La hora de inicio es obligatoria").notEmpty(),
    check("horaInicio", "Formato inválido (HH:MM)").matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    check("horaFin", "La hora de fin es obligatoria").notEmpty(),
    check("horaFin", "Formato inválido (HH:MM)").matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    check("duracionTurno", "La duración debe ser un número mayor a 0").isInt({ min: 15 }),
    check("diasLaborales", "Los días laborales son obligatorios").isArray({ min: 1 }),
    validarCampos,
  ],
  putConfig
);

// GET /api/horarios/disponibilidad?fecha=2026-03-24  → turnos disponibles (público)
router.get(
  "/disponibilidad",
  [
    query("fecha").optional().isISO8601().withMessage("Formato de fecha inválido"),
    validarCampos,
  ],
  getDisponibilidad
);

// GET /api/horarios/bloqueos  → lista bloqueos (admin)
router.get(
  "/bloqueos",
  [validarJWT, esAdminRole],
  getBloqueos
);

// POST /api/horarios/bloqueos  → crea un bloqueo (admin)
router.post(
  "/bloqueos",
  [
    validarJWT,
    esAdminRole,
    check("tipo", "El tipo debe ser 'dia' o 'horario'").isIn(["dia", "horario"]),
    check("fecha", "La fecha es obligatoria").notEmpty(),
    check("fecha", "Formato de fecha inválido").isISO8601(),
    check("horaInicio").optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage("Formato inválido (HH:MM)"),
    check("horaFin").optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage("Formato inválido (HH:MM)"),
    check("motivo").optional().isLength({ max: 200 }),
    validarCampos,
  ],
  postBloqueo
);

// DELETE /api/horarios/bloqueos/:id  → elimina un bloqueo (admin)
router.delete(
  "/bloqueos/:id",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  deleteBloqueo
);

export default router;