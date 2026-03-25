// controllers/turno.js
import * as TurnoService from "../services/turno.js";
import { handleError } from "../helpers/handleError.js";

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
    const turnos = await TurnoService.obtenerTurnosAdmin();
    res.json(turnos);
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
      req.usuario._id
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
      req.usuario.rol === "ADMIN_ROLE"
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
      req.usuario._id
    );
    res.json(turno);
  } catch (error) {
    handleError(res, error);
  }
};

// controllers/turno.js
const deleteTurno = async (req, res) => {
  try {
    await TurnoService.eliminarTurno(req.params.id);
    res.json({ msg: "Turno eliminado correctamente" });
  } catch (error) {
    handleError(res, error);
  }
};

export {
  postTurno,
  getTurnosUsuario,
  getTurnosAdmin,
  getTurnoById,
  patchSubirComprobante,
  patchConfirmarTurno,
  patchCancelarTurno,
  patchCambiarHorario,
  deleteTurno,
};