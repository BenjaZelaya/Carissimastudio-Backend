// server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { dbConnection } from "./database/db.js";
import logger from "./helpers/logger.js";

import authRoutes from "./routes/auth.js";
import usuarioRoutes from "./routes/Usuario.js";
import categoriaRoutes from "./routes/Categoria.js";
import productosRoutes from "./routes/Producto.js";
import horarioRoutes from "./routes/horario.js";
import turnoRoutes from "./routes/turno.js";

// ─── Validacion de variables de entorno ──────────────────────────────────────

const ENV_REQUERIDAS = [
  "MONGO_URI",
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET"
];

const envFaltantes = ENV_REQUERIDAS.filter((key) => !process.env[key]);
if (envFaltantes.length > 0) {
  logger.error(`Variables de entorno faltantes: ${envFaltantes.join(", ")}`);
  process.exit(1);
}

// ─── App ─────────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS Mejorado ───────────────────────────────────────────────────────────

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-token"],
    exposedHeaders: ["Authorization"]
  })
);

// Manejo explícito de preflight OPTIONS (CORREGIDO para Express 5)
app.options("/*splat", cors());

// ─── Middlewares de seguridad ────────────────────────────────────────────────

app.use(helmet());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { msg: "Demasiadas solicitudes. Intenta nuevamente en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { msg: "Demasiados intentos. Intenta nuevamente en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
app.use(express.json());

// ─── Rutas ───────────────────────────────────────────────────────────────────

(async () => {
  try {
    await dbConnection();

    app.use("/api/auth", authLimiter, authRoutes);
    app.use("/api/usuarios", usuarioRoutes);
    app.use("/api/categorias", categoriaRoutes);
    app.use("/api/productos", productosRoutes);
    app.use("/api/horarios", horarioRoutes);
    app.use("/api/turnos", turnoRoutes);

    app.get("/", (_req, res) => {
      res.json({ message: "Backend Carissima Studio funcionando" });
    });

    // Ruta 404 - Catch all (también corregido)
    app.use("/*splat", (req, res) => {
      res.status(404).json({ 
        msg: `Ruta no encontrada: ${req.originalUrl}` 
      });
    });

    app.listen(PORT, () => {
      logger.info(`Servidor corriendo en puerto ${PORT}`);
      logger.info(`Auth:       http://localhost:${PORT}/api/auth`);
      logger.info(`Usuarios:   http://localhost:${PORT}/api/usuarios`);
      logger.info(`Categorias: http://localhost:${PORT}/api/categorias`);
      logger.info(`Productos:  http://localhost:${PORT}/api/productos`);
      logger.info(`Horarios:   http://localhost:${PORT}/api/horarios`);
      logger.info(`Turnos:     http://localhost:${PORT}/api/turnos`);
    });
  } catch (error) {
    logger.error({ message: "Error al iniciar el servidor", stack: error.stack });
    process.exit(1);
  }
})();

export default app;