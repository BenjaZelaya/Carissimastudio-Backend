# Guía de Configuración de Emails - Carissima Studio

## ✉️ Configuración de Envío de Emails con Gmail

Tu applicación ha sido actualizada para enviar correos automáticos cuando un usuario completa una reserva. Aquí está cómo configurarlo:

## 📋 Requisitos Previos

- Una cuenta de Gmail activa
- Acceso a la configuración de seguridad de Google

## 🔧 Pasos de Configuración

### 1. **Habilitar Contraseñas de Aplicación (App Passwords)**

Gmail requiere que uses una "Contraseña de Aplicación" en lugar de tu contraseña directa por razones de seguridad.

**Sigue estos pasos:**

1. Ve a [Google Account Security](https://myaccount.google.com/security)
2. En el menú izquierdo, selecciona **"Seguridad"** (Security)
3. Baja hasta encontrar **"Contraseñas de aplicación"** (App Passwords)
   - Si no ves esta opción, asegúrate de:
     - Tener habilitada la autenticación de dos factores (2FA)
     - Tu cuenta no sea una cuenta educativa o de trabajo
4. Selecciona **"Correo (Gmail)"** como aplicación y **"Windows"** (o tu SO)
5. Google te generará una contraseña de 16 caracteres
6. **Copia esta contraseña** (sin espacios)

### 2. **Actualizar el archivo `.env`**

En la carpeta `Carissimasudio-backend`, abre el archivo `.env` y actualiza estas variables:

```env
# ─── Email Configuration ──────────────────────────────────────────────────────
EMAIL_USER=julicarissima@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
ADMIN_EMAIL=julicarissima@gmail.com
```

**Donde:**
- `EMAIL_USER`: Tu dirección de Gmail
- `EMAIL_PASSWORD`: La contraseña de 16 caracteres que generaste (sin espacios)
- `ADMIN_EMAIL`: El email donde recibirás las notificaciones de nuevas reservas (puede ser el mismo u otro)

### 3. **Ejemplo Completo de `.env`**

```env
MONGO_URI=mongodb+srv://julicarissima_db_use:CarissimaStudio123@carissimastudio.k3nlkts.mongodb.net/reservas
PORT=5000
JWT_SECRET=carissima_secret_key_2024
CLOUDINARY_CLOUD_NAME=don6u5hsx
CLOUDINARY_API_KEY=754626879714111
CLOUDINARY_API_SECRET=IZKnSqOAb_dyOrsdomMvD4WeBxg

# ─── Email Configuration ──────────────────────────────────────────────────────
EMAIL_USER=julicarissima@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
ADMIN_EMAIL=julicarissima@gmail.com
```

## 📧 Qué Sucede Ahora

Cuando un usuario completa una reserva y carga el comprobante de pago:

### Email al Usuario
- Recibe un correo confirmando que su reserva fue recibida
- Contiene los detalles de su turno (fecha, hora, servicios, monto de seña)
- Lo informa que está pendiente de confirmación

### Email al Administrador
- Recibes una notificación en `julicarissima@gmail.com`
- Contiene los datos del cliente y detalles de la reserva
- Te indica que necesita ser confirmada desde el panel de administración

## 🧪 Prueba de Funcionamiento

1. Reinicia el servidor backend
2. Haz una reserva de prueba completando todos los pasos hasta cargar un comprobante
3. Revisa tu email (y la carpeta de spam/promotions si no aparece)

## ⚠️ Troubleshooting

### Los emails no se envían
1. Verifica que las credenciales en `.env` sean correctas
2. Revisa la carpeta de spam
3. Consulta los logs del servidor para mensajes de error
4. Asegúrate de tener habilitada la autenticación de 2 factores en Google

### Error: "Less secure app access"
- Accede a [Google My Account](https://myaccount.google.com)
- Las contraseñas de aplicación son más seguras que habilitar "Less secure app access"

### La contraseña de aplicación no funciona
- Asegúrate de copiarla sin espacios
- Prueba regenerarla desde Google Account Security

## 📝 Notas Importantes

- Las contraseñas de aplicación son específicas para Gmail/Google
- Si cambias tu contraseña de Google, tus App Passwords seguirán siendo válidas
- Nunca compartas tu `.env` en repositorios públicos

## ✅ Confirmación de Éxito

Si ves este mensaje en los logs del servidor:
```
Servicio de email listo para enviar mensajes
```

¡La configuración fue exitosa! ✨

---

**Necesitas ayuda?** Revisa los logs del servidor para mensajes de error específicos.
