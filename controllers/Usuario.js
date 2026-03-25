// controllers/Usuario.js
import * as UsuarioService from "../services/Usuario.js";
import { handleError } from "../helpers/handleError.js";

// ─── Handlers HTTP ───────────────────────────────────────────────────────────

const getUsuarios = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const resultado = await UsuarioService.obtenerUsuarios({ page, limit });
    res.json(resultado);
  } catch (error) {
    handleError(res, error);
  }
};

const getUsuarioById = async (req, res) => {
  try {
    const usuario = await UsuarioService.obtenerUsuarioPorId(req.params.id);
    res.json(usuario);
  } catch (error) {
    handleError(res, error);
  }
};

const getPerfilPropio = async (req, res) => {
  try {
    const usuario = await UsuarioService.obtenerUsuarioPorId(req.usuario._id);
    res.json(usuario);
  } catch (error) {
    handleError(res, error);
  }
};

const putUsuario = async (req, res) => {
  try {
    const usuario = await UsuarioService.actualizarUsuario(req.params.id, req.body, req.usuario);
    res.json(usuario);
  } catch (error) {
    handleError(res, error);
  }
};

const putPerfilPropio = async (req, res) => {
  try {
    const usuario = await UsuarioService.actualizarPerfilPropio(req.usuario._id, req.body);
    res.json(usuario);
  } catch (error) {
    handleError(res, error);
  }
};

const deleteUsuario = async (req, res) => {
  try {
    await UsuarioService.eliminarUsuario(req.params.id);
    res.json({ msg: "Usuario desactivado correctamente" });
  } catch (error) {
    handleError(res, error);
  }
};

const patchRestaurarUsuario = async (req, res) => {
  try {
    const usuario = await UsuarioService.restaurarUsuario(req.params.id);
    res.json({ msg: "Usuario restaurado", usuario });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  getUsuarios,
  getUsuarioById,
  getPerfilPropio,
  putUsuario,
  putPerfilPropio,
  deleteUsuario,
  patchRestaurarUsuario,
};