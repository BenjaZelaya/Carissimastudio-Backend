// server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { dbConnection } from "./database/db.js";
import authRoutes from "./routes/auth.js";
import usuarioRoutes from "./routes/Usuario.js";
import categoriaRoutes from "./routes/Categoria.js";
import productosRoutes from "./routes/Producto.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middlewares ─────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─── Base de datos ───────────────────────────────────────────────────────────

dbConnection();

// ─── Rutas ───────────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/productos", productosRoutes);

// ─── Ruta de prueba ──────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({ message: "Backend Carissima Studio funcionando" });
});

// ─── Servidor ────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`→ Auth:       http://localhost:${PORT}/api/auth`);
  console.log(`→ Usuarios:   http://localhost:${PORT}/api/usuarios`);
  console.log(`→ Categorias: http://localhost:${PORT}/api/categorias`);
  console.log(`→ Productos:  http://localhost:${PORT}/api/productos`);
});

export default app;
