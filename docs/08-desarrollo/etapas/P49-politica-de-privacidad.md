# P49 La política de privacidad — especificación

- **Pedido:** 49 (`03-cierre-comercial/registro-de-cambios.md`), aprobado el 13/11/2026, **incluido** (sin costo).
- **Historias:** HU-08 (textos del sitio), HU-16 (formulario de reclamo) y HU-18 (Google).
- **Base:** el borrador `10-lanzamiento/politica-de-privacidad.md`.
- **Estado:** hecho el 13/11/2026 (PR #229). Falta que el dueño revise el texto en el panel.

## 1. Objetivo

El sitio tiene una página **Política de privacidad**. Dice qué datos guarda el taller, para qué, quién los ve, cuánto tiempo, qué cookies hay y cómo pedir que se corrijan o se borren. El dueño la edita desde el panel, como el resto de los textos.

## 2. Alcance

- **Incluye:**
  - La página `/privacidad`.
  - Su texto en Sitio web > Textos, con una tarjeta "Privacidad" en Sitio web.
  - El enlace "Política de privacidad" en el pie.
  - Una línea con el enlace en el formulario de reclamos.
  - La página en el `sitemap.xml`.
- **No incluye:**
  - Banner de cookies ni términos y condiciones: no hacen falta, porque el sitio no tiene analítica ni vende en línea.
  - Un botón para que el visitante borre sus datos: lo pide por WhatsApp o por correo.

## 3. Reglas

- **Todo se configura desde el panel** (CLAUDE.md):
  - **El texto:** es editable.
  - **Los datos del negocio:** nombre, dirección, WhatsApp y correo no se escriben a mano en el texto. Van como campos entre llaves, `{negocio}`, `{direccion}`, `{whatsapp}` y `{correo}`, que el sitio completa con Configuración > Negocio. Así no quedan desactualizados.
- **Lo que quedaba por decidir en el borrador** va con un valor inicial que el dueño puede cambiar:
  - **Tiempo de guardado:** 5 años los datos de clientes y trabajos, y 2 los reclamos.
  - **Plazo para responder:** 10 días hábiles.
  - **Proveedor del servidor:** Hetzner (`07-preparacion/servidor.md`).
  - **Fotos de la galería:** "no se ve la placa ni a nadie", que es lo que ya pide marcar el paso Publicar de la orden.
- **"Última actualización":** sale de cuándo se guardó el texto por última vez (`contenido_pagina.updated_at`), en hora de Bolivia.

## 4. Datos

- Migración `0047_datos_privacidad`: la fila `privacidad` en `contenido_pagina`, con el texto inicial y sin pisar lo existente. No hay tablas ni columnas nuevas.

## 5. Pantallas

- **`/privacidad` (sitio):** el título, la fecha de actualización y una sección por campo, cada una con su título fijo. En cada sección:
  - un renglón vacío separa párrafos;
  - las líneas que empiezan con "- " forman una lista.
- **Pie:** "Política de privacidad", después de "Garantía y reclamos". No va en el menú del celular: es una página de consulta, no de navegación.
- **Formulario de reclamo:** encima de "Enviar reclamo", "Usamos tus datos solo para responder tu reclamo. Política de privacidad.", con el enlace.
- **Panel:** la tarjeta "Privacidad" en Sitio web lleva a Textos (`?pagina=privacidad`). En la ayuda de cada campo se explican los campos entre llaves.

## 6. Pruebas

- **Unitarias:**
  - `conDatosDelNegocio`: los campos entre llaves se completan, y uno que falta en Configuración queda sin texto.
  - `bloquesDeTexto`: párrafos y listas.
- **E2E:**
  - La página se ve con sus secciones y los datos del negocio ya completados.
  - El pie y el formulario de reclamo llevan a ella.
  - El dueño cambia un texto en el panel y el sitio lo muestra.
  - Está en el `sitemap.xml`.
