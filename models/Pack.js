// models/Pack.js
import mongoose from "mongoose";

const ServicioIncluidoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    cantidad: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const PackSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del pack es obligatorio"],
      trim: true,
    },
    descripcion: {
      type: String,
      trim: true,
      default: "",
    },
    serviciosIncluidos: {
      type: [ServicioIncluidoSchema],
      default: [],
    },
    totalSesiones: {
      type: Number,
      required: [true, "La cantidad de sesiones es obligatoria"],
      min: [1, "Debe tener al menos 1 sesión"],
    },
    precio: {
      type: Number,
      required: [true, "El precio es obligatorio"],
      min: [0, "El precio no puede ser negativo"],
    },
    porcentajeSeña: {
      type: Number,
      default: 50,
      min: 1,
      max: 100,
    },
    imagen: {
      type: String,
      default: null,
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Pack", PackSchema);
