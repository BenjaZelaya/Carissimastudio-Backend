# Issues conocidos y plan de remediación

> Última revisión: 2026-06-25. Prioridad: 🔴 crítica · 🟠 alta · 🟡 media · 🟢 baja.
> El documento está ordenado de mayor a menor prioridad de ataque — no hace falta una lista de orden separada, este es el orden.
> ✅ = ya corregido en este repo.

## 🔴 Issue 1 — Credenciales reales expuestas en `EMAIL_SETUP.md`

`EMAIL_SETUP.md` (commit `f3f4cac`) contiene, a modo de "ejemplo", una URI completa de MongoDB con password, un `JWT_SECRET` y las tres claves de Cloudinary. Están en el historial de git desde hace tiempo — un `.gitignore` correcto en `.env` no protege esto porque el archivo afectado es otro.

**Cómo atacarlo:**
1. **Rotar ya** (fuera de este repo, en los paneles correspondientes): password de MongoDB Atlas, `JWT_SECRET`, y regenerar el API secret de Cloudinary. Hasta que esto pase, cualquiera con acceso al repo (o a un fork/clon antiguo) tiene esas credenciales.
2. Reescribir `EMAIL_SETUP.md` para usar placeholders (`<TU_USUARIO>`, `<TU_PASSWORD>`) en vez de valores reales.
3. Si el repo es privado y nunca se compartió fuera del equipo, no es estrictamente necesario reescribir el historial de git tras rotar las credenciales; si hubo exposición pública (fork, repo que pasó a público, CI logs), considerar `git filter-repo` para purgar el archivo del historial.
4. Agregar un hook de pre-commit (`gitleaks` o similar) para detectar secretos antes de commitear a futuro.

## ✅ Issue 2 — El precio del turno lo definía el cliente, no el servidor (RESUELTO)

`POST /api/turnos` validaba `total` con `check("total").isFloat({ min: 0 })` (`routes/turno.js`) y `services/turno.js` (`crearTurno`) usaba ese `total` tal cual para calcular la seña (`seña = total * 0.5`) y lo guardaba en el `Turno`. El backend nunca recalculaba el precio a partir de los `Producto` reales: cualquier usuario autenticado podía, modificando el body de la request, reservar cualquier servicio pagando lo que quisiera (incluso `total: 0.01`).

Esto contrastaba con el flujo de `Pack`, que sí calculaba el monto server-side a partir del precio real del `Pack` en base de datos.

**Corrección aplicada** (`services/turno.js`, `crearTurno`):
1. Se busca `Producto.find({ _id: { $in: productos }, estado: true })` y se valida que todos los IDs recibidos existan y estén activos (400 si no).
2. `total` se calcula como la suma de los precios reales — el `total` que venga en el body se ignora por completo.
3. Se quitó la validación de `total` en `routes/turno.js` ya que el backend nunca lo persiste sin recalcularlo.
4. Se agregaron tests de integración y e2e que verifican que un `total` manipulado en el body es ignorado y se usa el precio real.

**Hallazgos adicionales durante la validación:** al implementar este fix se instaló `node_modules` y se corrió la suite de tests por primera vez en este entorno (nunca se había ejecutado `npm test` antes), lo que destapó 4 bugs preexistentes sin relación con este issue:

1. **Fecha inválida en el cálculo de día laboral** (`services/turno.js`, `crearTurno`): `new Date(fecha + "T12:00:00")` asumía que `fecha` no tenía horario incluido; si lo tenía (como con cualquier frontend que use `Date.toISOString()`), el resultado era `Invalid Date` y todo turno se rechazaba como "día no laborable". **Corregido** usando la fecha ya recortada (`fechaStr`) en vez de `fecha`.
2. **Mapeo de día de semana invertido** (`services/turno.js` y `services/horario.js`): `diaNum = diaSemana + 1` con `getDay()` de JS (`0=domingo..6=sábado`) hacía que con la configuración por defecto `diasLaborales: [1,2,3,4,5]` los **viernes quedaran bloqueados como no laborables** y los **domingos quedaran permitidos** — exactamente invertido. **Corregido** a `diaNum = diaSemana === 0 ? 7 : diaSemana` en ambos archivos.
3. **Estado `"pendiente"` inalcanzable**: `crearTurno` nunca seteaba `estado` explícitamente, por lo que el turno quedaba en `"borrador"` (default del modelo) — el único estado que el chequeo de capacidad no cuenta como ocupado. Ningún código transicionaba nunca a `"pendiente"`. **Corregido** seteando `estado: "pendiente"` al crear el turno.
4. **Sin validación de antelación mínima de 24hs**: a pesar de que los tests documentaban esta regla tanto en `crearTurno` como en `cambiarHorario`, el código nunca la implementaba — se podían reservar o reprogramar turnos para dentro de minutos, o incluso fechas pasadas. **Corregido** agregando una validación compartida (`validarAntelacionMinima`) en ambos flujos.

La suite completa (278 tests) pasa en verde tras estas correcciones. **Pendiente de coordinar con el equipo de frontend:** el fix #2 (viernes/domingo) puede afectar turnos ya reservados o lógica de disponibilidad que el frontend haya replicado con el bug original.

## 🟠 Issue 3 — Endpoint de test expuesto en producción

`GET /api/turnos/test/email-cancelacion` (en `routes/turno.js`) dispara envíos de email reales y está montado en el router de producción, protegido sólo por `esAdminRole`. No debería existir fuera de un entorno de test.

**Cómo atacarlo:**
1. Eliminar la ruta de `routes/turno.js`.
2. Si se necesita un mecanismo de smoke-test de emails, moverlo a un script de test (`tests/integration/email.test.js`) o a una tarea de CI, nunca a una ruta HTTP de la app.

## ✅ Issue 4 — Webhook de Mercado Pago sin verificación de firma (RESUELTO)

`POST /api/pagos/webhook` no validaba el header `x-signature` que envía Mercado Pago. El código sí re-consultaba el pago real vía API oficial usando `MP_ACCESS_TOKEN` (por lo que un atacante no podía falsificar el estado de un pago), pero cualquiera podía invocar el endpoint con un `payment.id` válido de la cuenta y forzar que el backend reprocesara esa notificación fuera de orden, o usar el endpoint para hacer scraping de qué IDs de pago existen.

**Corrección aplicada:**
1. `services/mercadopago.js` exporta `verificarFirmaWebhook(dataId, xSignature, xRequestId)`, que calcula el HMAC-SHA256 documentado por Mercado Pago (`manifest = id:{dataId};request-id:{xRequestId};ts:{ts};`) usando `MP_WEBHOOK_SECRET` y lo compara con `timingSafeEqual`.
2. `controllers/pago.js` (`postWebhook`) llama a esa verificación antes de procesar; si la firma no es válida, responde `200 OK` sin procesar (para no revelar el motivo del rechazo ni darle pie a MP a reintentar indefinidamente).
3. Se agregó un rate limiter dedicado a `/api/pagos/webhook` (100 req/15min) en `routes/pago.js`, además del límite global.
4. Se agregaron tests unitarios (`tests/unit/services/mercadopago.test.js`) cubriendo firma válida, inválida, headers faltantes y el modo de compatibilidad.

**Pendiente de configuración (no es código):** hay que dar de alta `MP_WEBHOOK_SECRET` en Render con el secret que figura en el panel de integraciones de Mercado Pago. **Mientras esa variable no esté configurada, la verificación se omite** (se loguea un warning) para no romper el webhook en producción — es decir, esta corrección sólo queda activa una vez que se configure la variable de entorno.

## ✅ Issue 5 — Race condition en la verificación de capacidad de turnos (RESUELTO)

`services/turno.js` (`crearTurno` y `cambiarHorario`) hacía `countDocuments()`/`findOne()` para chequear si un slot estaba lleno, y luego `save()`/`findByIdAndUpdate()` en una operación separada, sin atomicidad ni lock entre ambos pasos.

**Corrección aplicada — y por qué una transacción simple no alcanzaba:**
El primer intento envolvió el conteo + la escritura en una transacción de Mongoose (`session.withTransaction`). Un test de integración con `Promise.allSettled` disparando dos `crearTurno` concurrentes para el mismo slot detectó que **esto no era suficiente**: MongoDB sólo aborta una transacción cuando dos transacciones escriben sobre el *mismo documento*; como cada `crearTurno` inserta un `Turno` con `_id` distinto, no hay conflicto real y ambas transacciones commitean igual (overbooking silencioso, sin ningún error).

La corrección final agrega un documento de lock por slot (`models/SlotLock.js`, índice único en `slotKey = "{fecha}_{horaInicio}"`). Dentro de la transacción, antes de contar, se hace `SlotLock.findOneAndUpdate({slotKey}, {$inc:{version:1}}, {upsert:true, session})` — esto sí escribe sobre el mismo documento para ambas transacciones concurrentes del mismo slot, lo que genera un conflicto real que MongoDB resuelve abortando una de las dos; `session.withTransaction` la reintenta automáticamente, y al reintentar ve el conteo ya actualizado por la transacción ganadora.

Aplicado en `crearTurno` y `cambiarHorario`. Test de integración (`tests/integration/services/turno.service.test.js`, *"evita overbooking cuando dos requests concurrentes reservan el mismo slot"*) verificado estable en corridas repetidas.

**Requisito de infraestructura:** las transacciones de Mongoose requieren que MongoDB corra como replica set (incluso de un solo nodo). MongoDB Atlas (M0 en adelante) ya lo es por defecto, así que no requiere cambios en producción. El entorno de test (`tests/setup/db.js`) se migró de `MongoMemoryServer` a `MongoMemoryReplSet` para poder ejercitar transacciones — agrega ~0.7s de arranque por proceso de test, no por test individual.

## ✅ Issue 6 — Subida de archivos sin restricción de tipo ni tamaño (RESUELTO)

`middlewares/upload.js` configuraba Multer con `multer({ storage: multer.memoryStorage() })`, sin `fileFilter` ni `limits`. Cualquier usuario autenticado podía subir un archivo de cualquier tipo y tamaño.

**Corrección aplicada** (`middlewares/upload.js`):
1. `limits: { fileSize: 5 * 1024 * 1024 }` (5MB) agregado a la config de Multer.
2. `fileFilter` que sólo acepta `image/jpeg`, `image/png`, `image/webp`.
3. Nuevo middleware `manejarErrorUpload` (firma de 4 argumentos `(err, req, res, next)`) montado inmediatamente después de cada `upload.single("img")` en `routes/turno.js`, `routes/Producto.js` y `routes/pack.js`, que traduce `MulterError`/errores del `fileFilter` a `400 { msg }` en vez de dejar que Express los propague como 500 genérico (sin handler, antes no había ninguno).
4. Tests e2e agregados en `tests/e2e/turno.routes.test.js` (`POST /api/turnos/:id/subir-comprobante`) cubriendo archivo de tipo no permitido y archivo que excede el límite de tamaño.

## 🟡 Issue 7 — Vulnerabilidades reportadas por `npm audit` (PARCIALMENTE RESUELTO)

Al instalar `node_modules` por primera vez en este entorno, `npm audit` reportó 36 vulnerabilidades (27 moderadas, 7 altas, 2 bajas) en dependencias transitivas.

**Corrección aplicada:** `npm audit fix` (sin `--force`) bajó el conteo a 21 (20 moderadas, 1 alta), sin cambios de versión mayor y sin romper ningún test (287/287 verdes después).

**Lo que queda pendiente, deliberadamente sin forzar:**
- `mercadopago` (moderate, vía `uuid`) y `nodemailer` (high) sólo tienen fix disponible vía `npm audit fix --force`, que instalaría `mercadopago@3.1.0` (actual: `^2.12.0`) y `nodemailer@9.0.1` — ambos son bumps de versión mayor sobre paquetes que tocan **pagos en producción** y **envío de emails**. No se forzaron porque no hay forma de probarlos contra el sandbox real de Mercado Pago ni contra el envío real de emails desde este entorno. **Antes de actualizar:** revisar el changelog de breaking changes de ambos paquetes y probar un pago de prueba end-to-end en sandbox de MP tras el bump.
- El resto de las vulnerabilidades restantes son una cadena de dependencias internas de **Jest** (`jest-snapshot`, `babel-plugin-istanbul`, `js-yaml`, `brace-expansion`, etc., todas `devDependencies`, no se despliegan a producción). `npm audit` sugiere "arreglarlas" bajando a `jest@25.0.0`, lo cual sería un **downgrade** de la versión actual (`^30.3.0`) y probablemente rompería la suite — no se debe aplicar esa sugerencia literalmente.

**Seguimiento:** agregar `npm audit --audit-level=high` como paso en un pipeline de CI (ver Issue 9) para detectar nuevas vulnerabilidades a futuro sin tener que correrlo manualmente.

## ✅ Issue 8 — `console.log`/`console.error` en lugar del logger (RESUELTO)

`services/mercadopago.js`, `routes/turno.js`, `routes/Producto.js`, `controllers/pago.js` y `middlewares/validar-jwt.js` usaban `console.*` directamente en vez de `helpers/logger.js` (Winston).

**Corrección aplicada:** todos los `console.log`/`console.error` de esos archivos se reemplazaron por `logger.info`/`logger.error` con metadata estructurada (objeto en vez de concatenar strings), consistente con el resto del código. No queda ningún `console.*` fuera de `docs/` en el código fuente (verificado con búsqueda global). Suite completa verde después del cambio.

**Seguimiento sugerido:** agregar una regla de ESLint (`no-console`) una vez exista linting (Issue 11), para prevenir regresiones.

## 🟡 Issue 9 — Sin CI/CD ni Dockerfile

No hay `.github/workflows` ni Dockerfile. El despliegue depende de push directo a la rama conectada en Render, sin que tests/lint corran automáticamente antes de cada deploy.

**Cómo atacarlo:**
1. Agregar un workflow de GitHub Actions mínimo: `npm ci` → `npm test` → `npm audit --audit-level=high` en cada PR contra `main`.
2. Opcional: Dockerfile simple si en algún momento se quiere desacoplar del PaaS de Render o reproducir el entorno localmente de forma idéntica a producción.

## 🟡 Issue 10 — Sin sanitización de texto libre almacenado (riesgo de XSS reflejado en el frontend)

Campos como `nombreProducto`, `descripcion`, `motivoCancelacion`, `motivoRechazo`, `motivo` (de `Bloqueo`) sólo se validan en longitud, no se sanitizan ni escapan. Si el frontend los renderiza sin escapar (por ejemplo, en el panel de admin), un usuario podría inyectar HTML/JS en un campo de texto libre y lograr XSS almacenado al ser visto por un administrador.

**Cómo atacarlo:**
1. Confirmar con el equipo de frontend si los campos de texto libre se renderizan con `dangerouslySetInnerHTML` o equivalente — si siempre van por `textContent`/JSX plano, el riesgo ya está mitigado del lado cliente y esto baja a prioridad informativa.
2. Si no hay esa garantía, sanitizar en el backend con algo como `sanitize-html` antes de persistir, o al menos escapar al servir.

## 🟢 Issue 11 — Sin ESLint/Prettier

No hay enforcement automático de estilo ni reglas de calidad (`no-unused-vars`, `no-console`, etc.).

**Cómo atacarlo:**
1. Agregar ESLint con un preset razonable (`eslint:recommended` + plugin de Node) y Prettier para formateo.
2. Integrar como paso del CI (Issue 9) en modo `--max-warnings=0` para nuevas PRs, sin bloquear retroactivamente el código existente (usar `.eslintignore` o un baseline si hace falta).

## 🟢 Issue 12 — Cobertura de tests incompleta en integraciones externas

No hay tests de: webhook de Mercado Pago, envío real de emails (Resend/Nodemailer), subida a Cloudinary.

**Cómo atacarlo:**
1. Mockear los SDKs externos (`mercadopago`, `resend`, `cloudinary`) en tests de integración para cubrir los flujos de `procesarWebhook`, `subirComprobante` y los emails disparados en cada transición de estado.
2. Priorizar el test de `procesarWebhook` con distintos `payment.status` (`approved`, `rejected`, `pending`) ya que es el punto de entrada público sin JWT.
