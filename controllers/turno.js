// controllers/turno.js
import * as TurnoService from "../services/turno.js";
import Turno from "../models/Turno.js";
import { handleError } from "../helpers/handleError.js";
import logger from "../helpers/logger.js";

// ==================== CONTROLADORES EXISTENTES ====================

const postTurno = async (req, res) => {
  try {
    const turno = await TurnoService.crearTurno(req.body, req.usuario._id);
    res.status(201).json(turno);
  } catch (error) {
    handleError(res, error);
  }
};

const getTurnosUsuario = async (req, res) => {
  try {
    const turnos = await TurnoService.obtenerTurnosUsuario(req.usuario._id);
    res.json(turnos);
  } catch (error) {
    handleError(res, error);
  }
};

const getTurnosAdmin = async (req, res) => {
  try {
    const { pagina, limite } = req.query;
    const resultado = await TurnoService.obtenerTurnosAdmin({ pagina, limite });
    res.json(resultado);
  } catch (error) {
    handleError(res, error);
  }
};

const getTurnoById = async (req, res) => {
  try {
    const turno = await TurnoService.obtenerTurnoPorId(req.params.id);
    res.json(turno);
  } catch (error) {
    handleError(res, error);
  }
};

const patchSubirComprobante = async (req, res) => {
  try {
    const turno = await TurnoService.subirComprobante(
      req.params.id,
      req.body.comprobante,
      req.usuario._id,
    );
    res.json(turno);
  } catch (error) {
    handleError(res, error);
  }
};

const patchConfirmarTurno = async (req, res) => {
  try {
    const turno = await TurnoService.confirmarTurno(req.params.id);
    res.json(turno);
  } catch (error) {
    handleError(res, error);
  }
};

const patchCancelarTurno = async (req, res) => {
  try {
    const turno = await TurnoService.cancelarTurno(
      req.params.id,
      req.usuario._id,
      req.usuario.rol === "ADMIN_ROLE",
    );
    res.json(turno);
  } catch (error) {
    handleError(res, error);
  }
};

const patchCambiarHorario = async (req, res) => {
  try {
    const turno = await TurnoService.cambiarHorario(
      req.params.id,
      req.body,
      req.usuario._id,
    );
    res.json(turno);
  } catch (error) {
    handleError(res, error);
  }
};

const patchRechazarPago = async (req, res) => {
  try {
    const turno = await TurnoService.rechazarPago(
      req.params.id,
      req.body.motivo,
    );
    res.json(turno);
  } catch (error) {
    handleError(res, error);
  }
};

const patchCompletarTurno = async (req, res) => {
  try {
    const turno = await TurnoService.completarTurno(req.params.id);
    res.json(turno);
  } catch (error) {
    handleError(res, error);
  }
};

const deleteTurno = async (req, res) => {
  try {
    await TurnoService.eliminarTurno(req.params.id);
    res.json({ msg: "Turno eliminado correctamente" });
  } catch (error) {
    handleError(res, error);
  }
};

// ==================== MIS TURNOS ====================

const getMisTurnos = async (req, res) => {
  try {
    const usuarioId = req.usuario._id;

    const turnos = await Turno.find({ usuario: usuarioId })
      .sort({ fecha: 1, horaInicio: 1 })
      .populate({
        path: "productos",
        select: "nombre precio imagen",
      });

    res.status(200).json({
      success: true,
      count: turnos.length,
      data: turnos,
    });
  } catch (error) {
    logger.error(`Error en getMisTurnos: ${error.message}`);
    handleError(res, error);
  }
};

const getInfoCambiosDisponibles = async (req, res) => {
  try {
    const infoCambios = await TurnoService.obtenerInfoCambiosDisponibles(
      req.params.id,
      req.usuario._id,
    );
    res.json(infoCambios);
  } catch (error) {
    handleError(res, error);
  }
};

// ==================== EXPORTACIONES FINALES ====================
export {
  postTurno,
  getTurnosUsuario,
  getTurnosAdmin,
  getTurnoById,
  patchSubirComprobante,
  patchConfirmarTurno,
  patchCancelarTurno,
  patchCambiarHorario,
  patchRechazarPago,
  patchCompletarTurno,
  deleteTurno,
  getMisTurnos,
  getInfoCambiosDisponibles,
};