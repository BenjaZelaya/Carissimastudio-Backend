import nodemailer from "nodemailer";
import logger from "../helpers/logger.js";

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || !process.env.ADMIN_EMAIL) {
  logger.error("Email config incompleta");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify(function (error, success) {
  if (error) {
    logger.error("Error email:", error);
  } else {
    logger.info("OK Email listo");
  }
});

const enviarEmailConfirmacionReserva = async (usuario, turno) => {
  const { nombre, email } = usuario;
  const { fecha, horaInicio, seña, productos } = turno;

  const fechaFormato = new Date(fecha).toLocaleDateString("es-AR");

  let productosHtml = "";
  for (const p of productos) {
    productosHtml += "<tr style='border-bottom: 1px solid #ddd;'><td style='padding: 8px; font-size: 14px;'>" + p.nombreProducto + "</td><td style='padding: 8px; font-size: 14px; text-align: right; color: #ff7bed;'><strong>$" + p.precio + "</strong></td></tr>";
  }

  const htmlContent = 
    "<!DOCTYPE html>" +
    "<html>" +
    "<head><meta charset='UTF-8'></head>" +
    "<body style='font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;'>" +
    "<table width='100%' style='background-color: #f5f5f5;'><tr><td align='center' style='padding: 20px;'>" +
    "<table width='600' style='background-color: white; border-radius: 10px; border: 1px solid #ddd;'>" +
    "<tr style='background: linear-gradient(135deg, #ff7bed 0%, #e85ed8 100%);'><td style='padding: 30px; text-align: center; color: white;'>" +
    "<h1 style='margin: 0; font-size: 28px; font-weight: bold;'>Reserva Recibida</h1>" +
    "<p style='margin: 5px 0 0 0; font-size: 14px;'>Carissima Studio</p>" +
    "</td></tr>" +
    "<tr><td style='padding: 30px;'>" +
    "<p style='font-size: 16px; color: #333;'>Hola <strong>" + nombre + "</strong></p>" +
    "<p style='font-size: 14px; color: #666; line-height: 1.6;'>Tu reserva ha sido recibida correctamente.</p>" +
    "<div style='background-color: #f7e6ef; border-left: 4px solid #ff7bed; padding: 15px; margin: 20px 0; border-radius: 5px;'>" +
    "<h3 style='margin: 0 0 15px 0; color: #ff7bed; font-size: 13px; font-weight: bold;'>DETALLES DE TU RESERVA</h3>" +
    "<p style='margin: 8px 0; font-size: 14px;'><strong>Fecha:</strong> " + fechaFormato + "</p>" +
    "<p style='margin: 8px 0; font-size: 14px;'><strong>Hora:</strong> " + horaInicio + "</p>" +
    "<p style='margin: 8px 0 5px 0; font-size: 14px;'><strong>Servicios:</strong></p>" +
    "<table width='100%' style='font-size: 13px;'>" + productosHtml + "</table>" +
    "<p style='margin: 15px 0 0 0; padding-top: 15px; border-top: 2px solid #ff7bed; font-size: 16px; color: #ff7bed;'><strong>Seña a Pagar: $" + seña + "</strong></p>" +
    "</div>" +
    "<p style='font-size: 13px; color: #666; background-color: #fff9f5; border: 1px solid #ffe0d0; padding: 12px; border-radius: 5px; margin: 20px 0;'><strong>Estado:</strong> Tu reserva esta pendiente de confirmacion. Te avisaremos por este mismo medio la Confirmacion del Turno.</p>" +
    "<p style='font-size: 13px; color: #666;'>Si tienes dudas, contactanos directamente.</p>" +
    "</td></tr>" +
    "<tr style='background-color: #f5f5f5; border-top: 1px solid #ddd;'><td style='padding: 15px; text-align: center; font-size: 11px; color: #999;'>Carissima Studio 2026</td></tr>" +
    "</table>" +
    "</td></tr></table>" +
    "</body>" +
    "</html>";

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Tu reserva ha sido recibida - Carissima Studio",
    html: htmlContent,
  };

  try {
    logger.info("EMAIL CONFIRMACION RESERVA: " + email);
    const info = await transporter.sendMail(mailOptions);
    logger.info("OK EMAIL ENVIADO: " + info.messageId);
  } catch (error) {
    logger.error("ERROR EMAIL: " + error.message);
  }
};

const enviarEmailNotificacionAdmin = async (usuario, turno) => {
  const { nombre, apellido, email, telefono } = usuario;
  const { fecha, horaInicio, seña, productos } = turno;

  const adminEmail = process.env.ADMIN_EMAIL;
  const fechaFormato = new Date(fecha).toLocaleDateString("es-AR");

  let productosHtml = "";
  for (const p of productos) {
    productosHtml += "<tr style='border-bottom: 1px solid #ddd;'><td style='padding: 8px; font-size: 14px;'>" + p.nombreProducto + "</td><td style='padding: 8px; font-size: 14px; text-align: right; color: #ff7bed;'><strong>$" + p.precio + "</strong></td></tr>";
  }

  const htmlContent = 
    "<!DOCTYPE html>" +
    "<html>" +
    "<head><meta charset='UTF-8'></head>" +
    "<body style='font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;'>" +
    "<table width='100%' style='background-color: #f5f5f5;'><tr><td align='center' style='padding: 20px;'>" +
    "<table width='600' style='background-color: white; border-radius: 10px; border: 1px solid #ddd;'>" +
    "<tr style='background: linear-gradient(135deg, #ff7bed 0%, #e85ed8 100%);'><td style='padding: 30px; text-align: center; color: white;'>" +
    "<h1 style='margin: 0; font-size: 28px; font-weight: bold;'>Nueva Reserva</h1>" +
    "<p style='margin: 5px 0 0 0; font-size: 14px;'>Pendiente de Confirmacion</p>" +
    "</td></tr>" +
    "<tr><td style='padding: 30px;'>" +
    "<p style='font-size: 16px; color: #333;'>Nueva reserva recibida</p>" +
    "<div style='background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 5px;'>" +
    "<h3 style='margin: 0 0 10px 0; color: #0284c7; font-size: 13px; font-weight: bold;'>CLIENTE</h3>" +
    "<p style='margin: 5px 0; font-size: 14px;'><strong>Nombre:</strong> " + nombre + " " + apellido + "</p>" +
    "<p style='margin: 5px 0; font-size: 14px;'><strong>Email:</strong> " + email + "</p>" +
    "<p style='margin: 5px 0; font-size: 14px;'><strong>Telefono:</strong> " + telefono + "</p>" +
    "</div>" +
    "<div style='background-color: #f7e6ef; border-left: 4px solid #ff7bed; padding: 15px; margin: 20px 0; border-radius: 5px;'>" +
    "<h3 style='margin: 0 0 10px 0; color: #ff7bed; font-size: 13px; font-weight: bold;'>TURNO</h3>" +
    "<p style='margin: 5px 0; font-size: 14px;'><strong>Fecha:</strong> " + fechaFormato + " a las " + horaInicio + "</p>" +
    "<p style='margin: 5px 0 5px 0; font-size: 14px;'><strong>Servicios:</strong></p>" +
    "<table width='100%' style='font-size: 13px;'>" + productosHtml + "</table>" +
    "<p style='margin: 15px 0 0 0; padding-top: 10px; border-top: 2px solid #ff7bed; font-size: 16px; color: #ff7bed;'><strong>Seña: $" + seña + "</strong></p>" +
    "</div>" +
    "<p style='font-size: 13px; color: #666; background-color: #fff9f5; border: 1px solid #ffe0d0; padding: 12px; border-radius: 5px; margin: 20px 0;'>El cliente espera tu confirmacion. <strong>Accede al panel para confirmar.</strong></p>" +
    "</td></tr>" +
    "<tr style='background-color: #f5f5f5; border-top: 1px solid #ddd;'><td style='padding: 15px; text-align: center; font-size: 11px; color: #999;'>Carissima Studio 2026</td></tr>" +
    "</table>" +
    "</td></tr></table>" +
    "</body>" +
    "</html>";

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: "Nueva reserva de " + nombre + " " + apellido,
    html: htmlContent,
  };

  try {
    logger.info("EMAIL NOTIFICACION ADMIN: " + adminEmail);
    const info = await transporter.sendMail(mailOptions);
    logger.info("OK EMAIL ENVIADO: " + info.messageId);
  } catch (error) {
    logger.error("ERROR EMAIL: " + error.message);
  }
};

const enviarEmailConfirmacionTurno = async (usuario, turno) => {
  const { nombre, email } = usuario;
  const { fecha, horaInicio, seña, productos } = turno;

  logger.info("INICIANDO ENVIO EMAIL CONFIRMACION");
  logger.info("Usuario: " + nombre + ", Email: " + email);

  const fechaFormato = new Date(fecha).toLocaleDateString("es-AR");

  let productosHtml = "";
  for (const p of productos) {
    productosHtml += "<tr style='border-bottom: 1px solid #ddd;'><td style='padding: 8px; font-size: 14px;'>" + p.nombreProducto + "</td><td style='padding: 8px; font-size: 14px; text-align: right; color: #10b981;'><strong>$" + p.precio + "</strong></td></tr>";
  }

  const htmlContent = 
    "<!DOCTYPE html>" +
    "<html>" +
    "<head><meta charset='UTF-8'></head>" +
    "<body style='font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;'>" +
    "<table width='100%' style='background-color: #f5f5f5;'><tr><td align='center' style='padding: 20px;'>" +
    "<table width='600' style='background-color: white; border-radius: 10px; border: 1px solid #ddd;'>" +
    "<tr style='background: linear-gradient(135deg, #10b981 0%, #059669 100%);'><td style='padding: 30px; text-align: center; color: white;'>" +
    "<h1 style='margin: 0; font-size: 28px; font-weight: bold;'>Turno Confirmado!</h1>" +
    "<p style='margin: 5px 0 0 0; font-size: 14px;'>Carissima Studio</p>" +
    "</td></tr>" +
    "<tr><td style='padding: 30px;'>" +
    "<p style='font-size: 16px; color: #333;'>Hola <strong>" + nombre + "</strong></p>" +
    "<p style='font-size: 14px; color: #666; line-height: 1.6;'>Tu turno ha sido confirmado oficialmente.</p>" +
    "<div style='background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px;'>" +
    "<h3 style='margin: 0 0 15px 0; color: #059669; font-size: 13px; font-weight: bold;'>TU TURNO CONFIRMADO</h3>" +
    "<p style='margin: 8px 0; font-size: 14px;'><strong>Fecha:</strong> " + fechaFormato + "</p>" +
    "<p style='margin: 8px 0; font-size: 14px;'><strong>Hora:</strong> " + horaInicio + "</p>" +
    "<p style='margin: 8px 0 5px 0; font-size: 14px;'><strong>Servicios:</strong></p>" +
    "<table width='100%' style='font-size: 13px;'>" + productosHtml + "</table>" +
    "<p style='margin: 15px 0 0 0; padding-top: 15px; border-top: 2px solid #10b981; font-size: 16px; color: #10b981;'><strong>Seña Pagada: $" + seña + "</strong></p>" +
    "</div>" +
    "<p style='font-size: 13px; color: #666; background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 5px; margin: 20px 0;'><strong>Recomendacion:</strong> Te sugerimos llegar 10 minutos antes del turno.</p>" +
    "<p style='font-size: 13px; color: #666;'>Puedes cambiar tu turno dentro de 24 horas accediendo a tu cuenta.</p>" +
    "</td></tr>" +
    "<tr style='background-color: #f5f5f5; border-top: 1px solid #ddd;'><td style='padding: 15px; text-align: center; font-size: 11px; color: #999;'>Carissima Studio 2026</td></tr>" +
    "</table>" +
    "</td></tr></table>" +
    "</body>" +
    "</html>";

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Tu turno ha sido confirmado - Carissima Studio",
    html: htmlContent,
  };

  try {
    logger.info("EMAIL CONFIRMACION TURNO: " + email);
    const info = await transporter.sendMail(mailOptions);
    logger.info("OK EMAIL TURNO ENVIADO: " + info.messageId);
  } catch (error) {
    logger.error("ERROR EMAIL TURNO: " + error.message);
    logger.error("Stack: " + error.stack);
  }
};

const enviarEmailCancelacionTurnoAlUsuario = async (usuario, turno) => {
  const { nombre, email } = usuario;
  const { fecha, horaInicio, productos } = turno;

  const fechaFormato = new Date(fecha).toLocaleDateString("es-AR");

  let productosHtml = "";
  for (const p of productos) {
    productosHtml += "<li style='margin: 5px 0; font-size: 13px;'>" + p.nombreProducto + " - $" + p.precio + "</li>";
  }

  const htmlContent = 
    "<!DOCTYPE html>" +
    "<html>" +
    "<head><meta charset='UTF-8'></head>" +
    "<body style='font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;'>" +
    "<table width='100%' style='background-color: #f5f5f5;'><tr><td align='center' style='padding: 20px;'>" +
    "<table width='600' style='background-color: white; border-radius: 10px; border: 1px solid #ddd;'>" +
    "<tr style='background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);'><td style='padding: 30px; text-align: center; color: white;'>" +
    "<h1 style='margin: 0; font-size: 28px; font-weight: bold;'>Turno Cancelado</h1>" +
    "<p style='margin: 5px 0 0 0; font-size: 14px;'>Carissima Studio</p>" +
    "</td></tr>" +
    "<tr><td style='padding: 30px;'>" +
    "<p style='font-size: 16px; color: #333;'>Hola <strong>" + nombre + "</strong></p>" +
    "<p style='font-size: 14px; color: #666; line-height: 1.6;'>Tu turno ha sido cancelado.</p>" +
    "<div style='background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px;'>" +
    "<h3 style='margin: 0 0 15px 0; color: #dc2626; font-size: 13px; font-weight: bold;'>TURNO CANCELADO</h3>" +
    "<p style='margin: 8px 0; font-size: 14px;'><strong>Fecha:</strong> " + fechaFormato + "</p>" +
    "<p style='margin: 8px 0; font-size: 14px;'><strong>Hora:</strong> " + horaInicio + "</p>" +
    "<p style='margin: 8px 0 5px 0; font-size: 14px;'><strong>Servicios:</strong></p>" +
    "<ul style='margin: 5px 0; padding-left: 20px;'>" + productosHtml + "</ul>" +
    "</div>" +
    "<p style='font-size: 13px; color: #666;'>Si necesitas agendar un nuevo turno, puedes hacerlo desde nuestra plataforma. Estaremos encantados de ayudarte.</p>" +
    "</td></tr>" +
    "<tr style='background-color: #f5f5f5; border-top: 1px solid #ddd;'><td style='padding: 15px; text-align: center; font-size: 11px; color: #999;'>Carissima Studio 2026</td></tr>" +
    "</table>" +
    "</td></tr></table>" +
    "</body>" +
    "</html>";

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Tu turno ha sido cancelado - Carissima Studio",
    html: htmlContent,
  };

  try {
    logger.info("EMAIL CANCELACION AL USUARIO: " + email);
    const info = await transporter.sendMail(mailOptions);
    logger.info("OK EMAIL CANCELACION ENVIADO: " + info.messageId);
  } catch (error) {
    logger.error("ERROR EMAIL CANCELACION: " + error.message);
  }
};

const enviarEmailCancelacionTurnoAlAdmin = async (usuario, turno) => {
  const { nombre, apellido, email, telefono } = usuario;
  const { fecha, horaInicio, productos } = turno;

  const adminEmail = process.env.ADMIN_EMAIL;
  const fechaFormato = new Date(fecha).toLocaleDateString("es-AR");

  let productosHtml = "";
  for (const p of productos) {
    productosHtml += "<li style='margin: 5px 0; font-size: 13px;'>" + p.nombreProducto + " - $" + p.precio + "</li>";
  }

  const htmlContent = 
    "<!DOCTYPE html>" +
    "<html>" +
    "<head><meta charset='UTF-8'></head>" +
    "<body style='font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;'>" +
    "<table width='100%' style='background-color: #f5f5f5;'><tr><td align='center' style='padding: 20px;'>" +
    "<table width='600' style='background-color: white; border-radius: 10px; border: 1px solid #ddd;'>" +
    "<tr style='background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);'><td style='padding: 30px; text-align: center; color: white;'>" +
    "<h1 style='margin: 0; font-size: 28px; font-weight: bold;'>Turno Cancelado</h1>" +
    "<p style='margin: 5px 0 0 0; font-size: 14px;'>Por el cliente</p>" +
    "</td></tr>" +
    "<tr><td style='padding: 30px;'>" +
    "<p style='font-size: 16px; color: #333;'>Un turno ha sido cancelado</p>" +
    "<div style='background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 5px;'>" +
    "<h3 style='margin: 0 0 10px 0; color: #0284c7; font-size: 13px; font-weight: bold;'>CLIENTE</h3>" +
    "<p style='margin: 5px 0; font-size: 14px;'><strong>Nombre:</strong> " + nombre + " " + apellido + "</p>" +
    "<p style='margin: 5px 0; font-size: 14px;'><strong>Email:</strong> " + email + "</p>" +
    "<p style='margin: 5px 0; font-size: 14px;'><strong>Telefono:</strong> " + telefono + "</p>" +
    "</div>" +
    "<div style='background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px;'>" +
    "<h3 style='margin: 0 0 10px 0; color: #dc2626; font-size: 13px; font-weight: bold;'>TURNO CANCELADO</h3>" +
    "<p style='margin: 5px 0; font-size: 14px;'><strong>Fecha:</strong> " + fechaFormato + " a las " + horaInicio + "</p>" +
    "<p style='margin: 5px 0 5px 0; font-size: 14px;'><strong>Servicios:</strong></p>" +
    "<ul style='margin: 5px 0; padding-left: 20px;'>" + productosHtml + "</ul>" +
    "</div>" +
    "</td></tr>" +
    "<tr style='background-color: #f5f5f5; border-top: 1px solid #ddd;'><td style='padding: 15px; text-align: center; font-size: 11px; color: #999;'>Carissima Studio 2026</td></tr>" +
    "</table>" +
    "</td></tr></table>" +
    "</body>" +
    "</html>";

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: "Turno cancelado por cliente: " + nombre + " " + apellido,
    html: htmlContent,
  };

  try {
    logger.info("EMAIL CANCELACION AL ADMIN: " + adminEmail);
    const info = await transporter.sendMail(mailOptions);
    logger.info("OK EMAIL CANCELACION ADMIN ENVIADO: " + info.messageId);
  } catch (error) {
    logger.error("ERROR EMAIL CANCELACION ADMIN: " + error.message);
  }
};

const enviarEmailCambioHorario = async (usuario, turno) => {
  const { nombre, email } = usuario;
  const { fecha, horaInicio, productos } = turno;

  const fechaFormato = new Date(fecha).toLocaleDateString("es-AR");

  let productosHtml = "";
  for (const p of productos) {
    productosHtml += "<tr style='border-bottom: 1px solid #ddd;'><td style='padding: 8px; font-size: 14px;'>" + p.nombreProducto + "</td><td style='padding: 8px; font-size: 14px; text-align: right; color: #0284c7;'><strong>$" + p.precio + "</strong></td></tr>";
  }

  const htmlContent = 
    "<!DOCTYPE html>" +
    "<html>" +
    "<head><meta charset='UTF-8'></head>" +
    "<body style='font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;'>" +
    "<table width='100%' style='background-color: #f5f5f5;'><tr><td align='center' style='padding: 20px;'>" +
    "<table width='600' style='background-color: white; border-radius: 10px; border: 1px solid #ddd;'>" +
    "<tr style='background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);'><td style='padding: 30px; text-align: center; color: white;'>" +
    "<h1 style='margin: 0; font-size: 28px; font-weight: bold;'>Horario Modificado</h1>" +
    "<p style='margin: 5px 0 0 0; font-size: 14px;'>Carissima Studio</p>" +
    "</td></tr>" +
    "<tr><td style='padding: 30px;'>" +
    "<p style='font-size: 16px; color: #333;'>Hola <strong>" + nombre + "</strong></p>" +
    "<p style='font-size: 14px; color: #666; line-height: 1.6;'>Tu turno ha sido modificado exitosamente.</p>" +
    "<div style='background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 5px;'>" +
    "<h3 style='margin: 0 0 15px 0; color: #0369a1; font-size: 13px; font-weight: bold;'>TU NUEVO HORARIO</h3>" +
    "<p style='margin: 8px 0; font-size: 14px;'><strong>Fecha:</strong> " + fechaFormato + "</p>" +
    "<p style='margin: 8px 0; font-size: 14px;'><strong>Hora:</strong> " + horaInicio + "</p>" +
    "<p style='margin: 8px 0 5px 0; font-size: 14px;'><strong>Servicios:</strong></p>" +
    "<table width='100%' style='font-size: 13px;'>" + productosHtml + "</table>" +
    "</div>" +
    "<p style='font-size: 13px; color: #666; background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 5px; margin: 20px 0;'><strong>Recordá:</strong> Tu nuevo turno está confirmado. Te sugerimos llegar 10 minutos antes.</p>" +
    "</td></tr>" +
    "<tr style='background-color: #f5f5f5; border-top: 1px solid #ddd;'><td style='padding: 15px; text-align: center; font-size: 11px; color: #999;'>Carissima Studio 2026</td></tr>" +
    "</table>" +
    "</td></tr></table>" +
    "</body>" +
    "</html>";

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Tu horario ha sido modificado - Carissima Studio",
    html: htmlContent,
  };

  try {
    logger.info("EMAIL CAMBIO HORARIO: " + email);
    const info = await transporter.sendMail(mailOptions);
    logger.info("OK EMAIL CAMBIO HORARIO ENVIADO: " + info.messageId);
  } catch (error) {
    logger.error("ERROR EMAIL CAMBIO HORARIO: " + error.message);
  }
};

export { enviarEmailConfirmacionReserva, enviarEmailNotificacionAdmin, enviarEmailConfirmacionTurno, enviarEmailCancelacionTurnoAlUsuario, enviarEmailCancelacionTurnoAlAdmin, enviarEmailCambioHorario };
