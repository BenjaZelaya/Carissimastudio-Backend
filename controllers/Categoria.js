// controllers/Categoria.js
import * as CategoriaService from "../services/Categoria.js";
import { handleError } from "../helpers/handleError.js";

// ─── Handlers HTTP ───────────────────────────────────────────────────────────
const agregarProducto = async (req, res) => {
  try {
    const categoria = await CategoriaService.agregarProducto(req.params.id, req.body.productoId);
    res.json(categoria);
  } catch (error) {
    handleError(res, error);
  }
};

const quitarProducto = async (req, res) => {
  try {
    const categoria = await CategoriaService.quitarProducto(req.params.id, req.body.productoId);
    res.json(categoria);
  } catch (error) {
    handleError(res, error);
  }
};


const getCategorias = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const resultado = await CategoriaService.obtenerCategorias({ page, limit });
    res.json(resultado);
  } catch (error) {
    handleError(res, error);
  }
};

const getCategoriasAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const resultado = await CategoriaService.obtenerCategoriasAdmin({ page, limit });
    res.json(resultado);
  } catch (error) {
    handleError(res, error);
  }
};

const getCategoriaById = async (req, res) => {
  try {
    const categoria = await CategoriaService.obtenerCategoriaPorId(req.params.id);
    res.json(categoria);
  } catch (error) {
    handleError(res, error);
  }
};

const postCategoria = async (req, res) => {
  try {
    const categoria = await CategoriaService.crearCategoria(req.body);
    res.status(201).json(categoria);
  } catch (error) {
    handleError(res, error);
  }
};

const putCategoria = async (req, res) => {
  try {
    const categoria = await CategoriaService.actualizarCategoria(req.params.id, req.body);
    res.json(categoria);
  } catch (error) {
    handleError(res, error);
  }
};

const deleteCategoria = async (req, res) => {
  try {
    await CategoriaService.eliminarCategoria(req.params.id);
    res.json({ msg: "Categoría desactivada correctamente" });
  } catch (error) {
    handleError(res, error);
  }
};

const patchOrden = async (req, res) => {
  try {
    await CategoriaService.actualizarOrden(req.body.items);
    res.json({ msg: "Orden actualizado" });
  } catch (error) {
    handleError(res, error);
  }
};

const patchRestaurarCategoria = async (req, res) => {
  try {
    const categoria = await CategoriaService.restaurarCategoria(req.params.id);
    res.json({ msg: "Categoría restaurada", categoria });
  } catch (error) {
    handleError(res, error);
  }
};

const deleteCategoriaDefinitiva = async (req, res) => {
  try {
    await CategoriaService.eliminarDefinitivo(req.params.id);
    res.json({ msg: "Categoría eliminada definitivamente" });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
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
  deleteCategoriaDefinitiva,
};