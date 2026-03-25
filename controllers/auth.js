// controllers/auth.js
import * as AuthService from "../services/auth.js";
import { handleError } from "../helpers/handleError.js";

// ─── Handlers HTTP ───────────────────────────────────────────────────────────

const register = async (req, res) => {
  try {
    const usuario = await AuthService.registrar(req.body);
    res.status(201).json({ msg: "Usuario registrado correctamente", usuario });
  } catch (error) {
    handleError(res, error);
  }
};

const login = async (req, res) => {
  try {
    const { usuario, token } = await AuthService.login(req.body);
    res.json({ usuario, token });
  } catch (error) {
    handleError(res, error);
  }
};

const renovarToken = async (req, res) => {
  try {
    const { usuario, token } = await AuthService.renovarToken(req.usuario);
    res.json({ usuario, token });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export { register, login, renovarToken };