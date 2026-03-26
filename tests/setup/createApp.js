// tests/setup/createApp.js
// Fabrica de la app Express para los tests E2E con Supertest.
// No llama a listen() ni a dbConnection(); el test se encarga de la DB.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "../../routes/auth.js";
import usuarioRoutes from "../../routes/Usuario.js";
import categoriaRoutes from "../../routes/Categoria.js";
import productosRoutes from "../../routes/Producto.js";
import horarioRoutes from "../../routes/horario.js";
import turnoRoutes from "../../routes/turno.js";

export const createApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/usuarios", usuarioRoutes);
  app.use("/api/categorias", categoriaRoutes);
  app.use("/api/productos", productosRoutes);
  app.use("/api/horarios", horarioRoutes);
  app.use("/api/turnos", turnoRoutes);

  return app;
};
