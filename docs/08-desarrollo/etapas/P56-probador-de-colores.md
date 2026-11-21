# P56 Probador de colores en la página de un servicio — especificación

- **Fase y semana:** Cierre de la Entrega 2 · desde el 20/11/2026
- **Estado:** hecho (21/11/2026, PR #295 y #296)
- **Historias:** HU-07 (página del servicio en el sitio)
- **Base:** B3 (`B3-contenido.md`), B4 (`B4-sitio-publico.md`), registro de cambios, pedido 56

## 1. Objetivo
El taller ofrece el **repintado de aros**. El dueño pidió que su página tenga "algo interesante". En la página del servicio, un
**probador de colores** deja elegir el color del aro y verlo en un dibujo, y pedirlo por WhatsApp con el mensaje escrito.

Es general: cualquier servicio con colores cargados muestra el probador (el repintado de aros es el primero). El servicio
se crea desde el panel como cualquier otro (catálogo y página).

El dueño lo pidió dentro del precio: **Incluido** (se le olvidó mencionarlo al inicio).

## 2. Alcance
- **Incluye:**
  - Los colores de un servicio: nombre, color y acabado (mate, satinado o brillante), en orden. Se cargan en la ficha del
    servicio, en Sitio web → Servicios: "Más" → "Agregar probador de colores" la primera vez, después "Editar colores".
  - En la página pública del servicio, el probador, debajo de los beneficios y antes de "Cómo lo hacemos".
  - "Quiero este color" abre WhatsApp con "Hola, quiero repintar mis aros en bronce satinado." (el nombre del servicio, no
    "aros" fijo: "Hola, quiero el {servicio} en bronce satinado.").
- **No incluye:** fotos por color, precios por color (el sitio no muestra precios), ni otros dibujos que el aro.

## 3. Reglas que se cumplen
- Sin precios en el sitio.
- Todo configurable: los colores los carga el dueño; sin colores, el probador no aparece.
- Hasta 12 colores; nombre de 1 a 30 caracteres; color en `#rrggbb`.
- El dibujo es original (sin marcas): un aro deportivo de cinco pares de rayos rectos con volumen, neumático de perfil bajo
  y disco perforado (aprobado el 21/11; se probó una foto real teñida y no gustó). El único ángulo es 60° (la pasada de
  luz al cambiar de color).
- Solo los servicios que lo usan muestran la sección en el panel (21/11: aparecía en todos).
- Con "menos movimiento" del sistema, sin animación.

## 4. Datos
`servicio.colores` (`jsonb`, `[]` por defecto): `{ nombre, hex, acabado }[]`, como los beneficios y los pasos. Migración
`0055_probador_de_colores`. Se actualiza `modelo-de-datos.md`.

**Datos de inicio (21/11):** la migración `0056_datos_repintado_de_aros` agrega el servicio "Repintado de aros" a los
iniciales (como `0007_datos_servicios`): su resumen, la variante "Única" (D-2) y siete colores de partida (negro mate y
brillante, grafito, plata, bronce, dorado y blanco). Solo si no existe por su dirección o su nombre; sin precios. Los datos
de demostración (`datos-demo.mjs`) le suman beneficios, pasos y precios de ejemplo.

## 5. Pantallas
- **Panel, ficha del servicio (Sitio web → Servicios):** sin colores, la sección no está; "Más" ofrece "Agregar probador
  de colores", que abre el modal con un color para llenar. Con colores, la sección "Probador de colores" va después de
  "Cómo lo hacemos" y antes de "Opciones": cada color con su muestra, nombre y acabado, y "Editar colores". El modal tiene
  la lista (agregar, quitar y ordenar): un selector de color, el nombre y el acabado por fila (en el celular, el acabado
  abajo); "Guardar colores". Si se quitan todos, la sección vuelve a esconderse.
- **Sitio, página del servicio:** una sección más, sin caja (21/11: en un recuadro gris con la franja parecía pegada
  encima). El aro con una luz detrás y el canto del neumático más claro, que lo recortan del fondo negro aunque sea negro; en la computadora a la izquierda, en el
  celular arriba. Al lado o debajo: "Elige el color" con el estilo de "Cómo lo hacemos", "Toca un color y mira cómo
  quedan tus aros.", las muestras en círculos con su nombre y acabado (el elegido, con un anillo blanco; todas a la vista,
  cuatro por fila en el celular) y "Quiero este color" de contorno (el rojo principal es el de arriba). Debajo, "El tono final
  se confirma en el taller con una muestra.". Arranca con el primer color.

## 6. Acciones del servidor
`guardarParteServicio` con la parte `colores` (el mismo esquema en el formulario y en el servidor); renueva la página del
servicio en el sitio (`servicioCambiado`).

## 7. Componentes
- `FormularioColores` (`sitio/componentes/formulario-servicio.tsx`), con `EditorLista`.
- `ProbadorColores` (`componentes/sitio/probador-colores.tsx`, de cliente): el dibujo del aro en SVG, las muestras y el
  enlace de WhatsApp (`enlaceWhatsapp`).

## 8. Textos
"Probador de colores", "Agregar probador de colores", "Editar colores", "Guardar colores", "Colores guardados.", "Agregar
color", "Elige el color", "Color elegido", "Quiero este color", "El tono final se confirma en el
taller con una muestra.", "Mate", "Satinado", "Brillante".

## 9. Pruebas
- **Unitarias:** el esquema de colores (color válido, nombre, acabado, máximo) y el mensaje de WhatsApp.
- **De punta a punta:** sin colores, la ficha no muestra la sección; el dueño la agrega desde "Más" y carga dos colores; la página pública muestra el probador, elegir un color
  lo marca y "Quiero este color" lleva el mensaje con ese color; sin colores no aparece.

## 10. Orden de trabajo
Rama `p56-probador-de-colores`, sobre `develop` después del pedido 55 (PR #294). Un solo PR.

## 11. Criterio de salida
El dueño carga los colores sin ayuda; el probador se ve y se usa en el celular y la computadora, con teclado y lector de
pantalla; toda la suite pasa.

## 12. Decisiones abiertas
Ninguna.
