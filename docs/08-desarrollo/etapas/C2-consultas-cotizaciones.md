# C2 Consultas y cotizaciones — especificación

- **Fase y semana:** C. Entrega 2 · semana 3
- **Estado:** aprobada (20 de octubre de 2026); en curso: HU-24
- **Historias:** HU-24 Registrar consulta · HU-25 Armar cotización · HU-26 PDF de la cotización · HU-27 Compartir el PDF · HU-28 Seguimiento de consultas
- **Base:**
  - Requisitos: RF-29 a RF-35; RNF-01, RNF-05, RNF-07, RNF-08, RNF-10, RNF-11.
  - Reglas: RN-01 (solo el dueño cotiza), RN-02 (una cotización enviada no cambia: modificarla crea otra versión), RN-03 (estimado por fotos), RN-04 (adelanto sugerido editable), RN-12 (el técnico no ve precios); S-5 (la validez se define en cada cotización).
  - Modelo: D-3, D-4 (las líneas copian descripción y precio), D-6, D-9, D-10. Tablas `consulta`, `consulta_archivo`, `cotizacion`, `cotizacion_linea`, `cotizacion_foto` y `auditoria` (viene de C1).
  - Casos de uso: CU-10, CU-11, CU-12. Flujo crítico 1 de `05-analisis/diagramas-de-secuencia/flujos-criticos.md`.
  - Arquitectura: PDF con `@react-pdf/renderer` en el servidor, guardado en R2 y nunca regenerado; compartir con la Web Share API (con archivo), y si no se puede, descarga.

Esta especificación se escribe al empezar la etapa, con lo aprendido en las anteriores. Se programa contra ella; si algo cambia durante la etapa, se corrige aquí primero.

## 1. Objetivo

El personal registra cada consulta (cliente, vehículo, servicio, canal, fotos o videos y nota) sin perder ninguna y ve cuáles se están enfriando. El dueño arma la cotización con los precios del catálogo según el tamaño del vehículo, genera un PDF con la identidad de TocTar y lo manda por WhatsApp desde el celular. Una cotización enviada no cambia: corregirla crea otra versión.

## 2. Alcance

**Incluye:**
- **Consultas (HU-24, HU-28), dueño y encargado con el módulo "Consultas":**
  - Nueva consulta: elegir al cliente con el buscador de C1 o registrarlo ahí mismo (nombre, WhatsApp, placa y tamaño), elegir o agregar el vehículo, servicio de interés (opcional), canal (WhatsApp o taller) y nota.
  - Fotos y videos de la consulta, en la página de la consulta (privados, como los de reclamos).
  - Lista por estado (consultó, cotizado, confirmado, perdido) con los días desde el último movimiento, del más antiguo al más nuevo.
  - Marcar una consulta como perdida con motivo (precio, no respondió, otro) y reabrirla.
  - Desde la ficha del cliente (C1): "Nueva consulta" con el cliente ya elegido, y la lista de sus consultas.
- **Cotizaciones (HU-25 a HU-27), solo el dueño (RN-01):**
  - Cotizar desde una consulta: líneas de servicio y variante con el precio sugerido según el tamaño del vehículo (editable; "según evaluación" obliga a escribirlo), descuento en Bs, total, adelanto sugerido (de Configuración, editable), validez (sugerida por Configuración, S-5), estimado por fotos (RN-03) y hasta 4 fotos de la consulta para el PDF.
  - Al guardar: número correlativo por año (`2026-0042`), PDF generado y guardado, y la consulta pasa a "cotizado".
  - Corregir una cotización crea la versión siguiente con el mismo número; la anterior queda "reemplazada" con su PDF intacto (RN-02, RF-34).
  - PDF en A4 con la identidad visual (HU-26).
  - Compartir el PDF desde el celular con el menú del teléfono; en la computadora, descargar o imprimir (HU-27).
- **Auditoría (RNF-10):** quién y cuándo crea cada cotización o versión.
- **Parámetros nuevos**, editables en Configuración > Cotizaciones (RNF-11): "Formas de pago" del PDF y los días para resaltar una consulta que se enfría.
- **Módulos construidos:** "Consultas" (con permiso de encargado) y "Cotizaciones" (solo el dueño, sin menú propio: se entra desde cada consulta).

**No incluye** (y dónde queda):
- **Confirmar la cotización y agendar** ("confirmado", cotización "aceptada"): C3, con la reserva.
- **Historial de órdenes y pagos en la ficha del cliente:** C3 y C4.
- **Enviar el PDF por la API de WhatsApp:** fuera de alcance (arquitectura). Se comparte con el menú del teléfono.
- **Borradores de cotización:** guardar es enviar. Una cotización se corrige con otra versión.
- **Plantillas de cotización o paquetes de servicios:** no pedidos.

## 3. Reglas que se cumplen

| Regla | Qué dice | Dónde se garantiza |
|---|---|---|
| RF-29 | Consulta con cliente, vehículo, servicio, canal, fotos o videos y nota | `consulta` y `consulta_archivo`; esquema Zod compartido |
| RF-30 | Estados consultó, cotizado, confirmado, perdido (con motivo) | CHECK en `consulta.estado` y `consulta.motivo_perdida`; transiciones en una función pura (`transicionPermitida`) |
| RF-31 | El dueño cotiza con precio sugerido del catálogo, descuento, total, adelanto, validez y fotos | Precio vigente de `precio` (C1) por la variante y el tamaño del vehículo; totales con una función pura (`calcularTotales`) |
| RF-32 | PDF con logo, datos, detalle, total, validez, condiciones, garantía, formas de pago, adelanto y fotos | Plantilla de `@react-pdf/renderer` en `src/modulos/cotizaciones/pdf/` |
| RF-33 | Descargar, imprimir o compartir desde el celular | Ruta que entrega el PDF con sesión; botón "Compartir" con `navigator.share({ files })` y descarga si no se puede |
| RF-34, RN-02 | Una cotización enviada no cambia; modificarla crea otra versión | `cotizacion` no tiene acción de editar. Las líneas copian descripción y precio (D-4). El PDF se guarda en R2 y no se regenera. Índice único (`numero`, `version`) |
| RF-35 | Lista por estado con días desde el último contacto | `consulta.ultimo_movimiento_at`, que se actualiza al crear, cotizar, cambiar de estado, agregar fotos o editar la nota |
| RN-01 | Solo el dueño cotiza | Módulo `cotizaciones` sin permiso de encargado (ya en `src/lib/permisos.ts`). `exigirModulo("cotizaciones")` en la página, en cada acción y en la ruta del PDF (RNF-05) |
| RN-03 | Cotización por fotos = estimado | `cotizacion.es_estimado`; el PDF lo dice arriba y en las condiciones. Se sugiere marcado si la consulta llegó por WhatsApp |
| RN-04 | Adelanto sugerido editable | Se completa con el parámetro y se puede cambiar en cada cotización; no puede pasar el total |
| RN-12 | El técnico no ve precios | Ni Consultas ni Cotizaciones tienen acceso de técnico |
| S-5 | La validez se define en cada cotización | `cotizacion.valida_hasta`, completada con hoy + los días de Configuración |
| RNF-07 | Fotos comprimidas, videos con tamaño máximo | Fotos: `achicarFoto` y `guardarFoto(..., { privado: true })`. Videos: hasta 50 MB y 60 s, sin procesar (§12) |
| RNF-10 | Quién y cuándo crea o cambia cotizaciones | `auditoria` (acción `crear` o `nueva_version`) y `cotizacion.created_by` |
| RNF-11 | Nada fijo en el código | Adelanto, validez, condiciones, garantía y formas de pago salen de `parametro` |

## 4. Datos

Migraciones por historia: `0020_consultas` (HU-24: `consulta`, `consulta_archivo`, `auditoria` y `archivo.duracion_segundos`), `0021_datos_seguimiento` (HU-28: parámetro `dias_consulta_fria`), `0022_cotizaciones` (HU-25: `cotizacion`, `cotizacion_linea`, `cotizacion_foto`, `correlativo`) y `0023_datos_cotizaciones` (parámetro `formas_pago_cotizacion`).

### `consulta`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `cliente_id` | `integer` | no | FK `cliente` |
| `vehiculo_id` | `integer` | no | FK `vehiculo`; del mismo cliente (se valida en la acción). La cotización necesita su tamaño |
| `servicio_id` | `integer` | sí | FK `servicio`. Vacío: "todavía no sabe" |
| `canal` | `text` | no | CHECK `whatsapp`, `taller` |
| `estado` | `text` | no | CHECK `consulto`, `cotizado`, `confirmado`, `perdido`. Por defecto `consulto` |
| `motivo_perdida` | `text` | sí | CHECK `precio`, `no_respondio`, `otro`. Solo con estado `perdido` (CHECK) |
| `detalle_perdida` | `text` | sí | Hasta 300 |
| `nota` | `text` | sí | Hasta 2000 |
| `ultimo_movimiento_at` | `timestamptz` | no | Por defecto `now()` |
| `created_at` | `timestamptz` | no | |
| `created_by` | `integer` | no | FK `usuario` |

Índices: (`estado`, `ultimo_movimiento_at`) para la lista; (`cliente_id`) para la ficha.

### `consulta_archivo`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `consulta_id` | `integer` | no | FK `consulta` |
| `archivo_id` | `integer` | no | FK `archivo`; privado |
| `orden` | `integer` | no | |

PK (`consulta_id`, `archivo_id`). Hasta 10 por consulta (se valida en la acción).

### `archivo` (cambio)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `duracion_segundos` | `integer` | sí | Solo videos: la que informa el navegador al subir (§12) |

### `auditoria`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `usuario_id` | `integer` | no | FK `usuario` |
| `entidad` | `text` | no | `cotizacion` en C2; `pago` en C3 |
| `entidad_id` | `integer` | no | |
| `accion` | `text` | no | `crear`, `nueva_version` |
| `datos` | `jsonb` | no | Lo esencial del cambio (número, versión, total) |
| `created_at` | `timestamptz` | no | |

### `cotizacion`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `consulta_id` | `integer` | no | FK `consulta` |
| `numero` | `text` | no | `2026-0042`: año de Bolivia y correlativo del año. Las versiones lo comparten |
| `version` | `integer` | no | 1, 2, 3… Único (`numero`, `version`) |
| `es_estimado` | `boolean` | no | RN-03 |
| `subtotal`, `descuento`, `total` | `numeric(10,2)` | no | CHECK `descuento >= 0`, `total = subtotal - descuento`, `total >= 0` |
| `adelanto_sugerido` | `numeric(10,2)` | no | CHECK entre 0 y el total |
| `valida_hasta` | `date` | no | S-5 |
| `condiciones`, `garantia`, `formas_pago` | `text` | no | Copiados de Configuración al guardar (D-4): un cambio después no toca el PDF |
| `estado` | `text` | no | CHECK `enviada`, `reemplazada`, `aceptada` (`aceptada` llega en C3) |
| `pdf_archivo_id` | `integer` | sí | FK `archivo`, privado. Vacío solo mientras se genera; HU-26 lo llena en la misma acción |
| `created_at` | `timestamptz` | no | |
| `created_by` | `integer` | no | FK `usuario` |

### `cotizacion_linea`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `cotizacion_id` | `integer` | no | FK `cotizacion` |
| `variante_id` | `integer` | no | FK `variante` |
| `tamano_id` | `integer` | no | FK `tamano_vehiculo`: el del vehículo al cotizar |
| `descripcion` | `text` | no | "Pulido y nano cerámico — 5 años", copiado (D-4) |
| `precio_sugerido` | `numeric(10,2)` | sí | El vigente del catálogo al cotizar; vacío si era "según evaluación" |
| `precio` | `numeric(10,2)` | no | CHECK `> 0` |
| `orden` | `integer` | no | |

### `cotizacion_foto`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `cotizacion_id` | `integer` | no | FK `cotizacion` |
| `archivo_id` | `integer` | no | FK `archivo` (una foto de la consulta) |
| `orden` | `integer` | no | Hasta 4 |

### `correlativo`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `clave` | `text` | no | PK: `cotizacion-2026` |
| `ultimo` | `integer` | no | |

`INSERT … ON CONFLICT (clave) DO UPDATE SET ultimo = correlativo.ultimo + 1 RETURNING ultimo`, dentro de la transacción que crea la cotización: dos cotizaciones al mismo tiempo no repiten número.

**Datos iniciales:** parámetro `dias_consulta_fria` = 7 (`0021`) y `formas_pago_cotizacion` = "Efectivo, QR o transferencia bancaria." (`0023`). El dueño los corrige en Configuración > Cotizaciones.

## 5. Pantallas y rutas

Todas con `exigirModulo` dentro de `<Suspense>`, el estándar del panel y sin desborde a 360 px.

### `/panel/consultas` — Consultas (dueño y encargado con "Consultas")
- Arriba: "Nueva consulta" (enlace con forma de botón, rojo).
- Pestañas por estado con su cantidad: "Abiertas (n)" (consultó y cotizado, la vista por defecto), "Confirmadas", "Perdidas".
- Cada consulta: cliente, vehículo (placa), servicio, estado y "hace N días" desde el último movimiento; las más antiguas primero. Desde 7 días se resalta (borde de aviso): se está enfriando. El umbral sale de Configuración (§12).
- Celular: tarjetas tocables enteras. Computadora: tabla con la fila tocable.

### `/panel/consultas/nueva` — Nueva consulta
- **Cliente:** buscador (el de C1, en modo "elegir"). Al elegir, sus vehículos activos como opciones. "Cliente nuevo" despliega nombre, WhatsApp, placa y tamaño, con el aviso de repetidos de C1.
- **Vehículo:** opciones del cliente o "Otro vehículo" (placa y tamaño).
- **Servicio de interés** (opcional), **canal** (WhatsApp o taller) y **nota**.
- `?cliente=<id>` llega con el cliente elegido (desde su ficha).
- Al guardar, va a la consulta, con la invitación a agregar fotos o videos.

### `/panel/consultas/[id]` — Consulta
- Cliente (enlace a su ficha), vehículo, servicio, canal, estado y fecha. Botón "Escribir por WhatsApp".
- **Fotos y videos:** subir (fotos achicadas en el celular; videos según §12), verlos en grande, quitar.
- **Nota:** editable.
- **Cotizaciones** (dueño): versiones, de la más nueva a la más vieja, con número, versión, fecha, total, validez y estado; "Ver PDF" y "Compartir" en cada una; "Cotizar" si no hay ninguna; "Corregir (nueva versión)" en la vigente. El encargado ve la lista sin montos ni PDF (RN-01: no envía cotizaciones).
- **Estado:** "Marcar como perdida" (motivo y detalle) o "Reabrir".

### `/panel/consultas/[id]/cotizar` — Cotizar (solo el dueño)
- Encabezado: cliente, vehículo y su **tamaño** (de él salen los precios).
- **Líneas:** "Agregar servicio" con un selector de servicio y variante (solo activos). Al elegir, el precio sugerido del tamaño; si es "según evaluación", el campo queda vacío y obligatorio. Precio editable, quitar línea, subir y bajar.
- **Descuento** en Bs (opcional). **Subtotal, descuento y total** se calculan mientras se escribe (también en el servidor).
- **Adelanto sugerido:** el de Configuración, editable (RN-04).
- **Validez:** "Válida hasta" con la fecha de hoy + los días de Configuración (S-5).
- **Estimado por fotos:** casilla, marcada si la consulta llegó por WhatsApp (RN-03).
- **Fotos para el PDF:** casillas con las fotos de la consulta, hasta 4.
- "Guardar y generar PDF". `?desde=<cotizacionId>` llega con las líneas, el descuento y las fotos de esa versión: guardar crea la versión siguiente.

### `/panel/cotizaciones/[id]/pdf` — PDF (ruta, solo el dueño)
- Con sesión y `exigirModulo("cotizaciones")`: redirige al enlace firmado del PDF en el bucket privado (15 min). `?descargar=1` lo pide como descarga.

## 6. Acciones del servidor

Todas validan con Zod (también las de datos sueltos) y empiezan con `exigirModulo`.

| Acción | Módulo | Qué hace | Mensajes |
|---|---|---|---|
| `crearConsulta` | `consultas` | Cliente elegido o nuevo (reglas de C1); vehículo elegido o nuevo; crea la consulta en "consultó". Todo en una transacción | "Consulta registrada." · los de C1 para repetidos |
| `subirArchivoConsulta` | `consultas` | Foto (achicada en el navegador, WebP en el servidor, privada) o video (§12). Hasta 10 | "Foto agregada." · "Video agregado." · "Hasta 10 fotos o videos por consulta." |
| `quitarArchivoConsulta` | `consultas` | Lo quita de la consulta y del almacenamiento, salvo que lo use una cotización (D-6) | "Quitado." · "Esa foto está en una cotización: no se quita." |
| `guardarNota` | `consultas` | Actualiza la nota y el último movimiento | "Nota guardada." |
| `cambiarEstadoConsulta` | `consultas` | Perdida (con motivo) o reabrir, según `transicionPermitida` | "Marcada como perdida." · "Consulta reabierta." |
| `guardarCotizacion` | `cotizaciones` | Valida líneas (variante activa del servicio, precio > 0), descuento, adelanto y validez; recalcula los totales; en una transacción: número (o el de la versión anterior y versión + 1), cotización, líneas, fotos, auditoría, versión anterior a "reemplazada" y consulta a "cotizado"; genera el PDF y lo guarda | "Cotización 2026-0042 lista." · "Versión 2 de la cotización 2026-0042 lista." · por campo |

**Consultas** (`src/modulos/consultas/consultas.ts`, `src/modulos/cotizaciones/consultas.ts`): `listarConsultas(estado)`, `obtenerConsulta(id)`, `consultasDelCliente(id)`, `datosParaCotizar(consultaId, desde?)`, `cotizacionesDeConsulta(id)`.

**Funciones puras** (con prueba unitaria): `transicionPermitida(estado, destino)`, `calcularTotales(lineas, descuento)`, `numeroCotizacion(anio, correlativo)`, `precioSugerido(vigentes, tamanoId)`, `diasDesde(instante, hoy)` (en hora de Bolivia), `fechaValidez(hoy, dias)`.

## 7. Componentes y diseño

- Reutiliza: `Campo`, `CampoMonto` (C1), `Selector`, `Checkbox`, `Button`, `Dialog`, `EnlaceVolver`, `EstadoVacio`, `TextoCorto`, `useFocoEnError`, `conAviso`, `CamposCliente` y `CamposVehiculo` (C1), `BuscadorClientes` (C1, con un modo para elegir), `achicarFoto` y la vista de fotos de los reclamos.
- Nuevos: `ElegirCliente` (buscador + resultados que se eligen + "Cliente nuevo"), `LineasCotizacion` (con `EditorLista`), `CompartirPdf` (Web Share API con archivo, o descarga), `PdfCotizacion` (plantilla de `@react-pdf/renderer`).
- **PDF:** A4, márgenes de 15 mm. Arriba el logo para documentos (Configuración) o el de la marca sobre claro, y los datos del negocio; "Cotización 2026-0042" en Barlow Condensed itálica con la línea roja de la marca; fecha, versión y validez; cliente y vehículo; tabla de servicios con sus precios; subtotal, descuento, total y adelanto en Montserrat; si es estimado, un recuadro "Estimado según fotos: el precio se confirma al ver el vehículo"; formas de pago, condiciones y garantía; hasta 4 fotos en una grilla de 2 × 2. Fuentes en TTF (licencia OFL) en `src/modulos/cotizaciones/pdf/fuentes/`: el PDF no lee las de la web (WOFF2). Las imágenes (WebP) se convierten a JPEG o PNG con `sharp` al generar, porque `@react-pdf/renderer` no lee WebP.

## 8. Textos de la interfaz

- Menú: "Consultas". En la ficha del cliente: "Nueva consulta" y la sección "Consultas".
- Lista: "Nueva consulta" · "Abiertas" · "Confirmadas" · "Perdidas" · "hace N días" · "hoy" · vacíos: "No hay consultas abiertas." · "No hay consultas perdidas.".
- Nueva consulta: "Cliente" · "Buscar por nombre, teléfono o placa" · "Cliente nuevo" · "Vehículo" · "Otro vehículo" · "Servicio de interés" (opción "Todavía no sabe") · "Canal": "WhatsApp" / "En el taller" · "Nota" · "Registrar consulta".
- Consulta: "Fotos y videos" (ayuda: "Lo que mandó el cliente o lo que viste en el taller. Hasta 10.") · "Agregar fotos o videos" · "Cotizar" · "Corregir (nueva versión)" · "Ver PDF" · "Compartir" · "Marcar como perdida" · motivos: "Precio", "No respondió", "Otro" · "Reabrir".
- Cotizar: "Agregar servicio" · "Precio sugerido: 450 Bs" · "Según evaluación: escribe el precio" · "Descuento" · "Subtotal" · "Total" · "Adelanto sugerido" · "Válida hasta" · "Estimado según fotos o video" (ayuda: "El PDF avisa que el precio se confirma al ver el vehículo.") · "Fotos para el PDF (hasta 4)" · "Guardar y generar PDF".
- Errores: "Elige el cliente." · "Elige el vehículo." · "Agrega al menos un servicio." · "Escribe el precio." · "El descuento no puede ser mayor que el subtotal." · "El adelanto no puede ser mayor que el total." · "La validez no puede ser anterior a hoy." · "Hasta 4 fotos.".

## 9. Pruebas

- **Unitarias** (`tests/unit/`):
  - `transicionPermitida`: consultó → cotizado, perdido; cotizado → perdido; perdido → reabrir al estado anterior; confirmado solo desde C3.
  - `calcularTotales`: suma, descuento, total nunca negativo, redondeo a 2 decimales.
  - `numeroCotizacion`: `2026-0042`; el año es el de Bolivia (una cotización del 31/12 a las 22:00 en La Paz es del año que termina).
  - `precioSugerido`: vigente, "según evaluación" y "sin cargar".
  - `diasDesde` y `fechaValidez`, en hora de Bolivia.
  - Permisos: `cotizaciones` solo el dueño; `consultas` dueño y encargado con el permiso; el técnico nunca.
- **De punta a punta** (`tests/e2e/`):
  - `hu-24-consultas`: consulta con un cliente existente y con uno nuevo (con el aviso de repetidos); fotos; desde la ficha del cliente.
  - `hu-28-seguimiento`: la lista por estado y antigüedad; perdida con motivo y reabrir.
  - `hu-25-26-cotizar` (flujo crítico 1): precio sugerido por tamaño, "según evaluación" obliga a escribir, descuento y totales; el PDF existe y empieza con `%PDF`; la consulta pasa a "cotizado"; una nueva versión no cambia el PDF anterior (mismo contenido, comparado por hash).
  - `hu-27-compartir`: con `navigator.share` simulado recibe el PDF; sin él, se descarga.
  - RN-01: el encargado con todos sus permisos y el técnico reciben "sin acceso" al cotizar por URL y en la ruta del PDF.
  - A 360 px, ninguna pantalla nueva se sale.

## 10. Orden de trabajo

Una rama y un PR por historia, desde `develop`:
1. `hu-24-registrar-consulta`: esta especificación; tablas `consulta`, `consulta_archivo`, `auditoria`; módulo `consultas`; nueva consulta con `ElegirCliente`; página de la consulta con fotos y nota; "Nueva consulta" en la ficha del cliente. Los videos, en un PR aparte de la misma historia (`hu-24-videos`), porque necesitan la subida directa al almacenamiento (§12).
2. `hu-28-seguimiento-consultas`: lista por estado y antigüedad, perdida y reabrir.
3. `hu-25-armar-cotizacion`: tablas de cotización, correlativo, parámetro de formas de pago; pantalla de cotizar y versiones. Guarda sin PDF todavía.
4. `hu-26-pdf-cotizacion`: `@react-pdf/renderer`, fuentes TTF, plantilla, generación al guardar, ruta del PDF.
5. `hu-27-compartir-pdf`: `CompartirPdf`.

Cada PR: lint, typecheck, unitarias, E2E completo y knip; capturas a 360 y 1280 px; el PDF revisado a mano (impreso en A4 y en el celular).

## 11. Criterio de salida

- Una consulta se registra desde el celular en menos de un minuto, también con un cliente nuevo.
- El dueño cotiza con los precios del catálogo, genera el PDF y lo comparte por WhatsApp desde el celular.
- Una versión nueva no cambia el PDF ni los precios de la anterior.
- El técnico y el encargado reciben "sin acceso" al intentar cotizar, por URL y por la acción del servidor.
- En la demo: registrar una consulta por WhatsApp con fotos, cotizarla, mandar el PDF y corregirla con una versión 2.

## 12. Decisiones abiertas

| Qué | De quién | Mientras tanto |
|---|---|---|
| Texto de formas de pago para el PDF | Dueño | "Efectivo, QR o transferencia bancaria.", editable en Configuración |
| Condiciones y garantía definitivas | Dueño (viernes 30) | Los borradores de B2, editables |
| Videos: hasta 50 MB y 60 s (arquitectura). Una acción del servidor acepta hasta 6 MB, así que el video sube directo al bucket privado con una URL firmada de 10 minutos, y después se registra; el servidor comprueba el tamaño y el tipo. La duración la mide el navegador | YankoSoft | Hace falta permitir la subida desde el navegador (CORS) en el bucket privado: en RustFS para desarrollo y en R2 al desplegar (A3) |
| Días para resaltar una consulta que se enfría | Dueño | 7, como parámetro nuevo `dias_consulta_fria` en Configuración |
| ¿El encargado ve montos y PDF de las cotizaciones? | Dueño | No: ve que está cotizada y su número (RN-01 dice que solo el dueño envía). Se abre si el dueño lo pide |
| Descuento en Bs o en porcentaje | Dueño | En Bs |
| Cuántas fotos en el PDF | Dueño | Hasta 4 |
