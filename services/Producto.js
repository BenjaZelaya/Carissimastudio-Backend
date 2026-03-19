// services/Producto.js
import Producto from "../models/Producto.js";
import { AppError } from "../helpers/AppError.js";

// ─── Helpers internos ────────────────────────────────────────────────────────

const buscarProductoActivo = async (id) => {
  const producto = await Producto.findById(id);
  if (!producto || !producto.estado) {
    throw new AppError("Producto no encontrado", 404);
  }
  return producto;
};

// ─── Lógica de negocio ───────────────────────────────────────────────────────

const obtenerProductos = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [productos, total] = await Promise.all([
    Producto.find({ estado: true }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Producto.countDocuments({ estado: true }),
  ]);
  return { total, page: Number(page), limit: Number(limit), productos };
};

const obtenerProductoPorId = async (id) => {
  return await buscarProductoActivo(id);
};

const crearProducto = async ({ nombreProducto, descripcion, precio, img }) => {
  const existente = await Producto.findOne({
    nombreProducto: { $regex: new RegExp(`^${nombreProducto}$`, "i") },
    estado: true,
  });
  if (existente) {
    throw new AppError(`Ya existe un producto con el nombre "${nombreProducto}"`, 409);
  }

  const producto = new Producto({ nombreProducto, descripcion, precio, img });
  return await producto.save();
};

const actualizarProducto = async (id, datos) => {
  await buscarProductoActivo(id);

  // El campo `estado` nunca se modifica por esta vía
  const { estado, ...camposPermitidos } = datos;

  // Evita colisión de nombre con otro producto distinto
  if (camposPermitidos.nombreProducto) {
    const duplicado = await Producto.findOne({
      _id: { $ne: id },
      nombreProducto: { $regex: new RegExp(`^${camposPermitidos.nombreProducto}$`, "i") },
      estado: true,
    });
    if (duplicado) {
      throw new AppError(
        `Ya existe un producto con el nombre "${camposPermitidos.nombreProducto}"`,
        409
      );
    }
  }

  return await Producto.findByIdAndUpdate(id, camposPermitidos, {
    new: true,
    runValidators: true,
  });
};

const eliminarProducto = async (id) => {
  await buscarProductoActivo(id);
  return await Producto.findByIdAndUpdate(id, { estado: false }, { new: true });
};

const restaurarProducto = async (id) => {
  const producto = await Producto.findById(id);
  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }
  if (producto.estado) {
    throw new AppError("El producto ya se encuentra activo", 400);
  }
  return await Producto.findByIdAndUpdate(id, { estado: true }, { new: true });
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export { obtenerProductos, obtenerProductoPorId, crearProducto, actualizarProducto, eliminarProducto, restaurarProducto };
