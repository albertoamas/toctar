# P48 El video de "Mira cómo trabajamos" — especificación

- **Pedido:** 48 (`03-cierre-comercial/registro-de-cambios.md`), aprobado el 12/11/2026, **sin costo** (incluido; RNF-07 ya preveía videos con tamaño máximo).
- **Historias:** HU-08 (textos y fotos del sitio) y HU-10 (portada).
- **Base:** pedido 35 (TikTok casi tan importante como WhatsApp) y pulido 13.53 ("Mira cómo trabajamos").
- **Estado:** hecho el 12/11/2026 (PR #220). Falta probarlo con un video real del dueño en pruebas.

## 1. Objetivo

En la portada, "Mira cómo trabajamos" mostraba una foto de la galería dentro de un celular dibujado, con un botón de reproducir que no reproducía nada. El dueño quiere **subir un video corto** (el mismo que publica en TikTok) y que se vea **moviéndose** en la portada. Revisión del 12/11: sin el marco de celular, y sin video no se muestra nada en su lugar (ni la foto de la galería).

## 2. Alcance

- **Incluye:**
  - En Sitio web > Textos > Portada, "Video de TikTok": subirlo, verlo, cambiarlo y quitarlo. Es opcional.
  - En la portada, el video vertical al lado del texto (debajo en el celular), sin marco. Se reproduce solo, sin sonido y en bucle, mientras está a la vista.
- **No incluye:**
  - Convertir, recortar o comprimir el video en el servidor: la imagen de Docker no lleva ffmpeg. El dueño sube el MP4 que ya tiene (TikTok y CapCut lo guardan así).
  - Sonido.
  - Más de un video.
  - Videos en otras páginas.

## 3. Reglas que se cumplen

- **Todo se configura desde el panel** (CLAUDE.md): el video lo sube el dueño. Sin video no se muestra nada en su lugar: el bloque queda con su texto y "Ver en TikTok".
- **Tamaño máximo de un video** (RNF-07): **20 MB**. Se comprueba en el servidor contando los bytes que llegan, no con lo que dice el navegador. La ayuda pide un video de hasta 30 segundos. La duración no se verifica en el servidor (no hay ffmpeg); el tope de bytes es el que cuenta.
- **El archivo es de verdad un video que se ve en todos lados** (`revisarVideo`, `src/lib/formato-videos.ts`). El servidor mira qué es por dentro, no lo que dice el navegador:
  - **MP4 o MOV:** sus cajas. Una `ftyp` con una marca de video (las de MP4 y la `qt  ` del MOV; no las de fotos HEIC o AVIF), o ninguna en un MOV viejo, y una `moov` con alguna pista de video (`hdlr` = `vide`) en **H.264** (`avc1` o `avc3` en su `stsd`).
  - **WebM:** `1A 45 DF A3` al inicio.

  Un MP4 o MOV con H.264 se guarda como `video/mp4` y `.mp4`: por dentro es el mismo formato, y así lo reproduce todo navegador.
- **El .MOV del iPhone** (revisión del 12/11): al elegir un video de la galería, también uno bajado de TikTok, el iPhone lo entrega como .MOV. En H.264 vale. En **HEVC** (`hvc1`, `hev1`, lo que graba la cámara del iPhone) se rechaza con su propio mensaje: Chrome en Windows y en muchos Android no lo reproduce. Un audio M4A tiene `ftyp` y `moov`, pero ninguna pista de video: se rechaza.
- **Solo quien ve Sitio web** (`exigirModulo("sitio")`) sube o quita el video.
- **Rendimiento (RNF-02) y datos del visitante:**
  - No se pide nada hasta que el video se acerca a la pantalla (a 300 px): recién ahí se le pone su archivo, y se pide lo justo para el primer cuadro (`preload="metadata"`). Se reproduce al entrar en pantalla.
  - Se pausa al salir de la pantalla.
  - Con "reducir movimiento" o con "ahorro de datos" del navegador no se reproduce solo: queda el primer cuadro con el botón de reproducir. Tocar el video abre TikTok.
- **Bucket público:** el video es contenido del sitio, como las fotos de la galería.

## 4. Datos

Migración `0046_video_de_portada`:

- `contenido_pagina.video_archivo_id integer null references archivo(id)`. Solo lo usa la fila `inicio`.
- El archivo se registra en `archivo`:
  - `clave`: `portada/video-<uuid>.mp4` o `.webm`;
  - `tipo_mime`: `video/mp4` o `video/webm`, según lo que es por dentro;
  - `bytes`;
  - `created_by`.

  Sin `ancho`, `alto` ni miniatura.
- Al reemplazarlo o quitarlo, el anterior se borra del almacenamiento y de `archivo`, igual que la foto de una página (`eliminarFoto`).

## 5. Pantallas y rutas

### Panel: Sitio web > Textos > Portada

Debajo de "Foto del taller", una fila compacta igual a la de la foto: "Video de TikTok".

- **Sin video:**
  - la guía en una línea: "Opcional. Se ve en "Mira cómo trabajamos", en la portada; sin video, ahí va solo el texto. MP4 o MOV de hasta 30 segundos y 20 MB.";
  - el botón "Subir video".
- **Con video:**
  - el video chico, sin sonido, con controles;
  - "Cambiar video" y "Quitar video".
- **Mientras sube:** una barra de avance con el porcentaje, y el botón deshabilitado. En un celular con datos, 20 MB tardan.
- **Sin TikTok cargado** en Configuración > Negocio: la fila igual se ve, con la línea "Se muestra cuando cargues el enlace de TikTok en Configuración > Negocio."

### Ruta `POST /panel/sitio/video`

Recibe el archivo crudo en el cuerpo (no un formulario).

1. `exigirModulo("sitio")`.
2. El origen del pedido es el mismo sitio (`Origin` igual a `Host`). Si no, 403.
3. `Content-Length` hasta 20 MB.
4. Se lee el cuerpo contando bytes y se corta al pasar el tope.
5. Se mira qué es por dentro (`revisarVideo`).
6. Se sube al bucket público, se registra en `archivo`, se pone en `contenido_pagina` (`inicio`) con la fila bloqueada y se borra el anterior.
7. `revalidateTag(ETIQUETA_CONTENIDO, { expire: 0 })` (como `updateTag`, que en una ruta no se puede usar) y `revalidatePath` de Textos.

Responde JSON: `{ ok: true, mensaje }` o `{ ok: false, mensaje }` con 400, 403 o 413. Va por ruta y no por server action porque las server actions tienen un tope de 6 MB para todo el sitio, y subirlo valdría también para los formularios públicos.

### Sitio: la portada

- Con video, en `.tt-video-tiktok` (vertical, 9:16, con la franja roja de las tarjetas):
  - `<video muted loop playsInline preload="metadata">`, con `#t=0.1` para que Safari dibuje el primer cuadro;
  - el botón de reproducir solo se ve mientras el video no se mueve;
  - tocarlo abre TikTok.
- Sin video, nada: el bloque usa todo el ancho para su texto.

## 6. Acciones del servidor

- `quitarVideoDePortada()`:
  - quién: `exigirModulo("sitio")`;
  - qué hace: pone `video_archivo_id` en null y borra el archivo;
  - mensaje: "Video quitado.".
- La subida es la ruta del §5:
  - mensaje de éxito: "Video guardado.".

## 7. Componentes y diseño

- `VideoDePortada` (panel, `src/modulos/sitio/componentes/video-portada.tsx`): la fila compacta.
  - Sube con `XMLHttpRequest` para mostrar el avance (`fetch` no informa el avance de una subida).
  - Usa los mismos botones y avisos que `SubidaFoto`.
- `VideoTikTok` (sitio, `src/componentes/sitio/video-tiktok.tsx`, cliente):
  - `IntersectionObserver` para reproducir y pausar;
  - respeta `prefers-reduced-motion` y `navigator.connection.saveData`.

## 8. Textos de la interfaz

- Título de la fila: "Video de TikTok".
- Guía: "Opcional. Se ve en "Mira cómo trabajamos", en la portada; sin video, ahí va solo el texto. MP4 o MOV de hasta 30 segundos y 20 MB."
- Botones: "Subir video", "Cambiar video", "Quitar video".
- Avance: "Subiendo el video: 45 %".
- Éxito: "Video guardado." y "Video quitado.".
- Errores:
  - "El video pesa más de 20 MB. Usa uno más corto o guárdalo en menor calidad."
  - "Ese archivo no es un video. Elige un MP4 o MOV, como el que se baja de TikTok."
  - "Ese video está en HEVC, el formato de la cámara del iPhone, y no se ve en todos los navegadores. Bájalo desde TikTok o, en el iPhone, elige Ajustes > Cámara > Formatos > Más compatible y grábalo de nuevo."
  - "No se pudo subir el video. Revisa la conexión y vuelve a intentar."
  - "Tu sesión terminó. Vuelve a ingresar."

## 9. Pruebas

- **Unitarias:** `revisarVideo(bytes)`, con videos de prueba armados caja por caja (`tests/videos-de-prueba.ts`):
  - MP4 y MOV del iPhone en H.264, y un MOV viejo sin `ftyp` → `video/mp4`;
  - WebM → `video/webm`;
  - HEVC → su mensaje;
  - fotos HEIC o AVIF, audio M4A, una `ftyp` sola, un texto, un archivo vacío o cajas rotas → no es un video.
- **E2E:**
  - El dueño sube un video en Textos > Portada, lo ve en el panel y la portada lo muestra. Al quitarlo no queda nada en su lugar.
  - Un archivo que no es video da su error.
  - Un video de más de 20 MB da su error sin subirse.
  - La ruta rechaza:
    - sin sesión;
    - un encargado sin el permiso Sitio web;
    - otro origen.

## 10. Orden de trabajo

Una rama, `pedido-48-video-tiktok`, sobre `pulido-portada` (el celular nace en el PR #219). Pasa a `develop` cuando se una el #219. Lleva una revisión de seguridad, porque es una ruta nueva que recibe archivos.

## 11. Criterio de salida

El dueño sube su video desde el celular y lo ve moverse en la portada, en el celular y en la computadora; con "reducir movimiento" el video queda quieto.

## 12. Decisiones abiertas

- Si el dueño sube videos verticales largos o pesados a menudo, más adelante se puede convertir en el servidor (con ffmpeg en la imagen, unos 80 MB más). Hoy no hace falta.
