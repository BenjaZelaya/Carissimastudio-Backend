// routes/Producto.js
import { Router } from "express";
import { check, param, query } from "express-validator";
import { validarCampos } from "../helpers/validar-campos.js";
import { validarJWT } from "../middlewares/validar-jwt.js";
import { esAdminRole } from "../middlewares/validarRoles.js";
import {
  getProductos,
  getProductoById,
  postProducto,
  putProducto,
  deleteProducto,
  patchRestaurarProducto,
} from "../controllers/Producto.js";

const router = Router();

// GET /api/productos?page=1&limit=20  → lista productos activos paginados (público)
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page debe ser un entero mayor a 0"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit debe ser un entero entre 1 y 100"),
    validarCampos,
  ],
  getProductos
);

// GET /api/productos/:id  → obtiene un producto por ID (público)
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID no válido"), validarCampos],
  getProductoById
);

// POST /api/productos  → crea un producto (admin)
router.post(
  "/",
  [
    validarJWT,
    esAdminRole,
    check("nombreProducto", "El nombre es obligatorio").notEmpty(),
    check("nombreProducto", "El nombre debe tener entre 3 y 50 caracteres").isLength({ min: 3, max: 50 }),
    check("precio", "El precio es obligatorio y debe ser un número mayor o igual a 0")
      .isFloat({ min: 0 }),
    check("img", "La imagen es obligatoria").notEmpty(),
    check("img", "La URL de la imagen debe ser de Cloudinary")
      .matches(/^https:\/\/res\.cloudinary\.com\/.+$/),
    validarCampos,
  ],
  postProducto
);

// PUT /api/productos/:id  → actualiza un producto (admin)
router.put(
  "/:id",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    check("precio", "El precio debe ser un número mayor o igual a 0")
      .optional()
      .isFloat({ min: 0 }),
    check("img", "La URL de la imagen debe ser de Cloudinary")
      .optional()
      .matches(/^https:\/\/res\.cloudinary\.com\/.+$/),
    check("nombreProducto", "El nombre debe tener entre 3 y 50 caracteres")
      .optional()
      .isLength({ min: 3, max: 50 }),
    validarCampos,
  ],
  putProducto
);

// DELETE /api/productos/:id  → baja lógica (admin)
router.delete(
  "/:id",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  deleteProducto
);

// PATCH /api/productos/:id/restaurar  → reactiva un producto eliminado (admin)
router.patch(
  "/:id/restaurar",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  patchRestaurarProducto
);

export default router;
