// helpers/logger.js
import winston from "winston";

const esProduccion = process.env.NODE_ENV === "production";

/**
 * Logger centralizado de la aplicacion.
 *
 * - En desarrollo: salida coloreada y legible por consola.
 * - En produccion: salida JSON estructurada por consola mas archivos rotativos.
 *   - logs/error.log  → solo nivel "error"
 *   - logs/combined.log → todos los niveles
 *
 * Niveles disponibles (de menor a mayor severidad):
 *   info → warn → error
 */
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: esProduccion
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, stack }) =>
                `${timestamp} [${level}]: ${stack || message}`,
            ),
          ),
    }),
    ...(esProduccion
      ? [
          new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
          }),
          new winston.transports.File({ filename: "logs/combined.log" }),
        ]
      : []),
  ],
});

export default logger;
