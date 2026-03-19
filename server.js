// server.js
import "dotenv/config"; // carga .env automáticamente
import express from "express";
import cors from "cors";
import servicesRoutes from "./routes/services.routes.js";
import { dbConnection } from "./database/db.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

dbConnection();

// Rutas
app.use("/api/services", servicesRoutes);

// Ruta de prueba (opcional)
app.get("/", (req, res) => {
  res.json({ message: "Backend Carissima Studio funcionando" });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`→ Prueba: http://localhost:${PORT}/api/services`);
});

export default app;
