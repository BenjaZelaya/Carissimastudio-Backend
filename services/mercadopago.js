// services/mercadopago.js
import crypto from "crypto";
import { MercadoPagoConfig, Preference } from "mercadopago";
import Turno from "../models/Turno.js";
import { AppError } from "../helpers/AppError.js";
import logger from "../helpers/logger.js";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

// Verifica la firma HMAC-SHA256 que Mercado Pago envía en el header
// x-signature, según https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/your-integrations/notifications/webhooks#editor_2
// Si MP_WEBHOOK_SECRET no está configurado, se omite la verificación (modo
// compatible con instalaciones existentes) pero queda un warning en los logs.
const verificarFirmaWebhook = (dataId, xSignature, xRequestId) => {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn(
      "MP_WEBHOOK_SECRET no configurado: el webhook de Mercado Pago se procesa sin verificar firma"
    );
    return true;
  }

  if (!xSignature || !xRequestId || !dataId) return false;

  const partes = Object.fromEntries(
    xSignature.split(",").map((parte) => parte.trim().split("="))
  );
  const { ts, v1: firmaRecibida } = partes;
  if (!ts || !firmaRecibida) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const firmaCalculada = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const bufCalculada = Buffer.from(firmaCalculada);
  const bufRecibida = Buffer.from(firmaRecibida);
  if (bufCalculada.length !== bufRecibida.length) return false;

  return crypto.timingSafeEqual(bufCalculada, bufRecibida);
};

const crearPreferencia = async (turnoId, usuarioId) => {
  const turno = await Turno.findById(turnoId)
    .populate("productos", "nombreProducto precio img")
    .populate("usuario", "email");

  if (!turno) throw new AppError("Turno no encontrado", 404);
  if (turno.usuario._id.toString() !== usuarioId.toString()) {
    throw new AppError("No tenés permiso para pagar este turno", 403);
  }
  if (!["borrador", "pago_rechazado"].includes(turno.estado)) {
    throw new AppError("Este turno no puede ser pagado en su estado actual", 400);
  }

  const preference = new Preference(client);

  // Validar y sanitizar datos
  const unitPrice = parseFloat(turno.seña) || 0;
  if (unitPrice <= 0) {
    throw new AppError("Monto de pago inválido", 400);
  }

  const productosNombres = turno.productos
    .map(p => p.nombreProducto || "Servicio")
    .join(", ")
    .substring(0, 256); // Limitar a 256 caracteres

  const items = [{
    id: turno._id.toString(),
    title: `Carissima Studio - ${productosNombres}`,
    quantity: 1,
    unit_price: Math.round(unitPrice * 100) / 100,
    currency_id: "ARS",
  }];

  const bodyData = {
    items,
    external_reference: turnoId.toString(),
    back_urls: {
      success: `${process.env.FRONTEND_URL}/pago/resultado?estado=aprobado`,
      failure: `${process.env.FRONTEND_URL}/pago/resultado?estado=rechazado`,
      pending: `${process.env.FRONTEND_URL}/pago/resultado?estado=pendiente`,
    },
  };

  if (process.env.BACKEND_URL) {
    bodyData.notification_url = `${process.env.BACKEND_URL}/api/pagos/webhook`;
  }

  try {
    const resultado = await preference.create({ body: bodyData });
    logger.info("Preferencia creada", { id: resultado.id, initPoint: resultado.init_point });
    return {
      preferenceId: resultado.id,
      initPoint: resultado.init_point,
      sandboxInitPoint: resultado.sandbox_init_point,
    };
  } catch (error) {
    logger.error("Error creando preferencia", { message: error.message, data: error.response?.data });
    throw error;
  }
};

const procesarWebhook = async (data) => {
  logger.info("Webhook recibido", { type: data.type, paymentId: data.data?.id });

  if (data.type !== "payment") {
    logger.info("Webhook ignorado: no es de tipo payment");
    return;
  }

  const { MercadoPagoConfig: MPConfig, Payment } = await import("mercadopago");
  const paymentClient = new Payment(new MPConfig({ accessToken: process.env.MP_ACCESS_TOKEN }));

  const payment = await paymentClient.get({ id: data.data.id });
  logger.info("Payment obtenido", { id: payment.id, status: payment.status, external_reference: payment.external_reference });

  const externalRef = payment.external_reference;
  const estado = payment.status;

  // Pago de pack
  if (externalRef && externalRef.startsWith("pack:")) {
    const compraId = externalRef.replace("pack:", "");
    const PackCompra = (await import("../models/PackCompra.js")).default;
    if (estado === "approved") {
      await PackCompra.findByIdAndUpdate(compraId, { estado: "señado", comprobantePago: payment.id.toString() }, { new: true });
      logger.info("PackCompra señada", { compraId });
    } else if (estado === "rejected") {
      await PackCompra.findByIdAndUpdate(compraId, { estado: "cancelado" }, { new: true });
      logger.info("PackCompra cancelada", { compraId });
    }
    return;
  }

  // Pago de turno normal
  const turnoId = externalRef;
  if (estado === "approved") {
    await Turno.findByIdAndUpdate(turnoId, {
      estado: "confirmado",
      metodoPago: "mercadopago",
      comprobante: payment.id.toString(),
      fechaConfirmacion: new Date(),
    }, { new: true });
    logger.info("Turno actualizado a confirmado", { turnoId });
  } else if (estado === "rejected") {
    await Turno.findByIdAndUpdate(turnoId, {
      estado: "pago_rechazado",
    }, { new: true });
    logger.info("Turno rechazado", { turnoId });
  }
};

// ── PACK: crear preferencia de MP ───────────────────────────────────────────
const crearPreferenciaPack = async (compraId, usuarioId) => {
  const PackCompra = (await import("../models/PackCompra.js")).default;

  const compra = await PackCompra.findById(compraId)
    .populate("pack", "nombre")
    .populate("usuario", "email");

  if (!compra) throw new AppError("Compra no encontrada", 404);
  if (compra.usuario._id.toString() !== usuarioId.toString()) {
    throw new AppError("No tenés permiso para pagar esta compra", 403);
  }
  if (compra.estado !== "pendiente") {
    throw new AppError("Esta compra no puede ser pagada en su estado actual", 400);
  }

  const unitPrice = parseFloat(compra.montoAbonado) || 0;
  if (unitPrice <= 0) throw new AppError("Monto de pago inválido", 400);

  const preference = new Preference(client);

  const bodyData = {
    items: [{
      id: compra._id.toString(),
      title: `Carissima Studio - Pack ${compra.pack?.nombre || ""}`,
      quantity: 1,
      unit_price: Math.round(unitPrice * 100) / 100,
      currency_id: "ARS",
    }],
    external_reference: `pack:${compraId.toString()}`,
    back_urls: {
      success: `${process.env.FRONTEND_URL}/pago-pack/resultado?estado=aprobado&compraId=${compraId}`,
      failure: `${process.env.FRONTEND_URL}/pago-pack/resultado?estado=rechazado&compraId=${compraId}`,
      pending: `${process.env.FRONTEND_URL}/pago-pack/resultado?estado=pendiente&compraId=${compraId}`,
    },
  };

  if (process.env.BACKEND_URL) {
    bodyData.notification_url = `${process.env.BACKEND_URL}/api/pagos/webhook`;
  }

  const resultado = await preference.create({ body: bodyData });
  return {
    preferenceId: resultado.id,
    initPoint: resultado.init_point,
    sandboxInitPoint: resultado.sandbox_init_point,
  };
};

export { crearPreferencia, crearPreferenciaPack, procesarWebhook, verificarFirmaWebhook };