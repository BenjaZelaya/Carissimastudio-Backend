// controllers/pago.js
import * as MercadoPagoService from "../services/mercadopago.js";
import { handleError } from "../helpers/handleError.js";

const postCrearPreferencia = async (req, res) => {
  try {
    const resultado = await MercadoPagoService.crearPreferencia(
      req.params.turnoId,
      req.usuario._id
    );
    res.json(resultado);
  } catch (error) {
    handleError(res, error);
  }
};

const postWebhook = async (req, res) => {
  try {
    await MercadoPagoService.procesarWebhook(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error webhook MP:", error);
    res.sendStatus(200); // siempre 200 para que MP no reintente
  }
};

export { postCrearPreferencia, postWebhook };