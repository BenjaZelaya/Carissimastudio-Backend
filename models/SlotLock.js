// models/SlotLock.js
import mongoose from "mongoose";

// Documento auxiliar usado únicamente para forzar un conflicto real de
// escritura entre transacciones concurrentes que compiten por el mismo slot
// de turno (fecha + horaInicio). Ver services/turno.js.
const SlotLockSchema = new mongoose.Schema({
  slotKey: { type: String, required: true, unique: true },
  version: { type: Number, default: 0 },
});

export default mongoose.model("SlotLock", SlotLockSchema);
