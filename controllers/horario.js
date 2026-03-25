// controllers/horario.js
import * as HorarioService from "../services/horario.js";
import { handleError } from "../helpers/handleError.js";

const getConfig = async (req, res) => {
  try {
    const config = await HorarioService.obtenerConfig();
    res.json(config);
  } catch (error) {
    handleError(res, error);
  }
};

const putConfig = async (req, res) => {
  try {
    const config = await HorarioService.actualizarConfig(req.body);
    res.json(config);
  } catch (error) {
    handleError(res, error);
  }
};

const getDisponibilidad = async (req, res) => {
  try {
    const fecha = req.query.fecha
      ? new Date(req.query.fecha)
      : new Date();
    const disponibilidad = await HorarioService.obtenerDisponibilidadSemana(fecha);
    res.json(disponibilidad);
  } catch (error) {
    handleError(res, error);
  }
};

const getBloqueos = async (req, res) => {
  try {
    const bloqueos = await HorarioService.obtenerBloqueos();
    res.json(bloqueos);
  } catch (error) {
    handleError(res, error);
  }
};

const postBloqueo = async (req, res) => {
  try {
    const bloqueo = await HorarioService.crearBloqueo(req.body);
    res.status(201).json(bloqueo);
  } catch (error) {
    handleError(res, error);
  }
};

const deleteBloqueo = async (req, res) => {
  try {
    await HorarioService.eliminarBloqueo(req.params.id);
    res.json({ msg: "Bloqueo eliminado correctamente" });
  } catch (error) {
    handleError(res, error);
  }
};

export { getConfig, putConfig, getDisponibilidad, getBloqueos, postBloqueo, deleteBloqueo };