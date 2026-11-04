# Creative Station ✂️

Sitio de **Creative Station**, papelería creativa en Mazatlán, Sinaloa, con envíos a todo México: toppers, stickers, sobre platos, vasos y detalles personalizados.

Es un sitio estático (HTML + CSS + JS, sin build) publicado gratis en **GitHub Pages**. Usa **Supabase** (plan gratis) como base de datos, para las fotos y para el inicio de sesión del panel.

## Qué hace

**Sitio** (`index.html`, `catalogo.html`, `producto.html`, `pedido.html`, `cotizar.html`)
- Diseño girly: lavanda y amarillo del logo, con acentos blush y cereza, moños, bordes ondulados como sus toppers y rayas mantequilla
- Catálogo por categoría, ocasión (XV años, bodas, graduación…) y búsqueda
- Cada producto pide sus datos de personalización (nombre, edad, temática, colores, foto…)
- **Mi pedido**: la clienta arma su pedido, llena nombre, WhatsApp, ciudad y fecha, y se abre **WhatsApp al 669 166 9855** con el pedido ya escrito y su folio (`CS-P-0001`). El pedido también queda guardado en el panel.
- **Cotizar**: formulario para diseños personalizados con hasta 3 fotos de referencia. Folio `CS-C-0001`, se guarda en el panel y se manda por WhatsApp.

**Panel** (`admin.html`)
- Entrada con correo y contraseña (y "¿olvidaste tu contraseña?")
- **Cotizaciones** y **pedidos**: estados, notas internas y botón para responderle a la clienta por WhatsApp
- **Productos**: fotos (se reducen solas), precio opcional ("Desde $…" o "Precio según diseño"), datos que se piden para personalizar, ocasiones, destacar en inicio, ocultar, duplicar y "solo cotización"
- **Categorías** con imagen y orden
- **Ajustes**: WhatsApp, barra de anuncio ("Agenda de DICIEMBRE abierta"), promoción, pasos y preguntas frecuentes

## Cómo funciona

```
 Clienta ──► Sitio (GitHub Pages, gratis) ──► WhatsApp de Creative Station
                     │
                     ▼
              Supabase (gratis)
              · productos, categorías y ajustes
              · pedidos y cotizaciones
              · fotos
                     ▲
                     │
 Dueña  ──► Panel (admin.html)
```

Los precios de cada pedido los toma la base de datos, así que nadie puede mandar precios inventados. Solo los correos de la tabla `admins` pueden entrar al panel.

Mientras `js/config.js` no tenga los datos de Supabase, el sitio funciona en **modo demo**: muestra el catálogo de ejemplo y los pedidos y cotizaciones se mandan solo por WhatsApp.

---

## Puesta en marcha (una sola vez, ~15 minutos)

### 1. Publicar el sitio (GitHub Pages, gratis)
1. El repositorio debe ser **público**.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save**.
3. En uno o dos minutos el sitio queda en `https://sljesus9806.github.io/creative-station/` (en modo demo hasta hacer el paso 2).

### 2. Crear la base de datos en Supabase
1. Entra a [supabase.com](https://supabase.com) y crea un **New project** (el plan gratis permite 2 proyectos).
   - Nombre: `creative-station`. Región: la más cercana (por ejemplo *West US*). Guarda la contraseña de la base de datos.
2. Ve a **SQL Editor → New query**, pega todo [`supabase/schema.sql`](supabase/schema.sql) y dale **Run**.
3. En otra query pega [`supabase/seed.sql`](supabase/seed.sql) y dale **Run**. Así se cargan las 8 categorías, los 15 productos de ejemplo y los textos del sitio.

### 3. Crear la cuenta de la dueña
1. **Authentication → Users → Add user → Create new user**: su correo, una contraseña y marca **Auto Confirm User**.
2. En **SQL Editor** corre (con su correo):
   ```sql
   insert into public.admins (email) values ('correo-de-ella@gmail.com');
   ```
3. En **Authentication → Sign In / Providers**, apaga **Allow new users to sign up**.

### 4. Conectar el sitio
1. Copia la **Project URL** y la **publishable key** (**Project Settings → API Keys**, empieza con `sb_publishable_`).
2. Pégalas en [`js/config.js`](js/config.js), haz commit y push:
   ```js
   SUPABASE_URL: "https://xxxxxxxx.supabase.co",
   SUPABASE_KEY: "sb_publishable_xxxxxxxx",
   ```
   Esta llave es pública a propósito: lo que protege los datos son las reglas de `schema.sql`.
3. Para que funcione "¿olvidaste tu contraseña?", en Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://sljesus9806.github.io/creative-station/`
   - **Redirect URLs**: agrega `https://sljesus9806.github.io/creative-station/admin.html`

¡Listo! El panel queda en `https://sljesus9806.github.io/creative-station/admin.html`. ✨

---

## Uso diario (para la dueña)

- **Cotizaciones y pedidos**: entra al panel. En *Inicio* ves cuántos hay nuevos. Abre uno, toca **Responder por WhatsApp**, y cambia el estado (en proceso, cotizada, confirmado, entregado…). Las notas internas solo las ves tú.
- **Agregar un producto**: *Productos → Nuevo producto*. Sube fotos (la primera es la portada), elige categoría, escribe el precio (o déjalo vacío si se cotiza) y marca qué datos le pedimos a la clienta.
- **Ocultar un producto**: botón **Ocultar** en la lista. **Duplicar** sirve para crear variantes rápido.
- **Anuncio y promo**: *Ajustes*. Escribe palabras entre `*asteriscos*` para resaltarlas en rosa en el título.

## Límites del plan gratis

- Supabase gratis incluye 500 MB de base de datos y 1 GB para fotos. Las fotos se reducen antes de subirse, así que caben miles.
- Supabase **pausa los proyectos gratis que pasan 7 días sin uso**. El workflow [`.github/workflows/supabase-keepalive.yml`](.github/workflows/supabase-keepalive.yml) hace una consulta cada 3 días para evitarlo.
  - Si algún día el sitio deja de cargar, entra a Supabase y dale **Restore project**. No se pierde nada.
  - GitHub apaga los workflows programados de repos sin actividad en 60 días. Si pasa, entra a **Actions** y dale **Enable workflow**.

## Probar en tu computadora

```bash
python3 -m http.server 8000
```

Abre <http://localhost:8000> (sitio) y <http://localhost:8000/admin.html> (panel).

> **Al cambiar CSS o JS:** sube el número `?v=...` de los `<link>` y `<script>` en los `.html` (por ejemplo, la fecha del día). GitHub Pages deja que los navegadores guarden esos archivos 10 minutos.

## Estructura

```
index.html, catalogo.html, producto.html,
pedido.html, cotizar.html, 404.html   Páginas del sitio (cada una carga js/app.js)
admin.html                            Panel
css/site.css, css/admin.css           Estilos (paleta, moños, bordes ondulados…)
img/brand/                            Logos y favicon
img/seed/                             Fotos de los productos de ejemplo
js/config.js                          ⚙️ Datos de Supabase
js/api.js                             Todo lo que lee/guarda en Supabase (o modo demo)
js/app.js                             Carga los datos y pinta cada página
js/interactions.js                    Menú, galería, "Mi pedido" y cotización
js/admin.js                           Panel (sesión, productos, categorías, bandeja, ajustes)
js/lib/                               Plantillas HTML, íconos, utilidades y compresión de fotos
js/demo-data.js                       Ajustes por defecto y catálogo de ejemplo
supabase/schema.sql                   Tablas, permisos, funciones y carpetas de fotos
supabase/seed.sql                     Contenido inicial
```

> La rama `version-servidor` guarda una versión alternativa con servidor propio (Node + SQLite), por si algún día se quiere un hosting de pago.
