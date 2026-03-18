// server.js
import "dotenv/config"; // carga .env automáticamente
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import servicesRoutes from "./routes/services.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB conectado correctamente ✅");
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error.message);
    process.exit(1); // termina si falla la conexión
  }
};

connectDB();

// Rutas
app.use("/api/services", servicesRoutes);

// Ruta de prueba (opcional)
app.get("/", (req, res) => {
  res.json({ message: "Backend Carissima Studio funcionando 🚀" });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`→ Prueba: http://localhost:${PORT}/api/services`);
});

export default app;