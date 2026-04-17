// services/mercadopago.js
import { MercadoPagoConfig, Preference } from "mercadopago";
import Turno from "../models/Turno.js";
import { AppError } from "../helpers/AppError.js";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const crearPreferencia = async (turnoId, usuarioId) => {
  const turno = await Turno.findById(turnoId)
    .populate("productos", "nombreProducto precio img");

  if (!turno) throw new AppError("Turno no encontrado", 404);
  if (turno.usuario.toString() !== usuarioId.toString()) {
    throw new AppError("No tenés permiso para pagar este turno", 403);
  }
  if (!["pendiente", "pago_rechazado"].includes(turno.estado)) {
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
    payer: {
      email: turno.usuario?.email || "",
    },
    back_urls: {
      success: `${process.env.FRONTEND_URL}/pago/resultado?estado=aprobado`,
      failure: `${process.env.FRONTEND_URL}/pago/resultado?estado=rechazado`,
      pending: `${process.env.FRONTEND_URL}/pago/resultado?estado=pendiente`,
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

const procesarWebhook = async (data) => {
  if (data.type !== "payment") return;

  const { MercadoPagoConfig: MPConfig, Payment } = await import("mercadopago");
  const paymentClient = new Payment(new MPConfig({ accessToken: process.env.MP_ACCESS_TOKEN }));

  const payment = await paymentClient.get({ id: data.data.id });

  const turnoId = payment.external_reference;
  const estado = payment.status;

  if (estado === "approved") {
    await Turno.findByIdAndUpdate(turnoId, {
      estado: "confirmado",
      metodoPago: "mercadopago",
      comprobante: payment.id.toString(),
    });
  } else if (estado === "rejected") {
    await Turno.findByIdAndUpdate(turnoId, {
      estado: "pago_rechazado",
    });
  }
};

export { crearPreferencia, procesarWebhook };