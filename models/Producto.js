// models/Producto.js
import mongoose from "mongoose";

const ProductoSchema = new mongoose.Schema(
  {
    nombreProducto: {
      type: String,
      required: [true, "El nombre del producto es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [50, "El nombre no puede superar los 50 caracteres"],
    },
    descripcion: {
      type: String,
      trim: true,
      minlength: [10, "La descripción debe tener al menos 10 caracteres"],
      maxlength: [500, "La descripción no puede superar los 500 caracteres"],
    },
    precio: {
      type: Number,
      required: [true, "El precio del producto es obligatorio"],
      min: [0, "El precio no puede ser negativo"],
    },
    img: {
      type: String,
      required: [true, "La imagen es obligatoria"],
      match: [
        /^https:\/\/res\.cloudinary\.com\/.+$/,
        "La URL de imagen no es válida",
      ],
    },
    estado: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Producto", ProductoSchema);