// routes/Usuario.js
import { Router } from "express";
import { check, param, query } from "express-validator";
import { validarCampos } from "../helpers/validar-campos.js";
import { validarJWT } from "../middlewares/validar-jwt.js";
import { esAdminRole } from "../middlewares/validarRoles.js";
import {
  getUsuarios,
  getUsuarioById,
  getPerfilPropio,
  putUsuario,
  putPerfilPropio,
  deleteUsuario,
  patchRestaurarUsuario,
} from "../controllers/Usuario.js";

const router = Router();

// GET /api/usuarios?page=1&limit=20  → lista todos los usuarios (admin)
router.get(
  "/",
  [
    validarJWT,
    esAdminRole,
    query("page").optional().isInt({ min: 1 }).withMessage("page debe ser un entero mayor a 0"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit debe ser un entero entre 1 y 100"),
    validarCampos,
  ],
  getUsuarios
);

// GET /api/usuarios/perfil  → obtiene el perfil del usuario logueado (usuario)
router.get(
  "/perfil",
  [validarJWT, validarCampos],
  getPerfilPropio
);

// GET /api/usuarios/:id  → obtiene un usuario por ID (admin)
router.get(
  "/:id",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  getUsuarioById
);

// PUT /api/usuarios/perfil  → actualiza el perfil del usuario logueado (usuario)
router.put(
  "/perfil",
  [
    validarJWT,
    check("nombre", "El nombre debe tener entre 3 y 40 caracteres")
      .optional()
      .isLength({ min: 3, max: 40 }),
    check("nombre", "El nombre solo puede contener letras y espacios")
      .optional()
      .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/),
    check("apellido", "El apellido debe tener entre 3 y 50 caracteres")
      .optional()
      .isLength({ min: 3, max: 50 }),
    check("telefono", "El teléfono debe contener entre 7 y 15 dígitos numéricos")
      .optional()
      .matches(/^[0-9]{7,15}$/),
    check("password", "La contraseña debe tener al menos 6 caracteres")
      .optional()
      .isLength({ min: 6 }),
    validarCampos,
  ],
  putPerfilPropio
);

// PUT /api/usuarios/:id  → actualiza un usuario por ID (admin)
router.put(
  "/:id",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    check("nombre", "El nombre debe tener entre 3 y 40 caracteres")
      .optional()
      .isLength({ min: 3, max: 40 }),
    check("nombre", "El nombre solo puede contener letras y espacios")
      .optional()
      .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/),
    check("apellido", "El apellido debe tener entre 3 y 50 caracteres")
      .optional()
      .isLength({ min: 3, max: 50 }),
    check("email", "Debe ser un correo válido")
      .optional()
      .isEmail(),
    check("telefono", "El teléfono debe contener entre 7 y 15 dígitos numéricos")
      .optional()
      .matches(/^[0-9]{7,15}$/),
    check("rol", "El rol debe ser ADMIN_ROLE o USER_ROLE")
      .optional()
      .isIn(["ADMIN_ROLE", "USER_ROLE"]),
    validarCampos,
  ],
  putUsuario
);

// DELETE /api/usuarios/:id  → baja lógica (admin)
router.delete(
  "/:id",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  deleteUsuario
);

// PATCH /api/usuarios/:id/restaurar  → reactiva un usuario eliminado (admin)
router.patch(
  "/:id/restaurar",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  patchRestaurarUsuario
);

export default router;