# Frontend Davi Motors

Interfaz React y Vite del sistema POS.

## Desarrollo local

Instala dependencias con `npm ci` e inicia el servidor con `npm run dev`.

## Vercel

Conecta este repositorio como proyecto Vite. El directorio raíz es el de este repositorio; el comando de compilación es `npm run build` y el directorio de salida es `dist`.

Configura `VITE_BACKEND_URL=https://davimotorsback.onrender.com` en Vercel, sin `/api`. El frontend también usa esa URL por defecto en builds de producción. Si se usa el editor de zonas de entrega, configura además `VITE_GOOGLE_MAPS_API_KEY` para el dominio nuevo. Las variables con prefijo `VITE_` son públicas en el navegador: no pongas allí secretos de MongoDB, Cloudinary ni correo.
