import { Resend } from "resend";
import logger from "../helpers/logger.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "Carissima Studio <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// Helper interno — sin dominio verificado, Resend solo permite enviar al dueño de la cuenta.
// Todos los emails van al admin; el destinatario original se indica en el asunto.
const send = async ({ to, subject, html }) => {
  const destino = ADMIN_EMAIL;
  const asunto = to !== ADMIN_EMAIL ? `[Para: ${to}] ${subject}` : subject;
  const { data, error } = await resend.emails.send({ from: FROM, to: destino, subject: asunto, html });
  if (error) throw new Error(error.message);
  logger.info(`✅ Email enviado (→${destino}): ${data.id}`);
};

// Templates
const header = (titulo, subtitulo, color1, color2) =>
  `<!DOCTYPE html><html><head><meta charset='UTF-8'></head>
  <body style='font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5;'>
  <table width='100%' style='background:#f5f5f5;'><tr><td align='center' style='padding:20px;'>
  <table width='600' style='background:white;border-radius:10px;border:1px solid #ddd;'>
  <tr style='background:linear-gradient(135deg,${color1} 0%,${color2} 100%);'>
  <td style='padding:30px;text-align:center;color:white;'>
  <h1 style='margin:0;font-size:28px;font-weight:bold;'>${titulo}</h1>
  <p style='margin:5px 0 0 0;font-size:14px;'>${subtitulo}</p>
  </td></tr><tr><td style='padding:30px;'>`;

const footer = () =>
  `</td></tr><tr style='background:#f5f5f5;border-top:1px solid #ddd;'>
  <td style='padding:15px;text-align:center;font-size:11px;color:#999;'>Carissima Studio 2026</td>
  </tr></table></td></tr></table></body></html>`;

const productosTabla = (productos, color) => {
  let rows = "";
  for (const p of productos) {
    rows += `<tr style='border-bottom:1px solid #ddd;'>
      <td style='padding:8px;font-size:14px;'>${p.nombreProducto}</td>
      <td style='padding:8px;font-size:14px;text-align:right;color:${color};'><strong>$${p.precio}</strong></td>
    </tr>`;
  }
  return `<table width='100%' style='font-size:13px;'>${rows}</table>`;
};

const enviarEmailConfirmacionReserva = async (usuario, turno) => {
  const { nombre, email } = usuario;
  const { fecha, horaInicio, seña, productos } = turno;
  const fechaFormato = new Date(fecha).toLocaleDateString("es-AR");
  const html =
    header("Reserva Recibida", "Carissima Studio", "#ff7bed", "#e85ed8") +
    `<p style='font-size:16px;color:#333;'>Hola <strong>${nombre}</strong></p>
    <p style='font-size:14px;color:#666;'>Tu reserva ha sido recibida correctamente.</p>
    <div style='background:#f7e6ef;border-left:4px solid #ff7bed;padding:15px;margin:20px 0;border-radius:5px;'>
    <h3 style='margin:0 0 15px 0;color:#ff7bed;font-size:13px;font-weight:bold;'>DETALLES</h3>
    <p style='margin:8px 0;font-size:14px;'><strong>Fecha:</strong> ${fechaFormato}</p>
    <p style='margin:8px 0;font-size:14px;'><strong>Hora:</strong> ${horaInicio}</p>
    ${productosTabla(productos, "#ff7bed")}
    <p style='margin:15px 0 0 0;padding-top:15px;border-top:2px solid #ff7bed;font-size:16px;color:#ff7bed;'><strong>Seña: $${seña}</strong></p>
    </div>
    <p style='font-size:13px;color:#666;background:#fff9f5;border:1px solid #ffe0d0;padding:12px;border-radius:5px;'>Tu reserva está pendiente de confirmación. Te avisaremos cuando esté confirmada.</p>` +
    footer();
  logger.info(`📧 Enviando email reserva → ${email}`);
  await send({ to: email, subject: "Tu reserva ha sido recibida - Carissima Studio", html });
};

const enviarEmailNotificacionAdmin = async (usuario, turno) => {
  const { nombre, apellido, email, telefono } = usuario;
  const { fecha, horaInicio, seña, productos } = turno;
  const fechaFormato = new Date(fecha).toLocaleDateString("es-AR");
  const html =
    header("Nueva Reserva", "Pendiente de Confirmación", "#ff7bed", "#e85ed8") +
    `<p style='font-size:16px;color:#333;'>Nueva reserva recibida</p>
    <div style='background:#f0f9ff;border-left:4px solid #0284c7;padding:15px;margin:20px 0;border-radius:5px;'>
    <h3 style='margin:0 0 10px 0;color:#0284c7;font-size:13px;font-weight:bold;'>CLIENTE</h3>
    <p style='margin:5px 0;font-size:14px;'><strong>Nombre:</strong> ${nombre} ${apellido}</p>
    <p style='margin:5px 0;font-size:14px;'><strong>Email:</strong> ${email}</p>
    <p style='margin:5px 0;font-size:14px;'><strong>Teléfono:</strong> ${telefono}</p>
    </div>
    <div style='background:#f7e6ef;border-left:4px solid #ff7bed;padding:15px;margin:20px 0;border-radius:5px;'>
    <h3 style='margin:0 0 10px 0;color:#ff7bed;font-size:13px;font-weight:bold;'>TURNO</h3>
    <p style='margin:5px 0;font-size:14px;'><strong>Fecha:</strong> ${fechaFormato} a las ${horaInicio}</p>
    ${productosTabla(productos, "#ff7bed")}
    <p style='margin:15px 0 0 0;padding-top:10px;border-top:2px solid #ff7bed;font-size:16px;color:#ff7bed;'><strong>Seña: $${seña}</strong></p>
    </div>
    <p style='font-size:13px;color:#666;background:#fff9f5;border:1px solid #ffe0d0;padding:12px;border-radius:5px;'>El cliente espera tu confirmación. <strong>Accedé al panel para confirmar.</strong></p>` +
    footer();
  logger.info(`📧 Enviando email admin → ${ADMIN_EMAIL}`);
  await send({ to: ADMIN_EMAIL, subject: `Nueva reserva de ${nombre} ${apellido}`, html });
};

const enviarEmailConfirmacionTurno = async (usuario, turno) => {
  const { nombre, email } = usuario;
  const { fecha, horaInicio, seña, productos } = turno;
  const fechaFormato = new Date(fecha).toLocaleDateString("es-AR");
  const html =
    header("¡Turno Confirmado!", "Carissima Studio", "#10b981", "#059669") +
    `<p style='font-size:16px;color:#333;'>Hola <strong>${nombre}</strong></p>
    <p style='font-size:14px;color:#666;'>Tu turno ha sido confirmado oficialmente.</p>
    <div style='background:#d1fae5;border-left:4px solid #10b981;padding:15px;margin:20px 0;border-radius:5px;'>
    <h3 style='margin:0 0 15px 0;color:#059669;font-size:13px;font-weight:bold;'>TU TURNO CONFIRMADO</h3>
    <p style='margin:8px 0;font-size:14px;'><strong>Fecha:</strong> ${fechaFormato}</p>
    <p style='margin:8px 0;font-size:14px;'><strong>Hora:</strong> ${horaInicio}</p>
    ${productosTabla(productos, "#10b981")}
    <p style='margin:15px 0 0 0;padding-top:15px;border-top:2px solid #10b981;font-size:16px;color:#10b981;'><strong>Seña Pagada: $${seña}</strong></p>
    </div>
    <p style='font-size:13px;color:#666;background:#f0fdf4;border:1px solid #bbf7d0;padding:12px;border-radius:5px;'>Te sugerimos llegar 10 minutos antes del turno.</p>` +
    footer();
  logger.info(`📧 Enviando email confirmación → ${email}`);
  await send({ to: email, subject: "Tu turno ha sido confirmado - Carissima Studio", html });
};

const enviarEmailCancelacionTurnoAlUsuario = async (usuario, turno) => {
  const { nombre, email } = usuario;
  const { fecha, horaInicio, productos } = turno;
  const fechaFormato = new Date(fecha).toLocaleDateString("es-AR");
  let items = "";
  for (const p of productos) items += `<li style='margin:5px 0;font-size:13px;'>${p.nombreProducto} - $${p.precio}</li>`;
  const html =
    header("Turno Cancelado", "Carissima Studio", "#ef4444", "#dc2626") +
    `<p style='font-size:16px;color:#333;'>Hola <strong>${nombre}</strong></p>
    <p style='font-size:14px;color:#666;'>Tu turno ha sido cancelado.</p>
    <div style='background:#fee2e2;border-left:4px solid #ef4444;padding:15px;margin:20px 0;border-radius:5px;'>
    <p style='margin:8px 0;font-size:14px;'><strong>Fecha:</strong> ${fechaFormato} - ${horaInicio}</p>
    <ul style='margin:5px 0;padding-left:20px;'>${items}</ul>
    </div>
    <p style='font-size:13px;color:#666;'>Si necesitás agendar un nuevo turno, podés hacerlo desde nuestra plataforma.</p>` +
    footer();
  logger.info(`📧 Enviando email cancelación → ${email}`);
  await send({ to: email, subject: "Tu turno ha sido cancelado - Carissima Studio", html });
};

const enviarEmailCancelacionTurnoAlAdmin = async (usuario, turno) => {
  const { nombre, apellido, email, telefono } = usuario;
  const { fecha, horaInicio, productos } = turno;
  const fechaFormato = new Date(fecha).toLocaleDateString("es-AR");
  let items = "";
  for (const p of productos) items += `<li style='margin:5px 0;font-size:13px;'>${p.nombreProducto} - $${p.precio}</li>`;
  const html =
    header("Turno Cancelado", "Por el cliente", "#ef4444", "#dc2626") +
    `<p>Un turno ha sido cancelado</p>
    <div style='background:#f0f9ff;border-left:4px solid #0284c7;padding:15px;margin:20px 0;border-radius:5px;'>
    <p style='margin:5px 0;font-size:14px;'><strong>Nombre:</strong> ${nombre} ${apellido}</p>
    <p style='margin:5px 0;font-size:14px;'><strong>Email:</strong> ${email}</p>
    <p style='margin:5px 0;font-size:14px;'><strong>Teléfono:</strong> ${telefono}</p>
    </div>
    <div style='background:#fee2e2;border-left:4px solid #ef4444;padding:15px;margin:20px 0;border-radius:5px;'>
    <p style='margin:5px 0;font-size:14px;'><strong>Fecha:</strong> ${fechaFormato} a las ${horaInicio}</p>
    <ul style='margin:5px 0;padding-left:20px;'>${items}</ul>
    </div>` +
    footer();
  logger.info(`📧 Enviando email cancelación admin → ${ADMIN_EMAIL}`);
  await send({ to: ADMIN_EMAIL, subject: `Turno cancelado por cliente: ${nombre} ${apellido}`, html });
};

const enviarEmailCambioHorario = async (usuario, turno) => {
  const { nombre, email } = usuario;
  const { fecha, horaInicio, productos } = turno;
  const fechaFormato = new Date(fecha).toLocaleDateString("es-AR");
  const html =
    header("Horario Modificado", "Carissima Studio", "#0284c7", "#0369a1") +
    `<p style='font-size:16px;color:#333;'>Hola <strong>${nombre}</strong></p>
    <p style='font-size:14px;color:#666;'>Tu turno ha sido modificado exitosamente.</p>
    <div style='background:#e0f2fe;border-left:4px solid #0284c7;padding:15px;margin:20px 0;border-radius:5px;'>
    <p style='margin:8px 0;font-size:14px;'><strong>Fecha:</strong> ${fechaFormato}</p>
    <p style='margin:8px 0;font-size:14px;'><strong>Hora:</strong> ${horaInicio}</p>
    ${productosTabla(productos, "#0284c7")}
    </div>
    <p style='font-size:13px;color:#666;background:#f0fdf4;border:1px solid #bbf7d0;padding:12px;border-radius:5px;'>Tu nuevo turno está confirmado. Llegá 10 minutos antes.</p>` +
    footer();
  logger.info(`📧 Enviando email cambio horario → ${email}`);
  await send({ to: email, subject: "Tu horario ha sido modificado - Carissima Studio", html });
};

export {
  enviarEmailConfirmacionReserva,
  enviarEmailNotificacionAdmin,
  enviarEmailConfirmacionTurno,
  enviarEmailCancelacionTurnoAlUsuario,
  enviarEmailCancelacionTurnoAlAdmin,
  enviarEmailCambioHorario,
};
