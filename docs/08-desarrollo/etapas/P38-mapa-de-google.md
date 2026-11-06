# P38 La ubicación con la ficha de Google Maps — especificación

- **Fase y semana:** cierre de la Entrega 2 · semana 4 (05/11/2026)
- **Estado:** cerrada (05/11/2026, PR #143), con la maqueta de Contacto aprobada el mismo día
- **Historias:** HU-04 (datos del negocio), HU-14 (Contacto), HU-18 (datos para Google)
- **Base:** RF-09, RNF-02, `registro-de-cambios.md` (pedido 38), `10-lanzamiento/perfil-de-google.md`

## 1. Objetivo
Que "Cómo llegar" y el mapa de Contacto muestren **la ficha de TocTar en Google Maps** (nombre, estrellas, fotos, horario y el botón para llegar) y no un pin sin nombre. El dueño pega, una sola vez, lo que la misma ficha le da en **Compartir**.

## 2. Alcance
- **Incluye:**
  - En Configuración → Negocio, sección Ubicación, dos campos: el enlace de la ficha y el mapa para la página.
  - "Cómo llegar" y la dirección, en Contacto y en el pie, abren la ficha.
  - El mapa de Contacto muestra el de la ficha.
  - Los datos para Google (JSON-LD) enlazan la ficha.
- **No incluye:**
  - La clave de la API de Google ni el Place ID: no hacen falta.
  - Crear o corregir la ficha en Google, que lo hace el dueño (`perfil-de-google.md`).
  - El rediseño de la página Contacto, con la maqueta aprobada, y "Abierto ahora" (§5).

## 3. Reglas que se cumplen
- **Configurable desde el panel:** el enlace y el mapa los carga el dueño, no van en el código.
- **Sin datos, nada se rompe:** sin enlace ni mapa, todo funciona como hasta ahora, con las coordenadas o la dirección.
- **Seguridad:** del código que pega el dueño se guarda solo la dirección del mapa. Se guarda solo si es `https://www.google.com/maps/embed?pb=…`, y la página arma su propio `<iframe>`: nunca se inserta el HTML pegado. El enlace se acepta solo si es de Google Maps (`maps.app.goo.gl`, `goo.gl/maps` o `google.*/maps`) y por https. Los dos se validan con Zod en el servidor.
- **RNF-02:** el mapa sigue cargando recién al acercarse (`loading="lazy"`).

## 4. Datos
Migración `0044_mapa_google`, tabla `sucursal`:

| Columna | Tipo | Nulo | Para qué |
|---|---|---|---|
| `enlace_mapa` | text | sí | El enlace de la ficha (Compartir → Copiar vínculo) |
| `mapa_insertado` | text | sí | La dirección del mapa (el `src` de Compartir → Insertar un mapa) |

`lat` y `lng` siguen igual y se calculan solas: del enlace si trae el pin (`!3d…!4d…`), si no del mapa (`!2d…!3d…`), si no de las coordenadas escritas a mano. El enlace corto (`maps.app.goo.gl`) no trae coordenadas: con él se conservan las que ya estaban guardadas. Sin enlace ni mapa, se borran.

## 5. Pantallas y rutas
- **`/panel/configuracion/negocio`** (el dueño, con Configuración), sección **Ubicación**:
  - **Dirección**, como está.
  - **Enlace de Google Maps:** reemplaza a "Ubicación en el mapa". Acepta el enlace de Compartir, un enlace largo de Google Maps o las coordenadas solas. Si el enlace trae coordenadas, muestra "Ver en el mapa". Lo que estaba guardado se sigue viendo: el enlace o, si no hay, las coordenadas.
  - **Mapa para la página:** un cuadro de texto donde se pega el código de "Insertar un mapa".
- **`/contacto`** (maqueta aprobada el 05/11):
  - **Arriba:** el título, la bienvenida, **"Abierto ahora · cierra a las 18:00"** (o "Cerrado ahora · abre mañana a las 8:00") y "Pedir cotización".
  - **"Abierto ahora":** se calcula con el horario de Configuración y la hora de Bolivia. Si la semana no tiene ningún turno, no aparece.
  - **El mapa y la dirección, juntos:** el mapa de la ficha (sin ella, las coordenadas; sin coordenadas, no hay mapa) y, pegada abajo, "Dónde estamos" con "Cómo llegar" en blanco. En el celular va de borde a borde; en la computadora, a la derecha, y acompaña al bajar.
  - **Horario:** cada grupo de días en una fila, con el de hoy marcado con una barra roja y "Hoy".
  - **Garantía y correo:** filas que se tocan enteras. Las redes, botones con borde.
- **Pie del sitio:** "Cómo llegar" abre la ficha. Se muestra si hay enlace o coordenadas.

## 6. Acciones del servidor
`guardarNegocio` (ya existe; exige Configuración). El esquema `esquemaNegocio` cambia `ubicacion` por:
- `enlaceMapa`: con `leerEnlaceMapa`. Devuelve el enlace (o `null` si se escribieron coordenadas) y sus coordenadas, si trae.
- `mapaInsertado`: con `leerMapaInsertado`. Devuelve la dirección del mapa y sus coordenadas.

Guarda `enlace_mapa`, `mapa_insertado`, `lat` y `lng` (§4) y renueva el caché de los datos públicos. Mensaje de éxito: "Cambios guardados." (como hoy).

## 7. Componentes y diseño
Los campos van con `Campo`, `Input` y `Textarea`, como el resto del formulario. Las funciones son puras, en `src/lib/ubicacion.ts`:
- `leerEnlaceMapa` y `leerMapaInsertado`, para leer lo que pega el dueño.
- `enlaceComoLlegar`, para "Cómo llegar".
- `mapaDeContacto`, para el mapa de Contacto.

## 8. Textos de la interfaz
- **Enlace de Google Maps**, ayuda: "En Google Maps, abre la ficha del taller y toca Compartir → Copiar vínculo. También sirven las coordenadas."
- **Mapa para la página**, ayuda: "En la ficha del taller: Compartir → Insertar un mapa → Copiar HTML. Si lo dejas vacío, el mapa muestra un pin en la ubicación del taller."
- **Error del enlace:** "Pega el enlace de Google Maps: en la ficha del taller, Compartir → Copiar vínculo."
- **Error del mapa:** "Pega el código de Google Maps: en la ficha del taller, Compartir → Insertar un mapa → Copiar HTML."

## 9. Pruebas
- **Unitarias** (`tests/unit/ubicacion.test.ts`):
  - "Abierto ahora": en un turno, al cerrar, al mediodía, de noche, el sábado a la tarde, el domingo, un solo día y sin turnos. El día de hoy en el horario y la hora de Bolivia.
  - Se aceptan el enlace corto, el largo con su pin y las coordenadas solas.
  - Se rechazan `javascript:`, http y otros sitios.
  - El código del mapa: se acepta el `<iframe>` completo o solo su dirección, se rechazan otros sitios, y salen sus coordenadas.
  - "Cómo llegar" y el mapa de Contacto en cada caso: con ficha, solo coordenadas y nada.
  - `hasMap` del JSON-LD.
- **E2E** (`hu-04`):
  - Se guardan el enlace y el mapa.
  - Contacto y el pie los usan.
  - Un mapa de otro sitio no se guarda y muestra el error junto al campo.
- **E2E** (`hu-13-14`): en Contacto, el mapa va con la dirección, aparece "Abierto ahora" o "Cerrado ahora", el día de hoy se marca y los enlaces tienen 44 px.

## 10. Orden de trabajo
Rama `pedido-38-mapa-google`, un PR: primero los datos, el panel y los enlaces; después Contacto, con su maqueta aprobada.

## 11. Criterio de salida
Con el enlace y el mapa de la ficha real pegados en pruebas, "Cómo llegar" abre la ficha de TocTar y el mapa de Contacto muestra su tarjeta.

## 12. Decisiones abiertas
- **Nombre de la ficha:** se llama "Toctar detailing tarija". La guía recomienda "TocTar Detailing", sin la ciudad, para que Google no la suspenda. Lo corrige el dueño en su perfil.
