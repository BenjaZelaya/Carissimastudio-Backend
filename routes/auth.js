// routes/auth.js
import { Router } from "express";
import { check } from "express-validator";
import { validarCampos } from "../helpers/validar-campos.js";
import { validarJWT } from "../middlewares/validar-jwt.js";
import { register, login, renovarToken } from "../controllers/auth.js";

const router = Router();

// POST /api/auth/register  → registro de usuario
router.post(
  "/register",
  [
    check("nombre", "El nombre es obligatorio").notEmpty(),
    check("nombre", "El nombre debe tener entre 3 y 40 caracteres").isLength({ min: 3, max: 40 }),
    check("nombre", "El nombre solo puede contener letras y espacios")
      .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/),
    check("apellido", "El apellido es obligatorio").notEmpty(),
    check("apellido", "El apellido debe tener entre 3 y 50 caracteres").isLength({ min: 3, max: 50 }),
    check("email", "El correo es obligatorio").notEmpty(),
    check("email", "Debe ser un correo válido").isEmail(),
    check("password", "La contraseña es obligatoria").notEmpty(),
    check("password", "La contraseña debe tener al menos 6 caracteres").isLength({ min: 6 }),
    check("telefono", "El teléfono es obligatorio").notEmpty(),
    check("telefono", "El teléfono debe contener entre 7 y 15 dígitos numéricos")
      .matches(/^[0-9]{7,15}$/),
    validarCampos,
  ],
  register
);

// POST /api/auth/login  → login de usuario
router.post(
  "/login",
  [
    check("email", "El correo es obligatorio").notEmpty(),
    check("email", "Debe ser un correo válido").isEmail(),
    check("password", "La contraseña es obligatoria").notEmpty(),
    validarCampos,
  ],
  login
);

// GET /api/auth/renovar  → renueva el token (usuario logueado)
router.get(
  "/renovar",
  [validarJWT],
  renovarToken
);

export default router;