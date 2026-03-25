// services/Categoria.js
import Categoria from "../models/Categoria.js";
import { AppError } from "../helpers/AppError.js";
import { busquedaExacta } from "../helpers/regex.js";

// ─── Helpers internos ────────────────────────────────────────────────────────

const buscarCategoriaActiva = async (id) => {
  const categoria = await Categoria.findById(id);
  if (!categoria || !categoria.estado) {
    throw new AppError("Categoría no encontrada", 404);
  }
  return categoria;
};

// ─── Lógica de negocio ───────────────────────────────────────────────────────
const agregarProducto = async (categoriaId, productoId) => {
  const categoria = await buscarCategoriaActiva(categoriaId);

  if (categoria.productos.includes(productoId)) {
    throw new AppError("El producto ya está en esta categoría", 409);
  }

  return await Categoria.findByIdAndUpdate(
    categoriaId,
    { $push: { productos: productoId } },
    { new: true }
  ).populate("productos", "nombreProducto precio img");
};

const quitarProducto = async (categoriaId, productoId) => {
  await buscarCategoriaActiva(categoriaId);

  return await Categoria.findByIdAndUpdate(
    categoriaId,
    { $pull: { productos: productoId } },
    { new: true }
  ).populate("productos", "nombreProducto precio img");
};

const obtenerCategorias = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [categorias, total] = await Promise.all([
    Categoria.find({ estado: true }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Categoria.countDocuments({ estado: true }),
  ]);
  return { total, page: Number(page), limit: Number(limit), categorias };
};

const obtenerCategoriasAdmin = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [categorias, total] = await Promise.all([
    Categoria.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Categoria.countDocuments(),
  ]);
  return { total, page: Number(page), limit: Number(limit), categorias };
};

const obtenerCategoriaPorId = async (id) => {
  return await buscarCategoriaActiva(id);
};

const crearCategoria = async (datos) => {
  const { nombreCategoria, descripcion } = datos;

  const existente = await Categoria.findOne({
    nombreCategoria: busquedaExacta(nombreCategoria),
    estado: true,
  });
  if (existente) {
    throw new AppError(`Ya existe una categoría con el nombre "${nombreCategoria}"`, 409);
  }

  const categoria = new Categoria({ nombreCategoria, descripcion });
  return await categoria.save();
};

const actualizarCategoria = async (id, datos) => {
  await buscarCategoriaActiva(id);

  // El campo `estado` nunca se modifica por esta vía
  const { estado, ...camposPermitidos } = datos;

  // Evita colisión de nombre con otra categoría distinta
  if (camposPermitidos.nombreCategoria) {
    const duplicado = await Categoria.findOne({
      _id: { $ne: id },
      nombreCategoria: busquedaExacta(camposPermitidos.nombreCategoria),
      estado: true,
    });
    if (duplicado) {
      throw new AppError(
        `Ya existe una categoría con el nombre "${camposPermitidos.nombreCategoria}"`,
        409
      );
    }
  }

  return await Categoria.findByIdAndUpdate(id, camposPermitidos, {
    new: true,
    runValidators: true,
  });
};

const actualizarOrden = async (items) => {
  const operaciones = items.map(({ id, orden }) => ({
    updateOne: { filter: { _id: id }, update: { $set: { orden } } },
  }));
  await Categoria.bulkWrite(operaciones);
};

const eliminarCategoria = async (id) => {
  await buscarCategoriaActiva(id);
  return await Categoria.findByIdAndUpdate(id, { estado: false }, { new: true });
};

const restaurarCategoria = async (id) => {
  const categoria = await Categoria.findById(id);
  if (!categoria) {
    throw new AppError("Categoría no encontrada", 404);
  }
  if (categoria.estado) {
    throw new AppError("La categoría ya se encuentra activa", 400);
  }
  return await Categoria.findByIdAndUpdate(id, { estado: true }, { new: true });
};

const eliminarDefinitivo = async (id) => {
  const categoria = await Categoria.findById(id);
  if (!categoria) throw new AppError("Categoría no encontrada", 404);
  await Categoria.findByIdAndDelete(id);
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  obtenerCategorias,
  obtenerCategoriasAdmin,
  obtenerCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  restaurarCategoria,
  agregarProducto,
  quitarProducto,
  actualizarOrden,
  eliminarDefinitivo,
};