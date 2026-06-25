# Estado del Proyecto — Carissima Studio Backend

> Última revisión: 2026-06-25, sobre rama `STC`.

## 1. Stack técnico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js, ES Modules (`"type": "module"`) |
| Framework HTTP | Express 5.2 |
| Base de datos | MongoDB vía Mongoose 9.3 |
| Autenticación | JWT (`jsonwebtoken`, expira en 12h) + `bcryptjs` (10 rounds) |
| Validación de inputs | `express-validator` |
| Seguridad HTTP | `helmet`, `cors`, `express-rate-limit` |
| Upload de archivos | `multer` (memoria) + `cloudinary` |
| Pagos | `mercadopago` SDK v2 |
| Email | `resend` (principal) + `nodemailer` (fallback Gmail) |
| Logging | `winston` (archivo + consola) |
| Testing | `jest` + `supertest` + `mongodb-memory-server` |
| Despliegue | Render (sin Docker, sin CI/CD) |

## 2. Arquitectura

Patrón MVC con capa de servicios explícita:

```
routes/  →  controllers/  →  services/  →  models/
                ↓
         middlewares/ (JWT, roles, upload)
                ↓
         helpers/ (logger, AppError, handleError, validaciones)
```

- Las **rutas** declaran validaciones de `express-validator` inline y delegan en controllers.
- Los **controllers** son delgados: parsean `req`, llaman al service, devuelven la respuesta o delegan el error a `handleError`.
- Los **services** contienen toda la lógica de negocio (incluye envío de emails y llamadas a Mercado Pago/Cloudinary).
- Los **models** (Mongoose) tienen validaciones de esquema (regex, enum, min/max) como segunda línea de defensa además de `express-validator`.

## 3. Modelos de datos

- **Usuario** — clientes y administradores. Roles `ADMIN_ROLE`/`USER_ROLE`. Password nunca serializado (`toJSON()` lo oculta). Soft delete vía campo `estado`.
- **Turno** — reserva de uno o más `Producto`. Máquina de estados (ver sección 5). Índices en `{fecha, horaInicio}` y `{usuario}`.
- **Producto** / **Categoria** — catálogo de servicios del spa.
- **Pack** / **PackCompra** / **Sesion** — paquetes de múltiples sesiones con seña parcial (default 50%).
- **ConfigHorario** — configuración global de disponibilidad (días laborales, duración de turno, capacidad por slot).
- **Bloqueo** — bloqueos puntuales de día u horario en la agenda.

## 4. Endpoints principales

| Recurso | Rutas |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/renovar` |
| Usuarios | CRUD + `/perfil`, soft delete + `/restaurar` (admin) |
| Turnos | crear, `/mis-turnos`, `/admin` (paginado), `/:id/subir-comprobante`, `/:id/confirmar`, `/:id/cancelar`, `/:id/cambiar-horario`, `/:id/rechazar-pago`, `/:id/completar`, `DELETE /:id` |
| Productos / Categorías | CRUD (admin para escritura) |
| Horarios | `GET/PUT /api/horarios` (config global) |
| Pagos | `POST /api/pagos/preferencia/:turnoId`, `POST /api/pagos/webhook` (sin JWT, público) |
| Packs | CRUD + `/compras/:id/preferencia`, `DELETE /compras/:id` |

Todas las rutas de escritura pasan por `validarJWT` + `express-validator`; las de administración además por `esAdminRole`.

## 5. Máquina de estados de Turno

```
borrador ──┬─→ pendiente ──┬─→ señado ──┬─→ confirmado ──┬─→ completado
           │               │            │                ├─→ cancelado (≤2 cambios de horario, dentro de 24h post-confirmación)
           └─→ cancelado   └─→ cancelado└─→ pago_rechazado┘
                                              └─→ señado (reintento) / cancelado
```

Reglas de negocio relevantes (en `services/turno.js`):
- El total y la seña se calculan server-side a partir del precio real de los `Producto` seleccionados — nunca se confía en un monto enviado por el cliente.
- La capacidad por slot (`ConfigHorario.capacidadPorTurno`) sólo cuenta turnos en `pendiente`, `señado` o `confirmado` — los `borrador` no bloquean el cupo (permite abandono sin penalizar disponibilidad).
- El chequeo de capacidad (en `crearTurno`) y de conflicto de slot (en `cambiarHorario`) corren dentro de una transacción de Mongoose junto con la escritura, usando un documento de lock por slot (`models/SlotLock.js`) para evitar overbooking por requests concurrentes.
- Turnos y reprogramaciones requieren al menos 24hs de antelación sobre la fecha/hora del slot.
- Cambios de horario: máximo 2, y sólo dentro de las 24h posteriores a `fechaConfirmacion`.
- Bloqueos de agenda (`Bloqueo`) se chequean por tipo `dia` u `horario` antes de crear o reprogramar un turno.

## 6. Seguridad

- JWT con expiración de 12h, validado en `middlewares/validar-jwt.js` (verifica firma, existencia y estado activo del usuario).
- Passwords con `bcryptjs` (10 rounds), nunca expuestos en respuestas.
- Rate limiting: 500 req/15min global, 50 req/15min en `/api/auth`.
- `helmet` para headers HTTP, `cors` con whitelist de orígenes + `FRONTEND_URL`.
- Validación de inputs en dos capas: `express-validator` en rutas + validadores de esquema Mongoose.
- Variables de entorno sensibles validadas al boot (el proceso no arranca si faltan).
- Webhook de Mercado Pago (`/api/pagos/webhook`) valida la firma HMAC-SHA256 (`MP_WEBHOOK_SECRET`) antes de procesar, con rate limit propio (100 req/15min).
- Subida de archivos (Multer) limitada a 5MB y a tipos `image/jpeg`/`png`/`webp`.

## 7. Observabilidad

- Logging centralizado con Winston (`logs/error.log`, `logs/combined.log` en producción; consola coloreada en desarrollo).
- Manejo de errores centralizado vía `AppError` + `handleError`.
- Emails de notificación (usuario/admin) como señal indirecta de eventos de negocio; los fallos de email se loguean pero no interrumpen el flujo principal (fire-and-forget controlado).
- No hay APM, métricas de negocio ni dashboards — solo logs.

## 8. Testing

- 18 archivos de test repartidos en `unit/`, `integration/` y `e2e/` (287 tests), usando Jest + Supertest + `mongodb-memory-server` en modo replica set de un nodo (necesario para las transacciones de `services/turno.js`).
- Cobertura sólida en auth, usuarios y turnos (incluida la máquina de estados, la concurrencia en la reserva de slots y la verificación de firma del webhook de Mercado Pago).
- Sin cobertura explícita de: envío real de emails, subida real a Cloudinary (sólo se cubre el rechazo de archivos por `fileFilter`/tamaño).

## 9. Despliegue

- Pensado para Render: `trust proxy` habilitado, logs a stdout, variables de entorno configuradas en el dashboard de Render.
- Sin Dockerfile ni pipeline de CI/CD (`.github/workflows`) — el despliegue depende de push directo a la rama conectada a Render.
- Sin endpoint de healthcheck formal más allá de `GET /` genérico.

## 10. Calidad de código

- Sin ESLint ni Prettier configurados — no hay enforcement automático de estilo.
- Sin TypeScript — JavaScript plano con validación en runtime (Mongoose + express-validator).
- Manejo de errores async consistente (`try/catch` → `AppError`/`handleError` en casi todos los controllers y servicios).

Ver [ISSUES.md](ISSUES.md) para el detalle de deuda técnica y plan de remediación.
