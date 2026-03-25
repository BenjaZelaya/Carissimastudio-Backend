// models/Turno.js
import mongoose from "mongoose";

const TurnoSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "El usuario es obligatorio"],
    },
    productos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Producto",
        required: true,
      },
    ],
    fecha: {
      type: Date,
      required: [true, "La fecha es obligatoria"],
    },
    horaInicio: {
      type: String,
      required: [true, "La hora es obligatoria"],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM)"],
    },
    total: {
      type: Number,
      required: [true, "El total es obligatorio"],
      min: [0, "El total no puede ser negativo"],
    },
    seña: {
      type: Number,
      required: [true, "La seña es obligatoria"],
      min: [0, "La seña no puede ser negativa"],
    },
    metodoPago: {
      type: String,
      enum: ["transferencia", "mercadopago"],
      required: [true, "El método de pago es obligatorio"],
    },
    estado: {
      type: String,
      enum: ["pendiente", "señado", "confirmado", "cancelado", "completado"],
      default: "pendiente",
    },
    comprobante: {
      type: String, // URL del comprobante subido a Cloudinary
      default: null,
    },
    cambiosHorario: {
      type: Number,
      default: 0,
      max: [2, "No se pueden hacer más de 2 cambios de horario"],
    },
    ultimoCambioHorario: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Turno", TurnoSchema);