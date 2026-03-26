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

const ENV_REQUERIDAS = ["MONGO_URI", "JWT_SECRET", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];

const envFaltantes = ENV_REQUERIDAS.filter((key) => !process.env[key]);
if (envFaltantes.length > 0) {
  logger.error(`Variables de entorno faltantes: ${envFaltantes.join(", ")}`);
  process.exit(1);
}

// ─── App ─────────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middlewares de seguridad ─────────────────────────────────────────────────

/**
 * Helmet agrega headers HTTP de seguridad para proteger contra ataques
 * comunes como clickjacking, sniffing de contenido y XSS.
 */
app.use(helmet());

/**
 * CORS restringido al origen del frontend definido en la variable de entorno
 * FRONTEND_URL. En desarrollo puede dejarse sin definir para permitir cualquier origen.
 */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "x-token"],
  })
);

/**
 * Rate limiting sobre los endpoints de autenticacion para prevenir
 * ataques de fuerza bruta. Limite: 20 intentos cada 15 minutos por IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { msg: "Demasiados intentos. Intenta nuevamente en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());

// ─── Servidor ────────────────────────────────────────────────────────────────

(async () => {
  try {
    await dbConnection();

    // ─── Rutas ───────────────────────────────────────────────────────────────

    app.use("/api/auth", authLimiter, authRoutes);
    app.use("/api/usuarios", usuarioRoutes);
    app.use("/api/categorias", categoriaRoutes);
    app.use("/api/productos", productosRoutes);
    app.use("/api/horarios", horarioRoutes);
    app.use("/api/turnos", turnoRoutes);

    app.get("/", (_req, res) => {
      res.json({ message: "Backend Carissima Studio funcionando" });
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
