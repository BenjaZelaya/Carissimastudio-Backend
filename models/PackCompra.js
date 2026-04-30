// models/PackCompra.js
import mongoose from "mongoose";

const PackCompraSchema = new mongoose.Schema(
  {
    pack: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pack",
      required: [true, "El pack es obligatorio"],
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "El usuario es obligatorio"],
    },
    montoTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    montoAbonado: {
      type: Number,
      required: true,
      min: 0,
    },
    metodoPago: {
      type: String,
      enum: ["transferencia", "mercadopago"],
      required: [true, "El método de pago es obligatorio"],
    },
    estado: {
      type: String,
      enum: ["pendiente", "señado", "activo", "completado", "cancelado"],
      default: "pendiente",
    },
    comprobantePago: {
      type: String, // URL de Cloudinary
      default: null,
    },
    sesiones: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sesion",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("PackCompra", PackCompraSchema);
