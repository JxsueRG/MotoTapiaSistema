# MOTO TAPIA · Recepción digital de motos

Página + base de datos (Postgres) para recibir motos: datos del cliente, inventario,
fotos, firma digital, presupuesto, historial, PDF y envío por WhatsApp.

## Publicar en Vercel (10 minutos)

1. **Sube esta carpeta a GitHub** (repositorio nuevo, privado).
2. En https://vercel.com → **Add New → Project** → elige el repositorio → **Deploy**.
3. En tu proyecto de Vercel: **Storage → Create Database → Neon (Postgres)** → conéctalo al proyecto.
   Esto crea solo la variable `DATABASE_URL`. La tabla se crea sola la primera vez.
4. **Settings → Environment Variables** → agrega `APP_PIN` con el PIN que usará tu equipo (ej. `4821`).
5. **Deployments → ⋯ → Redeploy** para que tome las variables.
6. Abre tu dirección `.vercel.app` en Safari del iPhone → Compartir → **Agregar a pantalla de inicio**.

## Cómo funciona
- `public/` → la aplicación (lo que ve el iPhone).
- `api/` → funciones que guardan y leen de la base de datos, protegidas con el PIN.
- Para cambiar el PIN: cambia `APP_PIN` en Vercel y haz Redeploy.

## Límites a tener en cuenta
- Vercel acepta hasta ~4.5 MB por guardado: unas 12 fotos por orden (se comprimen solas).
- El PIN protege el acceso, pero es una seguridad básica. No pongas aquí datos bancarios.
