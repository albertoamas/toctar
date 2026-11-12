# P48 El video de "Mira cómo trabajamos" — especificación

- **Pedido:** 48 (`03-cierre-comercial/registro-de-cambios.md`), aprobado el 12/11/2026, **sin costo** (incluido; RNF-07 ya preveía videos con tamaño máximo).
- **Historias:** HU-08 (textos y fotos del sitio) y HU-10 (portada).
- **Base:** pedido 35 (TikTok casi tan importante como WhatsApp) y pulido 13.53 (el celular de "Mira cómo trabajamos").
- **Estado:** en curso (rama `pedido-48-video-tiktok`).

## 1. Objetivo

En la portada, el celular de "Mira cómo trabajamos" muestra hoy una foto de la galería con un botón de reproducir que no reproduce nada. El dueño quiere **subir un video corto** (el mismo que publica en TikTok) y que se vea **moviéndose dentro del celular**.

## 2. Alcance

- **Incluye:**
  - En Sitio web > Textos > Portada, "Video de TikTok": subirlo, verlo, cambiarlo y quitarlo. Es opcional.
  - En la portada, el video dentro del celular. Se reproduce solo, sin sonido y en bucle, y solo carga cuando el celular se acerca a la pantalla.
- **No incluye:**
  - Convertir, recortar o comprimir el video en el servidor: la imagen de Docker no lleva ffmpeg. El dueño sube el MP4 que ya tiene (TikTok y CapCut lo guardan así).
  - Sonido.
  - Más de un video.
  - Videos en otras páginas.

## 3. Reglas que se cumplen

- **Todo se configura desde el panel** (CLAUDE.md): el video lo sube el dueño. Sin video, el celular muestra la foto de la galería, como ahora.
- **Tamaño máximo de un video** (RNF-07): **20 MB**. Se comprueba en el servidor contando los bytes que llegan, no con lo que dice el navegador. La ayuda pide un video de hasta 30 segundos. La duración no se verifica en el servidor (no hay ffmpeg); el tope de bytes es el que cuenta.
- **El archivo es de verdad un video:** el servidor mira la firma de los primeros bytes.
  - **MP4:** `ftyp` en los bytes 4 a 7.
  - **WebM:** `1A 45 DF A3` al inicio.

  Si no es ninguno, se rechaza, aunque el navegador diga `video/mp4`. Se guarda con el tipo que corresponde a su firma.
- **Solo quien ve Sitio web** (`exigirModulo("sitio")`) sube o quita el video.
- **Rendimiento (RNF-02) y datos del visitante:**
  - El video se pide recién cuando el celular está a la vista (`preload="none"` y se reproduce al entrar en pantalla).
  - Se pausa al salir de la pantalla.
  - Con "reducir movimiento" o con "ahorro de datos" del navegador no se reproduce solo: queda la foto con el botón. Tocar el celular abre TikTok, como sin video.
- **Bucket público:** el video es contenido del sitio, como las fotos de la galería.

## 4. Datos

Migración `0046_video_de_portada`:

- `contenido_pagina.video_archivo_id integer null references archivo(id)`. Solo lo usa la fila `inicio`.
- El archivo se registra en `archivo`:
  - `clave`: `portada/video-<uuid>.mp4` o `.webm`;
  - `tipo_mime`: según la firma;
  - `bytes`;
  - `created_by`.

  Sin `ancho`, `alto` ni miniatura.
- Al reemplazarlo o quitarlo, el anterior se borra del almacenamiento y de `archivo`, igual que la foto de una página (`eliminarFoto`).

## 5. Pantallas y rutas

### Panel: Sitio web > Textos > Portada

Debajo de "Foto del taller", una fila compacta igual a la de la foto: "Video de TikTok".

- **Sin video:**
  - la guía en una línea: "Opcional. Se ve dentro del celular de "Mira cómo trabajamos". MP4 de hasta 30 segundos y 20 MB.";
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
5. Se mira la firma.
6. Se sube al bucket público, se registra en `archivo`, se pone en `contenido_pagina` (`inicio`) con la fila bloqueada y se borra el anterior.
7. `revalidateTag(ETIQUETA_CONTENIDO, { expire: 0 })` (como `updateTag`, que en una ruta no se puede usar) y `revalidatePath` de Textos.

Responde JSON: `{ ok: true, mensaje }` o `{ ok: false, mensaje }` con 400, 403 o 413. Va por ruta y no por server action porque las server actions tienen un tope de 6 MB para todo el sitio, y subirlo valdría también para los formularios públicos.

### Sitio: la portada

- Dentro de `.tt-celular`, con video:
  - `<video muted loop playsInline preload="none" poster={foto de la galería}>`;
  - el botón de reproducir solo se ve mientras el video no se mueve.
- Sin video y sin foto de la galería, no hay celular, como ahora.
- Tocar el celular sigue abriendo TikTok.

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
- `VideoDelCelular` (sitio, `src/componentes/sitio/video-del-celular.tsx`, cliente):
  - `IntersectionObserver` para reproducir y pausar;
  - respeta `prefers-reduced-motion` y `navigator.connection.saveData`.

## 8. Textos de la interfaz

- Título de la fila: "Video de TikTok".
- Guía: "Opcional. Se ve dentro del celular de "Mira cómo trabajamos". MP4 de hasta 30 segundos y 20 MB."
- Botones: "Subir video", "Cambiar video", "Quitar video".
- Avance: "Subiendo el video: 45 %".
- Éxito: "Video guardado." y "Video quitado.".
- Errores:
  - "El video pesa más de 20 MB. Usa uno más corto o guárdalo en menor calidad."
  - "Ese archivo no es un video MP4 o WebM."
  - "No se pudo subir el video. Revisa la conexión y vuelve a intentar."
  - "Tu sesión terminó. Vuelve a ingresar."

## 9. Pruebas

- **Unitarias:** `tipoDeVideo(bytes)`:
  - MP4 con `ftyp` → `video/mp4`;
  - WebM → `video/webm`;
  - una foto, un texto o un archivo vacío → null.
- **E2E:**
  - El dueño sube un video en Textos > Portada, lo ve en el panel y la portada lo muestra dentro del celular. Al quitarlo vuelve la foto.
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
