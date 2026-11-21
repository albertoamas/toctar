# P56 Probador de colores en la página de un servicio — especificación

- **Fase y semana:** Cierre de la Entrega 2 · desde el 20/11/2026
- **Estado:** en curso (programado el 20/11/2026)
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
    servicio, en Sitio web → Servicios, con "Editar colores".
  - En la página pública del servicio, el probador, debajo de los beneficios y antes de "Cómo lo hacemos".
  - "Quiero este color" abre WhatsApp con "Hola, quiero repintar mis aros en bronce satinado." (el nombre del servicio, no
    "aros" fijo: "Hola, quiero el {servicio} en bronce satinado.").
- **No incluye:** fotos por color, precios por color (el sitio no muestra precios), ni otros dibujos que el aro.

## 3. Reglas que se cumplen
- Sin precios en el sitio.
- Todo configurable: los colores los carga el dueño; sin colores, el probador no aparece.
- Hasta 12 colores; nombre de 1 a 30 caracteres; color en `#rrggbb`.
- El dibujo es original (sin marcas). El único ángulo es 60° (la pasada de luz al cambiar de color).
- Con "menos movimiento" del sistema, sin animación.

## 4. Datos
`servicio.colores` (`jsonb`, `[]` por defecto): `{ nombre, hex, acabado }[]`, como los beneficios y los pasos. Migración
`0055_probador_de_colores`. Se actualiza `modelo-de-datos.md`.

## 5. Pantallas
- **Panel, ficha del servicio (Sitio web → Servicios):** sección "Probador de colores", después de "Cómo lo hacemos" y
  antes de "Opciones". En lectura, cada color con su muestra, nombre y acabado; sin colores, "Sin colores: el probador no
  sale en el sitio.". "Editar colores" abre el modal con la lista (agregar, quitar y ordenar): un selector de color, el
  nombre y el acabado por fila; "Guardar colores".
- **Sitio, página del servicio:** un recuadro con la franja de 60°. A la izquierda, el aro; a la derecha, "Elige el color",
  el color elegido en grande con su acabado, las muestras (en el celular, deslizables) y "Quiero este color". Debajo, "El
  tono final se confirma en el taller con una muestra.". Arranca con el primer color.

## 6. Acciones del servidor
`guardarParteServicio` con la parte `colores` (el mismo esquema en el formulario y en el servidor); renueva la página del
servicio en el sitio (`servicioCambiado`).

## 7. Componentes
- `FormularioColores` (`sitio/componentes/formulario-servicio.tsx`), con `EditorLista`.
- `ProbadorColores` (`componentes/sitio/probador-colores.tsx`, de cliente): el dibujo del aro en SVG, las muestras y el
  enlace de WhatsApp (`enlaceWhatsapp`).

## 8. Textos
"Probador de colores", "Editar colores", "Guardar colores", "Colores guardados.", "Agregar color", "Sin colores: el
probador no sale en el sitio.", "Elige el color", "Color elegido", "Quiero este color", "El tono final se confirma en el
taller con una muestra.", "Mate", "Satinado", "Brillante".

## 9. Pruebas
- **Unitarias:** el esquema de colores (color válido, nombre, acabado, máximo) y el mensaje de WhatsApp.
- **De punta a punta:** el dueño carga dos colores en la ficha; la página pública muestra el probador, elegir un color
  lo marca y "Quiero este color" lleva el mensaje con ese color; sin colores no aparece.

## 10. Orden de trabajo
Rama `p56-probador-de-colores`, sobre `develop` después del pedido 55 (PR #294). Un solo PR.

## 11. Criterio de salida
El dueño carga los colores sin ayuda; el probador se ve y se usa en el celular y la computadora, con teclado y lector de
pantalla; toda la suite pasa.

## 12. Decisiones abiertas
Ninguna.
