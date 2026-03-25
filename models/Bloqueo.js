// models/Bloqueo.js
import mongoose from "mongoose";

const BloqueoSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ["dia", "horario"],
      required: [true, "El tipo de bloqueo es obligatorio"],
    },
    fecha: {
      type: Date,
      required: [true, "La fecha es obligatoria"],
    },
    horaInicio: {
      type: String,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM)"],
    },
    horaFin: {
      type: String,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM)"],
    },
    motivo: {
      type: String,
      trim: true,
      maxlength: [200, "El motivo no puede superar los 200 caracteres"],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Bloqueo", BloqueoSchema);