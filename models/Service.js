// models/Service.js
import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del servicio es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
    },
    descripcion: {
      type: String,
      trim: true,
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

export default mongoose.model("Service", serviceSchema);