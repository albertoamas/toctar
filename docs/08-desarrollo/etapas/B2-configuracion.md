# B2 Configuración y app — especificación

- **Fase y semana:** B. Entrega 1 · semana 1 (14 al 20 de octubre)
- **Estado:** aprobada para programar (14 de octubre de 2026)
- **Historias:** HU-04 Datos del negocio · HU-05 Parámetros del sistema · HU-06 App instalable
- **Base:**
  - Requisitos: RF-17, RF-18, RF-19, RNF-03 y RNF-11.
  - Reglas: RN-04 (adelanto sugerido), RN-06 (espacios del taller), RN-07 (tamaños) y RN-08 (intervalo de mantenimiento); supuesto S-5 (validez por cotización).
  - Modelo: tablas `negocio`, `sucursal`, `parametro`, `tamano_vehiculo`, `espacio_taller` y `archivo` (D-7, D-8, D-10).
  - Material: datos de contacto y clasificación de vehículos en `01-descubrimiento/material-recibido.md`.

## 1. Objetivo

El dueño cambia desde el panel todo dato del negocio y todo valor que el sistema usa (WhatsApp, dirección, horarios, adelanto, espacios del taller, tamaños de vehículo), sin pedírselo a YankoSoft. El personal instala el panel en su celular como una app.

## 2. Alcance

**Incluye:**
- **Datos del negocio (HU-04):** nombre, logo para documentos, WhatsApp, dirección, ubicación en el mapa, horarios, correo, redes, NIT y razón social.
- **Lo que ya se ve en el sitio:** el pie del sitio muestra dirección, horario, WhatsApp y redes, y se actualiza solo al guardar.
- **Parámetros (HU-05):**
  - Espacios del taller y tamaños de vehículo: listas editables.
  - Adelanto sugerido, validez sugerida de la cotización e intervalo de mantenimiento.
  - Condiciones y garantía del PDF.
- **App instalable (HU-06):** manifiesto, íconos, aviso sin conexión y aviso dentro del panel cuando se corta internet.
- **Base para las etapas siguientes:**
  - Tabla `archivo` y subida de imágenes (con `sharp`, a R2 o RustFS), que reusa la galería en B3.
  - Utilidades de WhatsApp, horarios y coordenadas.

**No incluye:**
- **El logo del sitio y del panel:** son los SVG de la marca (`public/marca/`). El logo de esta etapa es para el PDF de cotización y documentos, y se usa en C2.
- **"Servicios que generan mantenimiento":** es un campo del servicio. Se marca en el catálogo (C1, HU-19).
- **Varias sucursales:** el modelo las soporta (D-7), pero la pantalla edita la única que hay.
- **Uso sin conexión:** fuera del alcance (acuerdo). Sin internet solo se muestra un aviso claro.

## 3. Reglas que se cumplen

| Regla | Qué dice | Dónde se garantiza |
|---|---|---|
| RF-17 | El dueño edita los datos del negocio y se usan en el sitio y en el PDF | Módulo `configuracion` (solo dueño, matriz de B1). El pie del sitio lee los datos con `use cache` y la etiqueta `negocio`; al guardar, `updateTag("negocio")` |
| RF-18, RNF-11 | Todos los valores del negocio son configurables; ninguno fijo en el código | Tabla `parametro` (clave y valor) validada por un registro en código con Zod y valor inicial (D-8). Los valores iniciales entran por migración |
| HU-05 | Ningún parámetro vacío o negativo | Esquema Zod de cada parámetro, el mismo en el formulario y en el servidor |
| HU-05 | Cambiar un parámetro no altera cotizaciones ni reservas guardadas | Las cotizaciones y los trabajos copian el valor al crearse (D-4, C2 y C3). Esta etapa solo guarda el valor vigente |
| RN-06 | La cantidad de espacios es configurable (hoy 3) | Tabla `espacio_taller`; se desactiva, no se borra (D-6) |
| RN-07 | Tamaños configurables (hoy 5) | Tabla `tamano_vehiculo` con `descripcion` (modelos de ejemplo); se desactiva, no se borra |
| S-5 | La validez se define en cada cotización; la configuración solo sugiere | Parámetro `validez_cotizacion_dias`, usado como valor inicial en C2 |
| RF-19, RNF-03 | Instalable; sin conexión muestra un aviso claro | `app/manifest.ts`, íconos PNG, *service worker* mínimo con la página `/sin-conexion` y aviso en el panel con los eventos `online` y `offline` |

## 4. Datos

Migración `0002_configuracion` (tablas) y `0003_datos_iniciales` (SQL propio con `on conflict do nothing`: se puede aplicar en cualquier entorno sin duplicar).

### `archivo`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `clave` | `text` | no | Única. Ruta en el almacenamiento: `negocio/logo-<id>.webp` |
| `tipo_mime` | `text` | no | |
| `bytes` | `integer` | no | |
| `ancho`, `alto` | `integer` | sí | Solo imágenes |
| `created_at` | `timestamptz` | no | |
| `created_by` | `integer` | sí | FK `usuario` |

### `negocio` (una sola fila: CHECK `id = 1`)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` | no | Siempre 1 |
| `nombre` | `text` | no | "TocTar Detailing" |
| `logo_archivo_id` | `integer` | sí | FK `archivo`. Logo para el PDF |
| `correo` | `text` | sí | |
| `redes` | `jsonb` | no | `{ "facebook"?, "instagram"?, "tiktok"? }`: enlaces completos |
| `nit`, `razon_social` | `text` | sí | Para la factura futura (SIAT) |
| `updated_at` | `timestamptz` | no | |
| `updated_by` | `integer` | sí | FK `usuario` |

### `sucursal` (hoy una fila)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `nombre` | `text` | no | "Tarija" |
| `direccion` | `text` | no | |
| `lat`, `lng` | `numeric(9,6)` | sí | Ubicación para el mapa |
| `horarios` | `jsonb` | no | Siete días: `{ "dia": 1..7, "turnos": [{ "desde": "08:00", "hasta": "12:00" }] }` (máximo 2 turnos; sin turnos = cerrado) |
| `telefono_whatsapp` | `text` | sí | Formato internacional sin "+": `591` y 8 dígitos |
| `activo` | `boolean` | no | |

### `parametro`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `clave` | `text` | no | Clave primaria |
| `valor` | `jsonb` | no | |
| `updated_at`, `updated_by` | | | |

Parámetros (registro en `src/modulos/configuracion/parametros.ts`):

| Clave | Tipo y regla | Valor inicial | Se usa en |
|---|---|---|---|
| `adelanto_sugerido` | Monto en Bs, entero, de 1 a 100 000 | 200 | C3 (reserva, RN-04) |
| `validez_cotizacion_dias` | Entero, de 1 a 365 | 15 | C2 (S-5) |
| `intervalo_mantenimiento_meses` | Entero, de 1 a 24 | 3 | C4 (RN-08) |
| `condiciones_cotizacion` | Texto, de 1 a 2000 caracteres | Borrador a partir de la garantía del dueño (se ajusta con él) | C2 (PDF) |
| `garantia_cotizacion` | Texto, de 1 a 2000 caracteres | El texto de garantía del dueño, pulido | C2 (PDF) |

### `tamano_vehiculo`
`id`, `nombre` (texto, no nulo), `descripcion` (ejemplos), `orden` (entero), `activo`.
Inicial: los 5 tamaños de `material-recibido.md`, con sus ejemplos.

### `espacio_taller`
`id`, `sucursal_id` (FK), `nombre`, `orden`, `activo`.
Inicial: "Espacio 1", "Espacio 2" y "Espacio 3".

### Datos iniciales del negocio
- Nombre "TocTar Detailing" y correo `toctartarija@gmail.com`.
- Dirección "Barrio Aeropuerto, calle Juan Pablo II, pasaje Tejerina, Tarija".
- Horario: lunes a sábado, de 8:00 a 12:00 y de 14:00 a 18:00 (pendiente de confirmar).
- WhatsApp, ubicación y redes quedan vacíos: los carga el dueño en la demo, con los datos que ya tiene YankoSoft.

## 5. Pantallas y rutas

Todas dentro de `/panel/configuracion`, con `exigirModulo("configuracion")` (solo el dueño). Son tres pestañas, cada una con su propia ruta para poder enlazarla:

| Ruta | Pestaña | Contenido |
|---|---|---|
| `/panel/configuracion` | Negocio | Nombre, WhatsApp, correo, dirección, ubicación, horarios, redes, NIT y razón social, logo para documentos |
| `/panel/configuracion/taller` | Taller | Espacios del taller y tamaños de vehículo: agregar, renombrar, ordenar (subir y bajar), desactivar y reactivar |
| `/panel/configuracion/cotizaciones` | Cotizaciones y mantenimiento | Adelanto sugerido, validez sugerida, intervalo de mantenimiento, condiciones y garantía del PDF |

**Detalles de la pestaña Negocio:**
- **WhatsApp:** se escriben los 8 dígitos del celular. Se acepta con o sin `+591`, espacios o guiones, y se guarda normalizado.
- **Ubicación:** un solo campo, "Pega las coordenadas o el enlace de Google Maps". Acepta `-21.53, -64.73`, enlaces con `@lat,lng`, `?q=lat,lng` o `!3d…!4d…`. Los enlaces cortos (`maps.app.goo.gl`) no traen coordenadas: el error explica cómo copiarlas en Google Maps (mantener presionado el punto y copiar los números).
- **Horarios:** una fila por día con "Cerrado" y hasta 2 turnos (de y a). Botón "Copiar el lunes a todos los días hábiles".
- **Logo para documentos:** PNG, JPG o WebP de hasta 5 MB. Se guarda en WebP de hasta 1600 px, con transparencia. Al lado se ve una vista previa.

**Pie del sitio:** muestra la dirección, el horario resumido ("Lunes a sábado: 8:00–12:00 y 14:00–18:00"), un enlace a WhatsApp si hay número y los íconos de las redes cargadas. Va siempre en tema oscuro.

**Sin conexión:**
- `/sin-conexion`: página estática con el monograma, el título "Sin conexión" y el texto "El panel necesita internet. Revisa tu conexión y vuelve a intentar.", más el botón "Reintentar".
- En el panel aparece una franja arriba con el texto "Sin conexión. Los cambios no se guardarán hasta que vuelva internet.".

## 6. Acciones del servidor

Van en `src/modulos/configuracion/acciones.ts`. Todas empiezan con `exigirModulo("configuracion")`, validan con Zod y terminan con `updateTag("negocio")` (las del negocio) o `updateTag("parametros")`.

| Acción | Entrada | Errores |
|---|---|---|
| `guardarNegocio` | Datos del negocio y de la sucursal | "Escribe los 8 dígitos del celular." · "No encontramos coordenadas en ese enlace…" · "Revisa el enlace de Instagram." · "El turno debe terminar después de empezar." |
| `subirLogo` | Archivo | "El logo debe ser PNG, JPG o WebP de hasta 5 MB." |
| `guardarParametros` | Los 5 parámetros | Por campo: "Escribe un monto mayor a cero." · "Entre 1 y 365 días." |
| `guardarEspacio`, `guardarTamano` | id (opcional), nombre, descripción | "Escribe un nombre." · "Ya existe un espacio con ese nombre." |
| `moverEspacio`, `moverTamano` | id, dirección | — |
| `cambiarEstadoEspacio`, `cambiarEstadoTamano` | id, activo | "Debe quedar al menos un espacio activo." (igual para los tamaños) |

## 7. Componentes y diseño

- **shadcn/ui a agregar:** `tabs`, `textarea` y `switch`.
- **Panel** en tema claro. Para cada pestaña: formulario con `useActionState`, aviso con Sonner y errores junto al campo, como en Usuarios.
- **Pie del sitio:** monograma, `Lema`, datos en `text-tinta-suave` e íconos de Lucide para las redes. Se ocultan las que no estén cargadas.

## 8. Textos de la interfaz

| Lugar | Texto |
|---|---|
| Título | Configuración |
| Pestañas | Negocio · Taller · Cotizaciones y mantenimiento |
| Ayuda del WhatsApp | El número al que escriben los clientes desde la página. |
| Ayuda del adelanto | Monto sugerido al agendar; se puede cambiar en cada reserva. |
| Ayuda de la validez | Días que vale una cotización si no se indica otra cosa. |
| Ayuda del intervalo | Meses después de la entrega para avisar el mantenimiento. |
| Guardado | Cambios guardados. |
| Lista vacía (no debería pasar) | Agrega al menos un espacio del taller. |

## 9. Pruebas

**Unitarias:**
- Normalizar WhatsApp: los formatos válidos, más inválidos como 7 dígitos o números que empiezan con 2.
- Leer coordenadas de cada formato de enlace, y rechazar el enlace corto.
- Resumir horarios: días agrupados, día cerrado y dos turnos.
- Esquema de cada parámetro: vacío, negativo, decimal donde va un entero y fuera de rango.
- `enlaceWhatsApp(numero, mensaje)`: arma la URL `wa.me` con el texto codificado.

**De punta a punta:**
1. El dueño cambia el WhatsApp y la dirección: el pie del sitio los muestra sin volver a desplegar.
2. Un adelanto de "-5" o vacío muestra el error junto al campo y no se guarda.
3. Agregar un espacio, renombrarlo y desactivarlo. El último espacio activo no se puede desactivar.
4. Un encargado y un técnico ven "Sin acceso" en `/panel/configuracion`.
5. `/manifest.webmanifest` responde con nombre, íconos y `display: standalone`; los íconos existen.
6. Con el *service worker* instalado y sin conexión, una página del panel muestra "Sin conexión".
7. La subida del logo guarda una imagen WebP y muestra la vista previa.

## 10. Orden de trabajo

Una rama a la vez; cada una se une antes de empezar la siguiente.

| Rama | Contenido |
|---|---|
| `docs/especificacion-b2` | Esta especificación |
| `hu-04-datos-negocio` | Tablas `archivo`, `negocio` y `sucursal`; datos iniciales; utilidades de WhatsApp, coordenadas y horarios; pestaña Negocio; subida del logo; pie del sitio con caché por etiqueta |
| `hu-05-parametros` | Tablas `parametro`, `tamano_vehiculo` y `espacio_taller`; datos iniciales; pestañas Taller y Cotizaciones |
| `hu-06-app-instalable` | Manifiesto, íconos PNG generados desde la marca, *service worker*, `/sin-conexion` y aviso en el panel |

## 11. Criterio de salida

- [ ] Las pruebas unitarias y las 7 E2E pasan, en celular y en escritorio.
- [ ] Revisión del código: ningún valor del negocio fijo en el código (RNF-11).
- [ ] La app se instala en Android (Chrome) y en iPhone (Safari, "Agregar a inicio") con el ícono de TocTar. Se prueba en el entorno de pruebas, porque la instalación necesita https.
- [ ] Demo del viernes 23: el dueño carga su WhatsApp, su ubicación y sus redes, y los ve en el sitio.

## 12. Decisiones abiertas

| Decisión | Propuesta | Quién decide |
|---|---|---|
| Texto de condiciones y garantía del PDF | Borrador a partir del texto de garantía que mandó; el dueño lo ajusta | Dueño (antes de C2) |
| Horario definitivo y días | Lunes a sábado, 8–12 y 14–18, hasta que lo confirme | Dueño |
| ¿La app instalada abre en el panel o en el sitio? | En el panel (`/panel`): la instala el personal | YankoSoft (confirmar en la demo) |
