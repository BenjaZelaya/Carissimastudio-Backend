// controllers/pago.js
import * as MercadoPagoService from "../services/mercadopago.js";
import { handleError } from "../helpers/handleError.js";
import logger from "../helpers/logger.js";

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
    const dataId = req.query["data.id"] || req.body?.data?.id;
    const firmaValida = MercadoPagoService.verificarFirmaWebhook(
      dataId,
      req.header("x-signature"),
      req.header("x-request-id")
    );

    if (!firmaValida) {
      return res.sendStatus(200); // se descarta sin procesar, sin filtrar el motivo
    }

    await MercadoPagoService.procesarWebhook(req.body);
    res.sendStatus(200);
  } catch (error) {
    logger.error("Error webhook MP", { message: error.message });
    res.sendStatus(200); // siempre 200 para que MP no reintente
  }
};

export { postCrearPreferencia, postWebhook };