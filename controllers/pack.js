// controllers/pack.js
import * as PackService from "../services/pack.js";
import { handleError } from "../helpers/handleError.js";

// ── CATÁLOGO ──────────────────────────────────────────────────────────────────

export const getPacks = async (req, res) => {
  try {
    const soloActivos = req.usuario?.rol !== "ADMIN_ROLE";
    const packs = await PackService.listarPacks(soloActivos);
    res.json({ packs });
  } catch (error) {
    handleError(res, error);
  }
};

export const getPackById = async (req, res) => {
  try {
    const pack = await PackService.obtenerPackPorId(req.params.id);
    res.json(pack);
  } catch (error) {
    handleError(res, error);
  }
};

export const postPack = async (req, res) => {
  try {
    const pack = await PackService.crearPack(req.body);
    res.status(201).json(pack);
  } catch (error) {
    handleError(res, error);
  }
};

export const putPack = async (req, res) => {
  try {
    const pack = await PackService.actualizarPack(req.params.id, req.body);
    res.json(pack);
  } catch (error) {
    handleError(res, error);
  }
};

export const deletePack = async (req, res) => {
  try {
    await PackService.eliminarPack(req.params.id);
    res.json({ msg: "Pack eliminado" });
  } catch (error) {
    handleError(res, error);
  }
};

// ── COMPRAS ───────────────────────────────────────────────────────────────────

export const postPackCompra = async (req, res) => {
  try {
    const { packId, metodoPago } = req.body;
    const compra = await PackService.crearPackCompra(
      packId,
      req.usuario._id,
      metodoPago
    );
    res.status(201).json(compra);
  } catch (error) {
    handleError(res, error);
  }
};

export const getMisCompras = async (req, res) => {
  try {
    const compras = await PackService.obtenerComprasUsuario(req.usuario._id);
    res.json({ compras });
  } catch (error) {
    handleError(res, error);
  }
};

export const getComprasAdmin = async (req, res) => {
  try {
    const compras = await PackService.obtenerComprasAdmin();
    res.json({ compras });
  } catch (error) {
    handleError(res, error);
  }
};

export const patchSubirComprobante = async (req, res) => {
  try {
    const compra = await PackService.subirComprobanteCompra(
      req.params.id,
      req.body.comprobante,
      req.usuario._id
    );
    res.json(compra);
  } catch (error) {
    handleError(res, error);
  }
};

export const patchActivarCompra = async (req, res) => {
  try {
    const compra = await PackService.activarCompra(req.params.id);
    res.json(compra);
  } catch (error) {
    handleError(res, error);
  }
};

// ── SESIONES ──────────────────────────────────────────────────────────────────

export const patchAgendarSesion = async (req, res) => {
  try {
    const { fecha, horaInicio } = req.body;
    const sesion = await PackService.agendarSesion(
      req.params.id,
      req.params.sesionId,
      fecha,
      horaInicio,
      req.usuario._id
    );
    res.json(sesion);
  } catch (error) {
    handleError(res, error);
  }
};

export const patchConfirmarSesion = async (req, res) => {
  try {
    const sesion = await PackService.confirmarSesion(
      req.params.id,
      req.params.sesionId
    );
    res.json(sesion);
  } catch (error) {
    handleError(res, error);
  }
};

export const patchCompletarSesion = async (req, res) => {
  try {
    const resultado = await PackService.completarSesion(
      req.params.id,
      req.params.sesionId
    );
    res.json(resultado);
  } catch (error) {
    handleError(res, error);
  }
};

export const patchCancelarSesion = async (req, res) => {
  try {
    const sesion = await PackService.cancelarSesion(
      req.params.id,
      req.params.sesionId
    );
    res.json(sesion);
  } catch (error) {
    handleError(res, error);
  }
};
