# Carissima Studio — Backend

API REST para la gestión de turnos, packs de sesiones y pagos de Carissima Studio (centro de estética/spa). Maneja autenticación de usuarios, reservas con una máquina de estados, subida de comprobantes a Cloudinary, pagos vía Mercado Pago o transferencia, y notificaciones por email.

## Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5
- **Base de datos**: MongoDB + Mongoose 9
- **Auth**: JWT (12h) + bcrypt
- **Almacenamiento de imágenes**: Cloudinary (comprobantes de pago)
- **Pagos**: Mercado Pago SDK
- **Email**: Resend (con Nodemailer como alternativa)
- **Logging**: Winston
- **Testing**: Jest + Supertest + MongoDB Memory Server
- **Despliegue**: Render

## Estructura del proyecto

```
controllers/    Manejo de requests/responses
services/       Lógica de negocio
models/         Esquemas Mongoose
routes/         Definición de endpoints + validaciones
middlewares/     JWT, roles, upload (Multer/Cloudinary)
helpers/        Logger, AppError, handleError, validaciones
database/       Conexión a MongoDB
tests/          unit/, integration/, e2e/, setup/
docs/           Documentación de estado del proyecto y deuda técnica
```

## Dominio

- **Usuario**: clientes y administradores (roles `ADMIN_ROLE`/`USER_ROLE`).
- **Turno**: reserva de uno o más servicios, con máquina de estados (`borrador → pendiente → señado → confirmado → completado`, con ramas a `cancelado`/`pago_rechazado`). Límite de 2 cambios de horario dentro de las 24h posteriores a la confirmación.
- **Producto / Categoria**: servicios ofrecidos por el spa.
- **Pack / PackCompra / Sesion**: paquetes de múltiples sesiones con seña parcial.
- **ConfigHorario / Bloqueo**: disponibilidad horaria y bloqueos puntuales de agenda.

Ver [docs/ESTADO_PROYECTO.md](docs/ESTADO_PROYECTO.md) para el detalle completo de arquitectura, endpoints y modelos.

## Variables de entorno

Variables requeridas para iniciar el servidor (validadas en `server.js`):

```
MONGO_URI
JWT_SECRET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Variables opcionales según funcionalidad:

```
PORT                # default 5000
NODE_ENV            # development|test|production
FRONTEND_URL        # CORS + back_urls de Mercado Pago
BACKEND_URL         # notification_url del webhook de Mercado Pago
MP_ACCESS_TOKEN     # requerido para pagos con Mercado Pago
MP_WEBHOOK_SECRET   # secret de la integración de webhooks en el panel de Mercado Pago; sin esto, la firma del webhook no se verifica
RESEND_API_KEY      # requerido para envío de emails vía Resend
EMAIL_USER / EMAIL_PASSWORD / ADMIN_EMAIL   # fallback Nodemailer/Gmail
```

> No commitear nunca un `.env` real ni credenciales de ejemplo realistas en archivos `.md`. Ver [docs/ISSUES.md](docs/ISSUES.md#issue-1) sobre un incidente de exposición de credenciales ya detectado en este repo.

## Scripts

```bash
npm run dev            # servidor con nodemon (desarrollo)
npm start               # servidor en producción
npm test               # tests (unit + integration + e2e)
npm run test:watch     # tests en modo watch
npm run test:coverage  # tests con reporte de cobertura
```

## Documentación

- [docs/ESTADO_PROYECTO.md](docs/ESTADO_PROYECTO.md) — estado actual: arquitectura, modelos, endpoints, seguridad, testing, observabilidad.
- [docs/ISSUES.md](docs/ISSUES.md) — deuda técnica e issues conocidos, con plan de remediación priorizado.
