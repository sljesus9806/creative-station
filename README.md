# Creative Station — sitio web

Sitio de **papelería creativa** con catálogo, pedidos por WhatsApp, cotizaciones personalizadas y panel de administración.

El mismo código funciona de dos formas:

| | **GitHub Pages (gratis, para pruebas)** | **Con servidor (Node)** |
|---|---|---|
| Catálogo, producto, "Mi pedido", cotizar | ✅ | ✅ |
| Pedidos y cotizaciones | Llegan directo a WhatsApp | Se guardan en el panel con folio y van a WhatsApp |
| Fotos de referencia en la cotización | Se mandan por WhatsApp | Se suben desde el formulario |
| Panel `/admin` | Productos, categorías y ajustes (guarda en GitHub) | Todo, incluida la bandeja de pedidos y cotizaciones |
| Hosting | GitHub Pages | VPS, Railway, Render con disco… |

## Versión GitHub Pages (gratis)

Los productos, categorías y ajustes viven en `content/catalogo.json` y las fotos en `content/uploads/`.
En cada push a `main`, GitHub Actions (`.github/workflows/pages.yml`) corre `scripts/build-static.js` y publica el sitio.

**Activarla (una sola vez):**
1. El repositorio debe ser **público**; Pages gratis no funciona con repos privados. Se cambia en *Settings → General → Danger Zone → Change visibility*.
2. *Settings → Pages → Build and deployment → Source*: elige **GitHub Actions**.
3. *Actions* → **Publicar en GitHub Pages** → *Run workflow*, o haz cualquier push.
4. El sitio queda en `https://USUARIO.github.io/creative-station/` y el panel en `…/creative-station/admin/`.

**Entrar al panel:** crea un token en https://github.com/settings/personal-access-tokens/new con
*Repository access → Only select repositories → creative-station* y *Permissions → Contents → Read and write*.
Pégalo en el panel; se guarda solo en ese navegador. Cada cambio es un commit y el sitio se actualiza en 1–2 minutos.

**Probar en tu computadora:**

```bash
BASE_PATH=/creative-station node scripts/build-static.js
```

Esto genera `_site/`. Para verlo tal cual, sírvelo de forma que `/creative-station/` apunte a esa carpeta.

---

## Versión con servidor

- **Público:** inicio, catálogo con categorías, ocasiones y búsqueda, ficha de producto con personalización, "Mi pedido" (carrito que se envía por WhatsApp) y formulario de cotización con fotos de referencia.
- **Panel (`/admin`):** productos (fotos, precio opcional, personalización, destacados, duplicar), categorías, bandeja de cotizaciones y pedidos con estados y notas, y ajustes (WhatsApp, anuncio, promo, pasos y preguntas frecuentes).

## Requisitos

- Node.js **22.13 o más reciente** (usa la base de datos SQLite que ya trae Node; no hay que instalar nada más).

## Arrancar en tu computadora

```bash
npm install
cp .env.example .env      # y cambia ADMIN_PASSWORD
npm start
```

Abre http://localhost:3000 y el panel en http://localhost:3000/admin.

> Si no defines `ADMIN_PASSWORD`, la primera vez se genera una contraseña temporal y se muestra en la consola.
> Para cambiarla después: Panel → Ajustes, o `npm run reset-password -- "NuevaContraseña"`.

## Variables de entorno

| Variable | Para qué sirve | Por defecto |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `ADMIN_PASSWORD` | Contraseña inicial del panel (solo la primera vez) | se genera una |
| `DATA_DIR` | Carpeta de la base de datos **y de las fotos subidas** | `./data` |

## Publicarlo (hosting)

El sitio guarda la base de datos y las fotos en `DATA_DIR`, así que el hosting necesita **disco persistente**:

- **VPS** (Hostinger, DigitalOcean, etc.): `npm install && npm start` detrás de Nginx con HTTPS. Usa `pm2` o `systemd` para que siga corriendo.
- **Railway / Render / Fly.io:** crea un volumen persistente, móntalo (por ejemplo en `/data`) y define `DATA_DIR=/data`.
- **No uses** hosting sin disco persistente (como Vercel o Netlify): se borrarían los productos y las fotos.

**Respaldo:** copia la carpeta `DATA_DIR` completa (tiene `creative-station.db` y `uploads/`).

## Cómo funciona un pedido

1. La clienta personaliza un producto y lo agrega a **Mi pedido**. El carrito se guarda en su navegador.
2. Llena sus datos y toca **Enviar pedido por WhatsApp**: se guarda en el panel con folio (`CS-P-0001`) y se abre WhatsApp con el resumen listo para enviar.
3. Las cotizaciones (`CS-C-0001`) se guardan con sus fotos de referencia y también ofrecen enviar el resumen por WhatsApp.
4. En el panel cambias el estado (nuevo → confirmado → en producción → listo → entregado) y respondes con un botón de WhatsApp.

## Contenido inicial

La primera vez se cargan **8 categorías y 15 productos** con fotos de trabajos reales (`public/img/seed/`).
**No tienen precio**: se muestran como "Precio según diseño" hasta que pongas precios en el panel.
Las fotos que salieron de capturas de Instagram son de baja resolución; conviene reemplazarlas por las originales.

## Estructura

```
server.js              rutas del sitio, API de pedidos y panel
src/db.js              base de datos, ajustes por defecto y contenido inicial
src/auth.js            sesión del panel, contraseña y límites de intentos
src/views/             plantillas HTML (público, panel, íconos)
public/css, public/js  estilos e interacción (sin frameworks)
public/img/brand       logos en sus colores y favicon
```
