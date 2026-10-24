# B3 Contenido del panel — especificación

- **Fase y semana:** B. Entrega 1 · semana 2 (21 al 27 de octubre; se adelanta desde el 14)
- **Estado:** programada (14 de octubre de 2026): HU-07 (#19), HU-08 (#20) y HU-09. Falta la revisión manual y la demo con B4
- **Cambió después:** el alta, el nombre y las variantes del servicio pasaron al catálogo (`/panel/catalogo/nuevo`); Sitio web edita solo la página pública. Se quitó la marca `construido` de los módulos (C5 §0, 24/10).
- **Historias:** HU-07 Servicios del sitio · HU-08 Textos del sitio · HU-09 Galería en el panel
- **Base:**
  - Requisitos: RF-10, RF-11, RF-12; RF-03 y RF-04 (los usa B4); RNF-02, RNF-11, RNF-14.
  - Reglas: RN-10 (sin precios ni testimonios en el sitio); D-2 (todo servicio tiene al menos una variante), D-6 (ocultar, no borrar lo que tiene historial), D-10 (archivos en `archivo`).
  - Modelo: `servicio`, `variante`, `contenido_pagina`, `faq`, `galeria_item`.
  - Material: servicios de la entrevista (`01-descubrimiento/entrevista.md`), historia y garantía (`material-recibido.md`), contenido del mantenimiento del cerámico.

## 1. Objetivo

El dueño (o un encargado con el módulo "Sitio web") carga desde el panel todo lo que muestra el sitio: servicios con sus variantes y su foto, los textos de portada, nosotros y contacto, las preguntas frecuentes y la galería de antes y después. Las páginas públicas que lo muestran se construyen en B4.

## 2. Alcance

**Incluye:**
- **Servicios (HU-07):**
  - Nombre, dirección de la página (slug), resumen, descripción, beneficios, pasos del proceso, foto principal y orden.
  - Mostrar u ocultar en el sitio.
  - Variantes con nombre y descripción, sin precios: por ejemplo, los años del cerámico.
- **Textos (HU-08):**
  - Portada: lema, presentación y, opcional, la foto del taller que va detrás del lema (agregada en el pulido 2.1, 18/10).
  - Nosotros: historia, cómo trabajamos y por qué elegirnos.
  - Contacto: texto de bienvenida.
  - Preguntas frecuentes: agregar, editar, ordenar y quitar.
- **Galería (HU-09):**
  - Subir un par antes y después, o una foto sola, asociado a un servicio y con una descripción corta.
  - Ordenar, ocultar y eliminar.
- **Fotos:**
  - En el navegador se achican antes de subir: el lado mayor a 2400 px, en JPEG.
  - En el servidor se guardan dos tamaños en WebP: el lado mayor a 1600 px y una miniatura de 640 px.
- **Módulo "Sitio web" construido:** el encargado puede recibir su casilla (HU-03).
- **Consultas en caché para B4:** con etiquetas `servicios`, `contenido` y `galeria`, invalidadas al guardar.
- **Datos iniciales:** los servicios de la entrevista, las variantes conocidas y borradores de textos y preguntas, para que el dueño los corrija.

**No incluye:**
- **Las páginas públicas** (portada, servicio, galería, nosotros, contacto): van en B4.
- **Precios, duración y "genera mantenimiento"** de servicios y variantes: van en C1 (HU-19, HU-20), como columnas nuevas de las mismas tablas.
- **Fotos que vienen de una orden** (`galeria_item.trabajo_id`): van en C4 (RF-44).
- **Videos:** el dueño los publica en sus redes. Si los pide en el sitio, es un cambio.

## 3. Reglas que se cumplen

| Regla | Qué dice | Dónde se garantiza |
|---|---|---|
| RF-11 | Crear, editar, ordenar y ocultar servicios, con foto | Módulo `sitio`; `servicio.visible_sitio` (ocultar no borra) |
| RF-10 | Editar textos de portada, nosotros, preguntas frecuentes y contacto | `contenido_pagina` (una fila por página, validada por un registro Zod como los parámetros) y `faq` |
| RF-12 | Subir antes y después, asociar a un servicio, ordenar y ocultar | `galeria_item` con `visible` y `orden` |
| D-2 | Todo servicio tiene al menos una variante | Al crear un servicio se crea la variante "Única". La última variante activa no se desactiva |
| D-6 | Lo que tiene historial no se borra | Servicios y variantes: se ocultan o desactivan. Preguntas frecuentes y fotos de galería sí se eliminan: no tienen historial |
| RN-10 | Sin precios ni testimonios en el sitio | Esta etapa no tiene campos de precio ni de testimonio. Los borradores no mencionan precios |
| RNF-02 | Sitio rápido en 4G | Fotos en WebP de hasta 1600 px y miniatura de 640 px; achicadas en el celular antes de subir |
| RNF-14 | Texto alternativo en las imágenes | Toda foto tiene texto alternativo: la descripción de la galería o el nombre del servicio |
| HU-03 | Encargado con módulo "Sitio web" | `MODULOS.sitio.construido = true`: aparece su casilla y su menú |

## 4. Datos

Una migración de tablas y otra de datos iniciales por historia: `0006_servicios` y `0007_datos_servicios` (HU-07); `0008_contenido` y `0009_datos_contenido` (HU-08); `0010_galeria` (HU-09, sin datos iniciales). Los datos iniciales no pisan lo existente.

### `archivo` (cambio)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `miniatura_clave` | `text` | sí | Única. Versión de 640 px de una foto: `<carpeta>/<uuid>-640.webp` |

### `servicio`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `nombre` | `text` | no | Único sin importar mayúsculas |
| `slug` | `text` | no | Único. Sale del nombre al crear (`pulido-y-nano-ceramico`); se puede cambiar con un aviso |
| `resumen` | `text` | no | Hasta 160 caracteres: tarjeta del sitio y descripción para Google |
| `descripcion` | `text` | no | Hasta 2000. Puede quedar vacía al crear |
| `beneficios` | `jsonb` | no | Lista de textos (hasta 8, de hasta 120 caracteres cada uno). **Cambió después (24/10, pedido de la demo):** cada uno es `{ texto, icono }`, con el ícono de una lista fija (`src/modulos/sitio/beneficios.ts`); se suma `opciones_en_escalera` (boolean) |
| `pasos` | `jsonb` | no | Lista de `{ titulo, detalle }` (hasta 10; título de hasta 60, detalle de hasta 300) |
| `foto_archivo_id` | `integer` | sí | FK `archivo`. Sin foto, el sitio muestra la imagen de reemplazo (B4) |
| `orden` | `integer` | no | |
| `visible_sitio` | `boolean` | no | Por defecto `true` |
| `activo` | `boolean` | no | Catálogo (C1). En B3 siempre `true` |
| `created_at`, `updated_at`, `updated_by` | | | |

### `variante`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `servicio_id` | `integer` | no | FK `servicio` |
| `nombre` | `text` | no | Único dentro del servicio. "Única" si no hay opciones |
| `descripcion` | `text` | sí | Hasta 200 |
| `orden` | `integer` | no | |
| `activo` | `boolean` | no | |

### `contenido_pagina`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `clave` | `text` | no | Clave primaria: `inicio`, `nosotros`, `contacto` |
| `datos` | `jsonb` | no | Validado por el registro `src/modulos/sitio/contenido.ts` |
| `foto_archivo_id` | `integer` → `archivo` | sí | Foto de la página. Hoy solo `inicio`: la foto del taller de la portada (migración `0014_foto_portada`) |
| `updated_at`, `updated_by` | | | |

| Página | Campos (texto, todos obligatorios) |
|---|---|
| `inicio` | `lema` (hasta 80), `presentacion` (hasta 400) |
| `nosotros` | `historia` (hasta 2000), `como_trabajamos` (hasta 2000), `por_que_elegirnos` (lista de 1 a 6 puntos de hasta 160) |
| `contacto` | `bienvenida` (hasta 300) |

### `faq`
`id`, `pregunta` (hasta 160), `respuesta` (hasta 1000), `orden`, `visible`.

### `galeria_item`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `servicio_id` | `integer` | no | FK `servicio`. Para filtrar en el sitio (RF-04) |
| `foto_antes_id` | `integer` | sí | FK `archivo`. Vacío = foto sola |
| `foto_despues_id` | `integer` | no | FK `archivo`. La foto sola va aquí |
| `descripcion` | `text` | no | Hasta 140. Es también el texto alternativo |
| `orden` | `integer` | no | |
| `visible` | `boolean` | no | |
| `created_at`, `created_by` | | | |

### Datos iniciales (borradores para que el dueño corrija)

**Servicios**, en este orden, con su resumen. La descripción, los beneficios y los pasos quedan vacíos, salvo en el mantenimiento:

| Servicio | Variantes |
|---|---|
| Pulido y nano cerámico | 1 año, 2 años, 3 años, 5 años, 10 años |
| Lavado de interior | Básico, Premium |
| Limpieza de asientos por inyección y succión | Única (variantes pendientes) |
| Pulido de vidrios | Única (variantes pendientes) |
| Restauración de faroles con polímero | Única |
| Polarizado de vidrios | Única |
| Instalación de PPF | Única |
| Mantenimiento del nano cerámico | Única. Pasos: los 6 que mandó el dueño |

**Textos:**
- **Portada:** el lema "Como ven tu auto, te ven a ti" y una presentación corta.
- **Nosotros:** la historia del dueño, pulida, más borradores de "cómo trabajamos" y "por qué elegirnos" armados con la entrevista.
- **Contacto:** "Escríbenos por WhatsApp o pasa por el taller: revisamos tu vehículo y te damos una cotización."

**Preguntas frecuentes (borradores, sin precios):**
- ¿Cuánto tiempo se queda mi vehículo?
- ¿Necesitan ver el vehículo para cotizar?
- ¿Cómo reservo una fecha?
- ¿Qué cubre la garantía?
- ¿Cada cuánto se hace el mantenimiento del cerámico?

## 5. Pantallas y rutas

Todas con `exigirModulo("sitio")`: el dueño, o un encargado con el permiso `sitio`. Las pestañas tienen su propia ruta, como en Configuración.

| Ruta | Pestaña | Contenido |
|---|---|---|
| `/panel/sitio` | Servicios | Lista en orden: nombre, si se ve en el sitio, miniatura o "Sin foto", y subir o bajar. Botón "Agregar servicio" |
| `/panel/sitio/servicios/nuevo` | — | Nombre y resumen. Al crear, lleva a la edición completa |
| `/panel/sitio/servicios/[id]` | — | Datos, foto principal, beneficios, pasos, variantes y "Mostrar en el sitio" |
| `/panel/sitio/textos` | Textos | Portada, Nosotros y Contacto: un formulario por página. Debajo de Portada, "Foto del taller": subir, cambiar o quitar (sin foto, la portada muestra el arte de la marca) |
| `/panel/sitio/preguntas` | Preguntas frecuentes | Lista editable: agregar, editar, subir o bajar, ocultar y eliminar (pide confirmación) |
| `/panel/sitio/galeria` | Galería | Botón "Subir fotos"; grilla de miniaturas con su servicio, descripción, si está visible, orden y eliminar. Filtro por servicio |

**Celular:** las listas son tarjetas; los botones de orden y de estado bajan a otra línea si no entran, como en Taller. La galería va en 2 columnas.

**Subida de fotos:**
- Se elige la foto desde la galería del celular o se saca en el momento.
- Durante el proceso se ve "Preparando foto…" mientras se achica y "Subiendo…" mientras se envía.
- Si falla, el error dice qué pasó y la foto elegida sigue ahí para volver a intentar.

**Estados vacíos:**
- Sin servicios: "Todavía no hay servicios. Agrega el primero."
- Galería vacía: "Sube la primera foto de un trabajo terminado."
- Sin preguntas: "Agrega las preguntas que más te hacen los clientes."

## 6. Acciones del servidor

En `src/modulos/sitio/acciones.ts`. Todas empiezan con `exigirModulo("sitio")`, validan con Zod (el mismo esquema que el formulario) y terminan con `updateTag` de su etiqueta.

| Acción | Entrada | Errores |
|---|---|---|
| `crearServicio` | nombre, resumen | "Escribe el nombre del servicio." · "Ya existe un servicio con ese nombre." · "Hasta 160 caracteres." |
| `guardarServicio` | id, nombre, slug, resumen, descripción, beneficios (JSON), pasos (JSON), visible | Los anteriores más "La dirección solo lleva minúsculas, números y guiones." · "Ya hay otra página con esa dirección." · "Hasta 8 beneficios." · "Cada paso necesita un título." |
| `subirFotoServicio` | id, archivo | "La foto debe ser JPG, PNG o WebP de hasta 5 MB." |
| `quitarFotoServicio` | id | — |
| `moverServicio` | id, dirección | — |
| `guardarVariante`, `moverVariante`, `cambiarEstadoVariante` | servicio, id, nombre, descripción / dirección / activo | "Ya existe una variante con ese nombre." · "Debe quedar al menos una variante activa." |
| `guardarContenido` | página, campos | Por campo: "Escribe el lema." · "Hasta 400 caracteres." |
| `guardarPregunta`, `moverPregunta`, `cambiarVisibilidadPregunta`, `eliminarPregunta` | id, pregunta, respuesta / dirección / visible | "Escribe la pregunta." · "Escribe la respuesta." |
| `subirGaleria` | servicio, descripción, foto después, foto antes (opcional) | "Elige el servicio." · "Escribe una descripción corta: también la leen los buscadores." · el error de la foto |
| `guardarGaleriaItem`, `moverGaleriaItem`, `cambiarVisibilidadGaleria`, `eliminarGaleriaItem` | id, servicio, descripción / dirección / visible / id | Eliminar borra también los archivos del almacenamiento |

**Fotos (`src/lib/fotos.ts`):**
- Valida el formato con `sharp` y endereza la foto según la orientación de la cámara.
- Genera la versión de 1600 px y la de 640 px, sube las dos y guarda una sola fila en `archivo` (la miniatura en `miniatura_clave`).
- La subida del logo (HU-04) pasa a usar la misma función.

## 7. Componentes y diseño

- **shadcn/ui:** `textarea`, `checkbox` y `dialog` (confirmar eliminar). Para elegir el servicio se usa la lista nativa del navegador (`src/componentes/panel/selector.tsx`), no el `select` de shadcn: en el celular abre el selector propio del teléfono.
- **Componentes nuevos:**
  - `SubidaFoto`: elige, achica en el navegador, muestra la vista previa y el progreso.
  - `EditorLista`: beneficios, pasos y "por qué elegirnos": agregar, quitar y ordenar filas.
  - Pestañas del módulo, iguales a las de Configuración.
- **Orden (subir y bajar):** la regla `reordenar` de Taller pasa a `src/lib/orden.ts` y la usan todas las listas.

## 8. Textos de la interfaz

| Lugar | Texto |
|---|---|
| Menú y título | Sitio web |
| Pestañas | Servicios · Textos · Preguntas frecuentes · Galería |
| Ayuda del resumen | Una o dos frases. Se ve en la tarjeta del servicio y en Google. |
| Ayuda de la dirección | Así se ve en el navegador: toctar…/servicios/pulido-y-nano-ceramico. Si la cambias, los enlaces viejos dejan de funcionar. |
| Ayuda de variantes | Las opciones que eligen los clientes, como los años del cerámico. Los precios se cargan en el catálogo. |
| Mostrar en el sitio | Mostrar en el sitio · Oculto: no aparece en el sitio, pero no se borra. |
| Galería, descripción | Ejemplo: "Pulido y nano cerámico 5 años en una Hilux". |
| Guardado | Cambios guardados. |
| Foto subida | Foto guardada. |
| Confirmar eliminar | ¿Eliminar esta foto? No se puede deshacer. |

## 9. Pruebas

**Unitarias:**
- Slug: tildes, ñ, espacios, signos; vacío y repetido.
- Esquemas de servicio, beneficios y pasos (límites).
- Registro de contenido: campos obligatorios y largos.
- `reordenar` movida a `src/lib/orden.ts`: las pruebas de Taller siguen pasando.
- Regla de la última variante activa.

**De punta a punta** (las que guardan corren solo en escritorio):
1. El dueño crea un servicio, le carga beneficios, pasos y una variante, lo oculta y lo vuelve a mostrar. Los datos quedan guardados.
2. Un nombre o una dirección repetidos dan error junto al campo.
3. La foto principal de un servicio se sube y se ve la miniatura. Un archivo que no es imagen se rechaza.
4. El dueño edita el lema de la portada y una pregunta frecuente, y las ordena. Un campo vacío da error.
5. Galería: sube un par antes y después y una foto sola, la oculta y la elimina.
6. Un encargado con el permiso "Sitio web" entra al módulo; sin el permiso ve "Sin acceso". El técnico nunca entra.

## 10. Orden de trabajo

| Rama | Contenido |
|---|---|
| `docs/especificacion-b3` | Esta especificación |
| `hu-07-servicios-sitio` | `orden.ts` y `fotos.ts` (refactor en commits aparte); tablas `servicio` y `variante`, cambio en `archivo`; datos iniciales; módulo `sitio`; pestaña Servicios y edición |
| `hu-08-textos-sitio` | `contenido_pagina` y `faq`; datos iniciales; pestañas Textos y Preguntas frecuentes |
| `hu-09-galeria-panel` | `galeria_item`; pestaña Galería |

## 11. Criterio de salida

- [x] Las pruebas unitarias y E2E pasan, en celular y en escritorio (14/10).
- [ ] Una foto de celular de 8 MB se sube en 4G simulado (Chrome, "Fast 4G") en menos de 10 segundos.
- [x] El encargado con "Sitio web" edita contenido; sin el permiso, no entra (E2E `hu-07`).
- [ ] Revisión manual de YankoSoft en el celular.
- [ ] Demo del viernes 23, junto con B4: el dueño corrige los borradores de textos y servicios, y sube 3 fotos de la galería.

## 12. Decisiones abiertas

| Decisión | Propuesta | Quién decide |
|---|---|---|
| Lista final de servicios y nombres | La de la entrevista (§4); el dueño agrega, renombra u oculta | Dueño (demo del 23) |
| ¿El nano grafeno es una variante del cerámico o un servicio aparte? ¿Tiene los mismos años? | Hasta que responda, no se carga: se agrega desde el panel | Dueño |
| Variantes de inyección y succión y de pulido de vidrios | "Única" hasta que responda | Dueño |
| Textos por servicio, cómo trabajamos y preguntas frecuentes | Borradores; los corrige él en el panel | Dueño |
| Fotos principales de cada servicio | Imagen de reemplazo hasta que lleguen | Dueño (antes del 3/11) |
