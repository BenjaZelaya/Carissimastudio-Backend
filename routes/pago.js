// routes/pago.js
import { Router } from "express";
import { param } from "express-validator";
import { validarCampos } from "../helpers/validar-campos.js";
import { validarJWT } from "../middlewares/validar-jwt.js";
import { postCrearPreferencia, postWebhook } from "../controllers/pago.js";

const router = Router();

// POST /api/pagos/preferencia/:turnoId → crea preferencia MP
router.post(
  "/preferencia/:turnoId",
  [
    validarJWT,
    param("turnoId").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  postCrearPreferencia
);

// POST /api/pagos/webhook → recibe notificaciones de MP
router.post("/webhook", postWebhook);

export default router;