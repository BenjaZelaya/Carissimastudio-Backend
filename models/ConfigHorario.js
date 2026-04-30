// models/ConfigHorario.js
import mongoose from "mongoose";

const ConfigHorarioSchema = new mongoose.Schema(
  {
    diasLaborales: {
      type: [Number], // 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes
      default: [1, 2, 3, 4, 5],
    },
    horaInicio: {
      type: String,
      required: [true, "La hora de inicio es obligatoria"],
      default: "09:00",
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM)"],
    },
    horaFin: {
      type: String,
      required: [true, "La hora de fin es obligatoria"],
      default: "18:00",
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM)"],
    },
    duracionTurno: {
      type: Number,
      required: [true, "La duración del turno es obligatoria"],
      default: 60, // minutos
      min: [15, "La duración mínima es 15 minutos"],
    },
    capacidadPorTurno: {
      type: Number,
      default: 1,
      min: [1, "La capacidad mínima es 1 persona"],
      max: [20, "La capacidad máxima es 20 personas"],
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ConfigHorario", ConfigHorarioSchema);