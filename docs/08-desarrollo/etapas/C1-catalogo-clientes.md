# C1 Catálogo y clientes — especificación

- **Fase y semana:** C. Entrega 2 · semana 2 (desde el 20 de octubre)
- **Estado:** programada (20 de octubre de 2026): HU-19 a HU-23 en `develop` (PR #49 a #53). Falta cargar la lista de precios real del dueño
- **Cambió después:** el catálogo tiene ahora el alta del servicio, su nombre y el editor de variantes; antes estaban en Sitio web. Se quitó la marca `construido` (C5 §0, 24/10).
- **Historias:** HU-19 Catálogo con variantes · HU-20 Precios por tamaño y duración · HU-21 Registrar clientes y vehículos · HU-22 Buscar clientes · HU-23 Ficha del cliente
- **Base:**
  - Requisitos: RF-20 a RF-28; RNF-01, RNF-05, RNF-08, RNF-10, RNF-11.
  - Reglas: RN-01 (solo el dueño ve y cambia precios), RN-07 (precio por tamaño), RN-08 (servicios que generan mantenimiento), RN-12 (el técnico no ve precios ni clientes), RN-14 (se desactiva, no se borra).
  - Modelo: D-2, D-3, D-6, D-9. Tablas `servicio` y `variante` (cambian), `precio`, `cliente` y `vehiculo` (nuevas).
  - Material: clasificación de vehículos en 5 tamaños (`01-descubrimiento/material-recibido.md`). La lista de precios todavía no llegó: se cargan precios de prueba solo en la base de pruebas E2E, nunca como datos iniciales.

Esta especificación se escribe al empezar la etapa, con lo aprendido en las anteriores. Se programa contra ella; si algo cambia durante la etapa, se corrige aquí primero.

## 1. Objetivo

El dueño carga en el panel el precio de cada variante por tamaño de vehículo, la duración de cada servicio y cuáles generan mantenimiento, y cada cambio de precio queda en un historial. El personal registra clientes y sus vehículos sin duplicarlos, los encuentra mientras el cliente escribe por WhatsApp y ve su ficha.

## 2. Alcance

**Incluye:**
- **Catálogo (HU-19, HU-20), solo el dueño:**
  - Lista de servicios con su estado en el catálogo y en el sitio, y cuántos precios faltan.
  - Por servicio: duración en días, si genera mantenimiento y si está activo en el catálogo.
  - Por variante: precio por cada tamaño activo (vacío = "según evaluación") y duración propia opcional, que pisa la del servicio.
  - Historial de precios de una variante: monto, fecha y quién lo cambió.
  - Las variantes se siguen creando, ordenando y desactivando en Editar servicio (HU-07, módulo Sitio web): el catálogo enlaza ahí y no repite ese editor.
- **Clientes (HU-21 a HU-23), dueño y encargado con el módulo "Clientes":**
  - Registrar un cliente: nombre y WhatsApp obligatorios; correo, NIT, razón social y notas opcionales.
  - Registrar vehículos de un cliente: placa y tamaño obligatorios; marca, modelo, año y color opcionales.
  - Aviso de duplicado al guardar: si el teléfono o la placa ya existen, el error ofrece abrir ese registro.
  - Lista con búsqueda mientras se escribe, por parte del nombre (sin importar tildes ni mayúsculas), del teléfono o de la placa.
  - Ficha: datos, vehículos, botón de WhatsApp y editar o desactivar.
- **Módulo "Clientes" construido:** el encargado puede recibir su casilla (HU-03) y aparece en el menú.

**No incluye** (y dónde queda):
- **Historial de consultas, cotizaciones, órdenes, pagos y saldo en la ficha (HU-23):** cada sección se agrega cuando existe su tabla: consultas y cotizaciones en C2, órdenes en C3 y C4, pagos y saldo en C3. En C1 la ficha muestra datos y vehículos.
- **"Iniciar consulta" y "Reserva directa" desde la ficha:** C2 y C3.
- **Tabla `auditoria`:** el plan la ubicaba en C1, pero los precios ya guardan su propio historial con fecha y usuario (D-3), así que no hace falta para RNF-10 en esta etapa. Se crea en C2, con las cotizaciones (decisión de esta especificación).
- **Precios reales:** los carga el dueño desde el panel cuando mande la lista.
- **Clientes con teléfono de otro país:** solo celulares de Bolivia, como el WhatsApp del negocio (ver §12).

## 3. Reglas que se cumplen

| Regla | Qué dice | Dónde se garantiza |
|---|---|---|
| RF-25 | Servicios con variantes | Ya existe (HU-07). El catálogo las muestra y enlaza a su editor |
| RF-26 | Precio por variante y tamaño; vacío = según evaluación | Tabla `precio` con `monto` nulo. Distingue "según evaluación" (fila con monto nulo) de "sin cargar" (sin fila) |
| RF-27 | Duración en días por servicio o variante | `servicio.duracion_dias` (obligatoria) y `variante.duracion_dias` (opcional, pisa la del servicio). Función pura `duracionEfectiva` |
| RF-28 | Desactivar sin borrar; historial de precios | `servicio.activo` y `variante.activo`. Un precio nunca se actualiza: cada cambio es una fila nueva (D-3) |
| RNF-10 | Quién y cuándo cambia precios | `precio.created_by` y `precio.vigente_desde` |
| RN-01, RN-12 | Precios solo para el dueño; el técnico no ve clientes | Módulo `catalogo` sin permiso de encargado; módulo `clientes` sin técnico. `exigirModulo` en cada página y acción (RNF-05) |
| RN-07 | Precio por tamaño, tamaños configurables | La grilla sale de `tamano_vehiculo` activos (HU-05). Un tamaño desactivado conserva sus precios pero no se muestra |
| RN-08 | Mantenimiento solo en servicios marcados | `servicio.genera_mantenimiento`. Dato inicial: verdadero en "Pulido y nano cerámico" |
| RN-14 | Clientes y servicios se desactivan | `cliente.activo`, `vehiculo.activo`, `servicio.activo` |
| RF-20, RF-21 | Datos del cliente y del vehículo | Esquemas Zod compartidos por formulario y servidor |
| RF-22 | Buscar por nombre, teléfono o placa | Consulta con `unaccent` + `ilike` en el nombre, dígitos en el teléfono y placa normalizada |
| RF-23 | Avisar duplicados | Índice único en `cliente.telefono` e índice único parcial en `vehiculo.placa` (solo activos); la acción responde con el registro existente para ofrecer abrirlo |
| RF-24 | Ficha del cliente | Parcial en C1 (ver §2) |
| RNF-11 | Nada fijo en el código | Precios, duraciones y tamaños se cargan desde el panel; no hay montos en el código |
| D-2 | Toda variante válida | Sin cambios: la última variante activa no se desactiva (HU-07) |

## 4. Datos

Migraciones por historia: `0015_catalogo` y `0016_datos_catalogo` (HU-19: duración y mantenimiento del servicio, y la marca inicial del nano cerámico), `0017_precios` (HU-20: duración de la variante y la tabla `precio`), `0018_clientes` (HU-21: `cliente` y `vehiculo`, con un índice por `cliente_id`) y la de HU-22 con la extensión `unaccent`.

### `servicio` (cambio)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `duracion_dias` | `integer` | no | Por defecto 1. CHECK entre 1 y 60 |
| `genera_mantenimiento` | `boolean` | no | Por defecto `false` (RN-08) |

`activo` ya existe (B3): el catálogo ahora lo cambia. Un servicio inactivo no sale en el sitio (B4 ya filtra por `activo`), tampoco en la lista de Servicios del sitio del panel, ni se podrá cotizar (C2); se reactiva desde el catálogo.

### `variante` (cambio)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `duracion_dias` | `integer` | sí | Si está, pisa la del servicio. CHECK entre 1 y 60 |

### `precio` (nueva, D-3)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `variante_id` | `integer` | no | FK `variante` |
| `tamano_id` | `integer` | no | FK `tamano_vehiculo` |
| `monto` | `numeric(10,2)` | sí | Nulo = según evaluación. CHECK `monto > 0` |
| `vigente_desde` | `timestamptz` | no | Por defecto `now()` |
| `created_by` | `integer` | no | FK `usuario` |

Índice `precio_vigente` sobre (`variante_id`, `tamano_id`, `vigente_desde` desc, `id` desc): el vigente es la fila más reciente de cada par. Sin `updated_at`: las filas no se modifican ni se borran.

### `cliente` (nueva)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `nombre` | `text` | no | Hasta 120 caracteres |
| `telefono` | `text` | no | Único. Formato `591XXXXXXXX`, como el WhatsApp del negocio (`normalizarWhatsApp`) |
| `correo` | `text` | sí | |
| `nit` | `text` | sí | Solo dígitos, hasta 15 (SIAT futura) |
| `razon_social` | `text` | sí | Hasta 120 |
| `notas` | `text` | sí | Hasta 1000 |
| `activo` | `boolean` | no | Por defecto `true` |
| `created_at`, `updated_at` | `timestamptz` | no | |
| `created_by`, `updated_by` | `integer` | `created_by` no | FK `usuario` |

### `vehiculo` (nueva)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `cliente_id` | `integer` | no | FK `cliente` |
| `placa` | `text` | no | Única entre los vehículos activos (índice parcial `WHERE activo`). Normalizada: mayúsculas, sin espacios ni guiones (`1234 abc` → `1234ABC`) |
| `tamano_id` | `integer` | no | FK `tamano_vehiculo` |
| `marca`, `modelo`, `color` | `text` | sí | Hasta 40 cada uno |
| `anio` | `integer` | sí | CHECK entre 1950 y el año siguiente al actual (se valida en Zod; en la base, entre 1950 y 2100) |
| `activo` | `boolean` | no | Por defecto `true` |
| `created_at`, `updated_at` | `timestamptz` | no | |
| `created_by` | `integer` | no | FK `usuario` |

Extensión `unaccent` para buscar "jose" y encontrar "José". Con pocos cientos de clientes no hacen falta índices de texto; se revisa si la lista crece.

**Datos iniciales (`0016_datos_catalogo`):** `genera_mantenimiento = true` en "Pulido y nano cerámico". Duración 1 día en todos (el valor por defecto): el dueño la ajusta. Sin precios.

## 5. Pantallas y rutas

Todas con `exigirModulo` dentro de `<Suspense>`, el estándar del panel (44 px con pantalla táctil, regla de botones, `useFocoEnError`, `EnlaceVolver`) y sin desborde a 360 px.

### `/panel/catalogo` — Catálogo y precios (solo el dueño)
- Lista de servicios en el orden del sitio, los inactivos al final y atenuados.
- Cada fila (pulido 7.1, 25/10): el nombre; debajo, "Desde 700 Bs" (el menor de sus precios vigentes) o "Según evaluación"; en tinta suave, variantes ("5 variantes"), duración ("2 días") y "Con mantenimiento" si corresponde; "Faltan 7 precios" (pares variante y tamaño activos sin fila) en aviso, solo si faltan. "Inactivo" en los inactivos. Con flecha: la fila de un toque compartida (`ListaFilas`).
- Toda la fila abre el servicio (como en Servicios del sitio y Reclamos).
- "Agregar servicio" (arriba, rojo) abre el modal "Nuevo servicio" (desde el 26/10; antes, `/panel/catalogo/nuevo`, que redirige aquí): el nombre ("Como lo conocen los clientes.") con el cursor puesto, "Crear servicio" y "Cancelar". Al crear, lleva a la ficha del servicio, que abre el modal de los precios de su primera variante.
- Estado vacío: no ocurre (siempre hay servicios); si no hay tamaños activos, un aviso que lleva a Configuración > Taller.

### `/panel/catalogo/[id]` — Precios de un servicio (ficha en lectura desde el pulido 7.3, 25/10; skill `pantallas-panel`)
- `EnlaceVolver` a Catálogo. Encabezado compartido: el nombre del servicio, una insignia ("En el sitio", "Oculto en el sitio" o "Inactivo") y "Su página en el sitio" (enlace a Sitio web). Ficha en lectura (pulido 7.3, 26/10): cada sección es un recuadro con su "Editar", que abre su formulario en un modal (en el celular, una hoja desde abajo con los botones fijos). Recién creado y sin precios, se abre el modal de los de su primera variante.
- **Datos** y **Variantes** primero, lado a lado y del mismo alto (en el celular, uno debajo del otro): lo que es el servicio antes que sus precios (revisión del 26/10).
- **Precios:** un recuadro por variante activa (dos por fila en la computadora), con sus montos por tamaño como lista de precios (el tamaño a la izquierda, el monto a la derecha), "Sin cargar" resaltado y "Según evaluación" con palabras. "Editar" abre el modal "Precios de {variante}" ("Guardar precios" y "Cancelar"):
  - Una línea de ayuda: "Vacío: «Según evaluación», cuando depende de ver el vehículo."
  - Un campo en Bs por tamaño activo, con el nombre del tamaño. El campo vacío dice "Según evaluación" o, si nunca se guardó, "Sin cargar". Los modelos de ejemplo de cada tamaño están en Configuración > Taller (ya no se repiten aquí).
  - Duración propia opcional ("Vacío: usa la del servicio (2 días)."); en lectura se ve solo si es distinta ("Ocupa 2 días.").
  - Una fila por tamaño, como la lectura: el nombre a la izquierda y el campo en Bs a la derecha, en todos los tamaños de pantalla.
  - "Ver historial", arriba en el modal de precios, abre un diálogo con los cambios: tamaño, monto anterior → nuevo, fecha y hora de Bolivia y quién.
- **Datos:** duración, mantenimiento y si está activo, en lectura. "Editar" abre el modal "Datos del servicio": nombre, duración estimada, "Genera recordatorio de mantenimiento" y "Activo en el catálogo" ("Guardar datos" y "Cancelar").
- **Variantes:** en lectura, sus nombres en una línea (y cuántas desactivadas). "Editar" abre el modal "Variantes" con la lista para agregar, renombrar, ordenar y desactivar (cada cambio se guarda al momento; se cierra con "Listo", que no aparece mientras una fila está abierta). Las variantes inactivas no tienen precios en la ficha (conservan los suyos).

### `/panel/clientes` — Clientes (dueño y encargado con "Clientes")
- Arriba: el encabezado compartido con "Agregar cliente" (enlace con forma de botón, rojo) y el buscador (etiqueta "Buscar por nombre, teléfono o placa"; en el campo, "Nombre, teléfono o placa", que entra entero a 360 px).
- La búsqueda actualiza la dirección (`?q=`) con una pausa de 300 ms mientras se escribe; la lista se calcula en el servidor. Una ✕ propia de 44 px borra la búsqueda y devuelve el foco al campo. "Ver desactivados" y "Ver los activos" conservan lo escrito. Sin búsqueda, los 30 más recientes; con búsqueda, hasta 30 resultados y "Hay más: escribe algo más preciso" si se pasan.
- La fila de un toque compartida (`ListaFilas`, pulido 8.1, 26/10) en todos los tamaños: el nombre; debajo, en negrita, las placas (como el taller nombra los autos); en tinta suave, el WhatsApp y "Sin vehículos" si no tiene. Con varios vehículos, hasta tres placas y "y 2 más" (`placasEnFila`); si se buscó una placa, las que coinciden van primero, así la buscada se ve aunque sea la quinta.
- Los desactivados no salen; un enlace "Ver desactivados" (`?ver=desactivados`), al final, los lista. Viéndolos, una línea arriba dice "Desactivados." con "Ver los activos", y las filas van atenuadas.
- Estados vacíos: "Todavía no hay clientes. Agrega el primero con Agregar cliente." · "No hay clientes con «<búsqueda>»."

### `/panel/clientes/nuevo` — Agregar cliente
- Formulario: nombre, WhatsApp (+591, 8 dígitos), correo, NIT, razón social y notas; y, opcional, el primer vehículo (placa, tamaño, marca, modelo, año, color), porque lo normal es registrar al cliente con su auto.
- A la vista, el caso común (pulido 8.2, 26/10): nombre y WhatsApp; placa y tamaño (de a dos desde 640 px). Lo opcional va plegado detrás de "＋ Agregar correo, NIT y notas" y "＋ Agregar marca, modelo, año y color" (`MasDatos`): se abre con un toque y el foco pasa a su primer campo; empieza abierto si trae un valor o un error.
- "Crear cliente" ("Creando…"), en el celular fijo al pie (`PieFormulario`).
- Al crear, lleva a la ficha con el aviso "Cliente <nombre> creado."

### `/panel/clientes/[id]` — Ficha del cliente
Ficha en lectura desde el pulido 8.3 (26/10; skill `pantallas-panel`):
- **Encabezado** compartido: el nombre; insignias "Desactivado" y, para quien ve pagos, "Debe 900 Bs" (como en Saldos pendientes: la suma de los saldos de sus órdenes entregadas sin pagar; una reserva por venir o un trabajo en el taller todavía no se deben: `saldoPendiente`. También para quien tiene Pagos sin Agenda). "Escribir por WhatsApp" (enlace con forma de botón, contorno) y el menú **"Más"** con "Desactivar cliente", que abre la confirmación en un modal ("Sí, desactivar" y "Cancelar", con el foco en "Cancelar"). Desactivado: "Reactivar cliente" como acción del encabezado y la línea "No sale en la lista ni en las búsquedas."
- **Vehículos** y **Datos** lado a lado y del mismo alto en la computadora (en el celular, primero los vehículos):
  - Vehículos: la placa grande, el tamaño y lo que se sepa (marca y modelo, año, color). El lápiz abre el modal "Editar {placa}" y "＋ Agregar", "Agregar vehículo": placa y tamaño a la vista, lo demás plegado como en el alta ("Guardar vehículo" o "Agregar vehículo" y "Cancelar"; al editar, "Desactivar" al pie). Los desactivados, aparte, con "Reactivar".
  - Datos: WhatsApp, correo, NIT, razón social y notas, solo los que tienen valor. "Editar" abre el modal "Datos del cliente" (los campos del alta, "Guardar datos" y "Cancelar").
- Después, **Reservas** (la fila de un toque compartida, con el saldo), **Consultas** y **Mantenimientos** (C2 a C4).
- Secciones de historial: no se muestran en C1 (ver §2).

## 6. Acciones del servidor

Todas validan con Zod (también las que reciben datos sueltos) y empiezan con `exigirModulo`. Devuelven `EstadoFormulario`.

| Acción | Módulo | Entrada | Qué hace | Mensajes |
|---|---|---|---|---|
| `guardarDatosCatalogo` | `catalogo` | `id`, `duracionDias` (1–60), `generaMantenimiento`, `activo` | Actualiza el servicio. Invalida `servicios` (el sitio deja de mostrarlo si queda inactivo) | "Cambios guardados." |
| `guardarPreciosVariante` | `catalogo` | `varianteId`, `duracionDias` (vacío o 1–60), `precios[tamanoId]` (vacío o monto > 0 y ≤ 100 000, hasta 2 decimales) | En una transacción: actualiza la duración e inserta una fila de `precio` **solo por cada tamaño cuyo valor cambió** respecto del vigente (vacío → nulo). Guardar confirma todo el formulario: un tamaño sin cargar que queda vacío pasa a "según evaluación". Si no cambió nada, no escribe | "Precios guardados." · "No había cambios." · por campo: "Escribe solo números, mayor a cero y hasta 100000, por ejemplo 250 o 250,50." |
| `crearCliente` | `clientes` | Datos del cliente y, opcional, del primer vehículo | Inserta cliente (y vehículo) en una transacción. Si el teléfono o la placa existen, no guarda y devuelve el error en el campo con el registro existente | "Cliente <nombre> creado." · "Ese número ya es de <nombre>." con enlace "Abrir su ficha" · "La placa 1234ABC ya está registrada a nombre de <nombre>." con enlace |
| `actualizarCliente` | `clientes` | `id` y datos | Actualiza; mismo control de teléfono duplicado | "Cambios guardados." |
| `cambiarEstadoCliente` | `clientes` | `id`, `activo` | Desactiva o reactiva | "Cliente desactivado." · "Cliente reactivado." |
| `guardarVehiculo` | `clientes` | `clienteId`, `id` (al editar) y datos | Inserta o actualiza; control de placa duplicada | "Vehículo <placa> agregado." · "Cambios guardados." |
| `cambiarEstadoVehiculo` | `clientes` | `clienteId`, `id`, `activo` | Desactiva o reactiva | "<placa> desactivado." · "<placa> reactivado." |

**Consultas** (`src/modulos/catalogo/consultas.ts` y `src/modulos/clientes/consultas.ts`): `listarCatalogo`, `obtenerServicioCatalogo` (con precios vigentes por variante y tamaño), `historialPrecios(varianteId)`, `buscarClientes(q, verDesactivados)`, `obtenerCliente(id)` (con vehículos). Los precios vigentes salen con `DISTINCT ON (variante_id, tamano_id) … ORDER BY vigente_desde DESC, id DESC`.

**Funciones puras** (con prueba unitaria): `normalizarPlaca`, `normalizarBusqueda` (separa dígitos para teléfono y texto para nombre y placa), `duracionEfectiva(servicio, variante)`, `preciosCambiados(vigentes, enviados)` y `estadoPrecios(variantes, tamaños, vigentes)` (cuántos faltan).

## 7. Componentes y diseño

- Reutiliza: `Campo`, `Input`, `Selector`, `Checkbox`, `Button`, `Dialog`, `EnlaceVolver`, `EstadoVacio`, `Cargando`, `useFocoEnError`, `conAviso`, la tabla y tarjetas de Reclamos y Usuarios, y el patrón de lista editable de 6.2 para los vehículos.
- Nuevos:
  - `CampoMonto` (`src/componentes/panel/campo-monto.tsx`): número con "Bs" después (como 6.3), `inputMode="decimal"`, acepta coma o punto.
  - `BuscadorClientes` (cliente): campo de búsqueda que actualiza `?q=` con pausa, sin perder el foco ni la posición del cursor.
- Módulos: `src/modulos/catalogo/` y `src/modulos/clientes/` (acciones, consultas, esquemas, componentes), según la estructura del proyecto.
- `MODULOS.catalogo.construido` y `MODULOS.clientes.construido` pasan a `true`.

## 8. Textos de la interfaz

- Menú: "Catálogo y precios", "Clientes".
- Catálogo: "Los precios no salen en el sitio." · "Desde N Bs" · "Según evaluación" · "Faltan N precios" · "Con mantenimiento" · "Inactivo".
- Servicio: "Duración estimada" (ayuda: "Los días que suele ocupar un espacio. Solo sugiere la entrega al agendar.") · "Genera recordatorio de mantenimiento" (ayuda: "Al entregarlo, se programa el aviso.") · "Activo en el catálogo" (ayuda: "Inactivo, no se cotiza ni sale en el sitio. No se borra nada.") · "Guardar datos".
- Precios: "Precios" · "Vacío: «Según evaluación», cuando depende de ver el vehículo." · "Según evaluación" · "Sin cargar" · "Duración propia" (ayuda: "Vacío: usa la del servicio (N días).") · "Guardar precios" · "Ver historial" · historial vacío: "Todavía no hay cambios de precio."
- Clientes: "Buscar por nombre, teléfono o placa" · "Agregar cliente" · "Ver desactivados".
- Cliente: "Nombre" · "WhatsApp" (ayuda: "Celular de Bolivia, 8 dígitos.") · "Correo" · "NIT" · "Razón social" · "Notas" (ayuda: "Lo que convenga recordar: cómo prefiere que lo contacten, detalles del vehículo…").
- Vehículo: "Placa" · "Tamaño" (ayuda con los modelos de ejemplo del tamaño elegido) · "Marca" · "Modelo" · "Año" · "Color" · "Agregar vehículo" · "Primer vehículo (opcional)".
- Errores: "Escribe el nombre." · "Escribe los 8 dígitos del celular." · "Escribe la placa." · "Elige el tamaño." · "Escribe un año entre 1950 y <año siguiente>." · "Escribe un correo válido." · "El NIT lleva solo números."

## 9. Pruebas

- **Unitarias** (`tests/unit/`):
  - `normalizarPlaca`, `normalizarBusqueda`.
  - `duracionEfectiva`: la de la variante pisa la del servicio.
  - `preciosCambiados`: solo los que cambian; un monto igual o seguir en "según evaluación" no es cambio; un tamaño sin cargar que queda vacío pasa a "según evaluación".
  - `estadoPrecios`: cuenta los faltantes solo con variantes y tamaños activos.
  - Permisos: `catalogo` solo el dueño; `clientes` dueño y encargado con el permiso; el técnico nunca (se suma a `permisos.test.ts`).
- **De punta a punta** (`tests/e2e/`):
  - `hu-19-20-catalogo`: el dueño carga precios y uno queda "según evaluación"; cambia uno y el historial muestra anterior, nuevo, fecha y quién; un cambio sin diferencias no crea filas; marca "genera mantenimiento" y cambia la duración; un servicio inactivo deja de salir en el sitio; el encargado y el técnico no entran al catálogo.
  - `hu-21-clientes`: crear cliente con su primer vehículo; teléfono y placa duplicados avisan y llevan a la ficha existente; editar y desactivar.
  - `hu-22-buscar`: encuentra por parte del nombre sin tilde, por teléfono parcial y por placa con guion; los resultados aparecen sin apretar nada.
  - `hu-23-ficha`: datos, vehículos (agregar, editar, desactivar) y el enlace de WhatsApp; el encargado con "Clientes" entra y el técnico no.
  - A 360 px, ninguna de las pantallas nuevas se sale de la pantalla.

## 10. Orden de trabajo

Una rama y un PR por historia, desde `develop`:
1. `hu-19-catalogo-variantes`: esta especificación, migración de `servicio` (duración y mantenimiento), módulo `catalogo` con la lista y la página del servicio (datos del catálogo). La duración entra aquí porque es una columna del servicio.
2. `hu-20-precios-duracion`: tabla `precio`, `CampoMonto`, formularios de precios por variante con duración propia, historial.
3. `hu-21-clientes-vehiculos`: tablas `cliente` y `vehiculo`, módulo `clientes`, agregar cliente con primer vehículo, duplicados. Trae una lista sin buscador (los 30 más recientes) y una ficha de solo lectura (datos y vehículos), para tener dónde llegar al crear; HU-22 y HU-23 las completan.
4. `hu-22-buscar-clientes`: lista con `BuscadorClientes`, `unaccent`.
5. `hu-23-ficha-cliente`: ficha con edición, vehículos y desactivar.

Cada PR: lint, typecheck, unitarias, E2E completo y knip; capturas a 360 y 1280 px.

## 11. Criterio de salida

- El dueño carga precios de prueba de un servicio, cambia uno y ve el historial; ningún cambio altera filas anteriores.
- Un servicio inactivo no sale en el sitio y su página responde como no encontrada.
- Un cliente con su vehículo se registra en menos de un minuto desde el celular; los duplicados se detectan y llevan al registro existente.
- La búsqueda encuentra por nombre sin tilde, teléfono parcial y placa.
- Encargado sin "Clientes" y técnico: no ven ni entran a Clientes; nadie más que el dueño ve el catálogo.
- En la demo: cargar precios de un servicio, registrar un cliente con su auto y encontrarlo por placa.

## 12. Decisiones abiertas

| Qué | De quién | Mientras tanto |
|---|---|---|
| Lista de precios real, y variantes de inyección y succión y de pulido de vidrios | Dueño | Precios de prueba solo en E2E; en la base real, "Sin cargar" |
| Duración real de cada servicio | Dueño | 1 día por defecto, editable |
| La duración no es exacta: varía con el vehículo y el trabajo, y hay retrasos (YankoSoft, 20/10) | Decidido | Es una **estimación que sugiere, nunca impone**. Se carga el caso más largo habitual. **C3:** al agendar, la fecha de entrega se completa con la duración y se puede cambiar; al cliente se le da como aproximada. **C4:** "Extender la entrega" corre la fecha de fin; si el espacio ya está ocupado ese día, avisa y propone otro espacio libre (D-5 impide el cruce); si termina antes, se marca listo y el espacio se libera. Descartado por ahora: rango mínimo y máximo, duración por tamaño y duración en horas (la agenda es por días, RN-06) |
| ¿Clientes con celular extranjero? | Dueño | Solo Bolivia (8 dígitos, 6 o 7). Si hace falta, se amplía `normalizarWhatsApp` |
| ¿Dos clientes pueden compartir un vehículo (ej. familia)? | Dueño | No: la placa es única y pertenece a un cliente. Si un vehículo cambia de dueño, el aviso de placa duplicada lleva a la ficha del anterior; ahí se desactiva y se registra con el nuevo (la placa es única solo entre los activos, así el historial queda con el dueño anterior) |
