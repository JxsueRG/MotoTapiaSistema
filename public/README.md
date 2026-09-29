# MOTO TAPIA · Recepción digital de motos

Página + base de datos (Postgres) para recibir motos: datos del cliente, inventario,
fotos, firma digital, presupuesto, historial, PDF y envío por WhatsApp.

## Publicar en Vercel (10 minutos)

1. **Sube esta carpeta a GitHub** (repositorio nuevo, privado).
2. En https://vercel.com → **Add New → Project** → elige el repositorio → **Deploy**.
3. En tu proyecto de Vercel: **Storage → Create Database → Neon (Postgres)** → conéctalo al proyecto.
   Esto crea solo la variable `DATABASE_URL`. La tabla se crea sola la primera vez.
4. **Deployments → ⋯ → Redeploy** para que tome la variable de la base de datos.
6. Abre tu dirección `.vercel.app` en Safari del iPhone → Compartir → **Agregar a pantalla de inicio**.

## Cómo funciona
- `public/` → la aplicación (lo que ve el iPad/iPhone).
- `api/` → funciones que guardan y leen de la base de datos.

## Límites a tener en cuenta
- Vercel acepta hasta ~4.5 MB por guardado: unas 12 fotos por orden (se comprimen solas).
- **La app no tiene contraseña**: cualquiera con el enlace puede ver y guardar recepciones. Si más adelante quieres protegerla, se puede volver a agregar un PIN o un usuario/contraseña.
