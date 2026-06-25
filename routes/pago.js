// routes/pago.js
import { Router } from "express";
import { param } from "express-validator";
import rateLimit from "express-rate-limit";
import { validarCampos } from "../helpers/validar-campos.js";
import { validarJWT } from "../middlewares/validar-jwt.js";
import { postCrearPreferencia, postWebhook } from "../controllers/pago.js";

const router = Router();

const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { msg: "Demasiadas notificaciones. Intenta nuevamente en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

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
router.post("/webhook", webhookLimiter, postWebhook);

export default router;