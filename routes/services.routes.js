// routes/services.routes.js
import express from "express";
import Service from "../models/Service.js";

const router = express.Router();

// GET /api/services - Obtener todos los servicios
router.get("/", async (req, res) => {
  try {
    const services = await Service.find().sort({ nombre: 1 });
    
    // Transformamos _id → id (opcional pero recomendado para frontend)
    const formatted = services.map((service) => ({
      id: service._id.toString(),
      nombre: service.nombre,
      descripcion: service.descripcion,
      precio: service.precio,
      sena: service.sena,
      duracion: service.duracion,
      imagen: service.imagen,
      createdAt: service.createdAt,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error al obtener servicios:", error);
    res.status(500).json({ message: "Error del servidor", error: error.message });
  }
});

// POST /api/services - Crear nuevo servicio
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion, precio, sena, duracion, imagen } = req.body;

    if (!nombre || !precio || !duracion) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    const newService = new Service({
      nombre,
      descripcion: descripcion || "",
      precio: Number(precio),
      sena: Number(sena) || 0,
      duracion,
      imagen: imagen || "https://via.placeholder.com/300?text=Servicio",
    });

    const saved = await newService.save();

    res.status(201).json({
      id: saved._id.toString(),
      nombre: saved.nombre,
      descripcion: saved.descripcion,
      precio: saved.precio,
      sena: saved.sena,
      duracion: saved.duracion,
      imagen: saved.imagen,
    });
  } catch (error) {
    console.error("Error al crear servicio:", error);
    res.status(500).json({ message: "Error al crear servicio", error: error.message });
  }
});

export default router;