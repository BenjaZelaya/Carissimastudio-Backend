// routes/pack.js
import { Router } from "express";
import { check, param } from "express-validator";

import { validarCampos } from "../helpers/validar-campos.js";
import { validarJWT } from "../middlewares/validar-jwt.js";
import { esAdminRole } from "../middlewares/validarRoles.js";
import { upload, subirACloudinary, manejarErrorUpload } from "../middlewares/upload.js";

import {
  getPacks,
  getPackById,
  postPack,
  putPack,
  deletePack,
  postPackCompra,
  getMisCompras,
  getComprasAdmin,
  patchSubirComprobante,
  patchActivarCompra,
  patchAgendarSesion,
  patchConfirmarSesion,
  patchCompletarSesion,
  patchCancelarSesion,
  deletePackCompra,
} from "../controllers/pack.js";

import { crearPreferenciaPack } from "../services/mercadopago.js";
import { handleError } from "../helpers/handleError.js";

const router = Router();

// ── CATÁLOGO (PÚBLICO) ────────────────────────────────────────────────────────

// GET /api/packs → listar packs (activos para usuarios, todos para admin)
router.get("/", (req, res, next) => {
  // Intentar JWT pero no requerirlo (ruta semi-pública)
  const token = req.header("x-token");
  if (token) {
    return validarJWT(req, res, () => getPacks(req, res));
  }
  return getPacks(req, res);
});

// GET /api/packs/:id
router.get("/:id", [param("id").isMongoId(), validarCampos], getPackById);

// POST /api/packs (admin)
router.post(
  "/",
  [
    validarJWT,
    esAdminRole,
    check("nombre", "El nombre es obligatorio").notEmpty().trim(),
    check("totalSesiones", "La cantidad de sesiones es obligatoria").isInt({ min: 1 }),
    check("precio", "El precio es obligatorio").isFloat({ min: 0 }),
    check("porcentajeSeña").optional().isFloat({ min: 1, max: 100 }),
    validarCampos,
  ],
  postPack
);

// PUT /api/packs/:id (admin)
router.put(
  "/:id",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId(),
    check("nombre").optional().notEmpty().trim(),
    check("totalSesiones").optional().isInt({ min: 1 }),
    check("precio").optional().isFloat({ min: 0 }),
    validarCampos,
  ],
  putPack
);

// DELETE /api/packs/:id (admin – soft delete)
router.delete(
  "/:id",
  [validarJWT, esAdminRole, param("id").isMongoId(), validarCampos],
  deletePack
);

// ── COMPRAS ───────────────────────────────────────────────────────────────────

// GET /api/packs/compras/mis-compras (usuario)
router.get("/compras/mis-compras", validarJWT, getMisCompras);

// GET /api/packs/compras/admin (admin)
router.get("/compras/admin", [validarJWT, esAdminRole], getComprasAdmin);

// POST /api/packs/compras → crear compra (usuario)
router.post(
  "/compras",
  [
    validarJWT,
    check("packId", "El pack es obligatorio").isMongoId(),
    check("metodoPago", "El método de pago es inválido").isIn([
      "transferencia",
      "mercadopago",
    ]),
    validarCampos,
  ],
  postPackCompra
);

// POST /api/packs/compras/:id/subir-comprobante (usuario)
router.post(
  "/compras/:id/subir-comprobante",
  [validarJWT, param("id").isMongoId(), validarCampos, upload.single("img"), manejarErrorUpload],
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ msg: "No se recibió ningún archivo" });
      }
      const resultado = await subirACloudinary(req.file.buffer);
      req.body.comprobante = resultado.secure_url;
      return patchSubirComprobante(req, res);
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// PATCH /api/packs/compras/:id/activar (admin → estado activo)
router.patch(
  "/compras/:id/activar",
  [validarJWT, esAdminRole, param("id").isMongoId(), validarCampos],
  patchActivarCompra
);

// POST /api/packs/compras/:id/preferencia-mp (usuario → link MP)
router.post(
  "/compras/:id/preferencia-mp",
  [validarJWT, param("id").isMongoId(), validarCampos],
  async (req, res) => {
    try {
      const resultado = await crearPreferenciaPack(
        req.params.id,
        req.usuario._id
      );
      res.json(resultado);
    } catch (error) {
      handleError(res, error);
    }
  }
);

// ── SESIONES ──────────────────────────────────────────────────────────────────

// PATCH /api/packs/compras/:id/sesiones/:sesionId/agendar (usuario)
router.patch(
  "/compras/:id/sesiones/:sesionId/agendar",
  [
    validarJWT,
    param("id").isMongoId(),
    param("sesionId").isMongoId(),
    check("fecha", "La fecha es obligatoria").notEmpty(),
    check("horaInicio", "La hora es obligatoria")
      .notEmpty()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    validarCampos,
  ],
  patchAgendarSesion
);

// PATCH /api/packs/compras/:id/sesiones/:sesionId/confirmar (admin)
router.patch(
  "/compras/:id/sesiones/:sesionId/confirmar",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId(),
    param("sesionId").isMongoId(),
    validarCampos,
  ],
  patchConfirmarSesion
);

// PATCH /api/packs/compras/:id/sesiones/:sesionId/completar (admin)
router.patch(
  "/compras/:id/sesiones/:sesionId/completar",
  [
    validarJWT,
    esAdminRole,
    param("id").isMongoId(),
    param("sesionId").isMongoId(),
    validarCampos,
  ],
  patchCompletarSesion
);

// PATCH /api/packs/compras/:id/sesiones/:sesionId/cancelar (admin/usuario)
router.patch(
  "/compras/:id/sesiones/:sesionId/cancelar",
  [
    validarJWT,
    param("id").isMongoId(),
    param("sesionId").isMongoId(),
    validarCampos,
  ],
  patchCancelarSesion
);

// DELETE /api/packs/compras/:id (admin – elimina compra y sus sesiones)
router.delete(
  "/compras/:id",
  [validarJWT, esAdminRole, param("id").isMongoId(), validarCampos],
  deletePackCompra
);

export default router;
