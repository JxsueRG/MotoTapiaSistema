# WhatsApp API · Vercel (MOTO TAPIA recepción)

## Instalar
1. Sube el contenido de esta carpeta a tu repositorio de GitHub (reemplaza lo existente) o arrastra los archivos nuevos: api/_wa.js, api/webhook.js, api/enviar.js y public/index.html.
2. Vercel → Settings → Environment Variables:
   - WHATSAPP_TOKEN  (token permanente de Meta)
   - PHONE_NUMBER_ID
   - VERIFY_TOKEN    (una palabra que inventes)
   - WA_APP_SECRET   (App → Configuración → Básica)
3. Deployments → Redeploy.
4. Meta → WhatsApp → Configuración → Webhook: URL `https://TU-PROYECTO.vercel.app/api/webhook`, token = VERIFY_TOKEN, suscribe **messages**.
5. Plantillas activas en Meta: orden_recepcion_pdf, aviso_mecanico (y moto_lista si la creas; todavía no está conectada).

## Qué hace
- Orden → botón **Enviar PDF automático (API)**: genera el PDF (sin fotos), lo sube a Meta y lo manda con orden_recepcion_pdf.
- Mecánico: la función /api/enviar con tipo "mecanico" manda aviso_mecanico (el botón actual de wa.me sigue igual).
- Cliente escribe al número de la API → respuesta automática una vez cada 24 h.
- El número del cliente siempre sale de la orden guardada (no se acepta otro).

Nota: la app sigue sin contraseña; conviene agregarle un PIN.
