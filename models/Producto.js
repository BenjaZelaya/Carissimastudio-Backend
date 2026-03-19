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
      required: [true, "El precio es obligatorio"],
      min: [0, "El precio no puede ser negativo"],
    },
    sena: {
      type: Number,
      default: 0,
      min: [0, "La seña no puede ser negativa"],
    },
    duracion: {
      type: String,
      required: [true, "La duración es obligatoria"],
      trim: true,
    },
    imagen: {
      type: String,
      default: "https://via.placeholder.com/300?text=Servicio",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Producto", ProductoSchema);