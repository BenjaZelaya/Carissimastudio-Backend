// models/Sesion.js
import mongoose from "mongoose";

const SesionSchema = new mongoose.Schema(
  {
    packCompra: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PackCompra",
      required: true,
    },
    numero: {
      type: Number,
      required: true,
      min: 1,
    },
    fecha: {
      type: String, // "YYYY-MM-DD" o null
      default: null,
    },
    horaInicio: {
      type: String, // "HH:MM" o null
      default: null,
    },
    estado: {
      type: String,
      enum: ["sin_fecha", "pendiente", "confirmada", "completada", "cancelada"],
      default: "sin_fecha",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Sesion", SesionSchema);
