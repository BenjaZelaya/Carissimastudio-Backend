// routes/Categoria.js
import { Router } from "express";
import { check, param, query } from "express-validator";
import { validarCampos } from "../helpers/validar-campos.js";
import { validarJWT } from "../middlewares/validar-jwt.js";
import { esAdminRole } from "../middlewares/validarRoles.js";
import {
  getCategorias,
  getCategoriasAdmin,
  getCategoriaById,
  postCategoria,
  putCategoria,
  deleteCategoria,
  patchRestaurarCategoria,
  agregarProducto,
  quitarProducto,
  patchOrden,
} from "../controllers/Categoria.js";

const router = Router();

// GET /api/categorias?page=1&limit=20  → lista categorías activas paginadas (público)
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page debe ser un entero mayor a 0"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit debe ser un entero entre 1 y 100"),
    validarCampos,
  ],
  getCategorias
);

// GET /api/categorias/admin?page=1&limit=20  → lista todas las categorías incluso inactivas (admin)
router.get(
  "/admin",
  [
    validarJWT,
    esAdminRole,
    query("page").optional().isInt({ min: 1 }).withMessage("page debe ser un entero mayor a 0"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit debe ser un entero entre 1 y 100"),
    validarCampos,
  ],
  getCategoriasAdmin
);

// GET /api/categorias/:id  → obtiene una categoría por ID (público)
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID no válido"), validarCampos],
  getCategoriaById
);

// POST /api/categorias  → crea una categoría (admin)
router.post(
  "/",
  [
    validarJWT,
    esAdminRole,
    check("nombreCategoria", "El nombre es obligatorio").notEmpty(),
    check("nombreCategoria", "El nombre debe tener entre 3 y 50 caracteres").isLength({ min: 3, max: 50 }),
    check("descripcion", "La descripción debe tener entre 10 y 500 caracteres")
      .optional()
      .isLength({ min: 10, max: 500 }),
    validarCampos,
  ],
  postCategoria
);

// PUT /api/categorias/:id  → actualiza una categoría (admin)
router.put(
  "/:id",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    check("nombreCategoria", "El nombre debe tener entre 3 y 50 caracteres")
      .optional()
      .isLength({ min: 3, max: 50 }),
    check("descripcion", "La descripción debe tener entre 10 y 500 caracteres")
      .optional()
      .isLength({ min: 10, max: 500 }),
    validarCampos,
  ],
  putCategoria
);

// DELETE /api/categorias/:id  → baja lógica (admin)
router.delete(
  "/:id",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  deleteCategoria
);

// PATCH /api/categorias/:id/restaurar  → reactiva una categoría eliminada (admin)
router.patch(
  "/:id/restaurar",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID no válido"),
    validarCampos,
  ],
  patchRestaurarCategoria
);

// PATCH /api/categorias/:id/agregar-producto  → agrega un producto a la categoría (admin)
router.patch(
  "/:id/agregar-producto",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID de categoría no válido"),
    check("productoId", "El ID del producto es obligatorio").notEmpty(),
    check("productoId", "ID de producto no válido").isMongoId(),
    validarCampos,
  ],
  agregarProducto
);

// PATCH /api/categorias/:id/quitar-producto  → quita un producto de la categoría (admin)
router.patch(
  "/:id/quitar-producto",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId().withMessage("ID de categoría no válido"),
    check("productoId", "El ID del producto es obligatorio").notEmpty(),
    check("productoId", "ID de producto no válido").isMongoId(),
    validarCampos,
  ],
  quitarProducto
);

// PATCH /api/categorias/orden  → actualiza el orden (admin)
router.patch(
  "/orden",
  [validarJWT, esAdminRole],
  patchOrden
);

export default router;

