// controllers/Producto.js
import * as ProductoService from "../services/Producto.js";
import { handleError } from "../helpers/handleError.js";

// ─── Handlers HTTP ───────────────────────────────────────────────────────────

const getProductos = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const resultado = await ProductoService.obtenerProductos({ page, limit });
    res.json(resultado);
  } catch (error) {
    handleError(res, error);
  }
};

const getProductosAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const resultado = await ProductoService.obtenerProductosAdmin({ page, limit });
    res.json(resultado);
  } catch (error) {
    handleError(res, error);
  }
};

const getProductoById = async (req, res) => {
  try {
    const producto = await ProductoService.obtenerProductoPorId(req.params.id);
    res.json(producto);
  } catch (error) {
    handleError(res, error);
  }
};

const postProducto = async (req, res) => {
  try {
    const producto = await ProductoService.crearProducto(req.body);
    res.status(201).json(producto);
  } catch (error) {
    handleError(res, error);
  }
};

const putProducto = async (req, res) => {
  try {
    const producto = await ProductoService.actualizarProducto(req.params.id, req.body);
    res.json(producto);
  } catch (error) {
    handleError(res, error);
  }
};

const deleteProducto = async (req, res) => {
  try {
    await ProductoService.eliminarProducto(req.params.id);
    res.json({ msg: "Producto desactivado correctamente" });
  } catch (error) {
    handleError(res, error);
  }
};

const patchRestaurarProducto = async (req, res) => {
  try {
    const producto = await ProductoService.restaurarProducto(req.params.id);
    res.json({ msg: "Producto restaurado", producto });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  getProductos,
  getProductosAdmin,
  getProductoById,
  postProducto,
  putProducto,
  deleteProducto,
  patchRestaurarProducto,
};
