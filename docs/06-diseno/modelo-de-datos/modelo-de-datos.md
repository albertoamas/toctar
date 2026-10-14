# Modelo de datos — TocTar Detailing

- **Versión:** borrador 1 · 10 de octubre de 2026
- **Base:** requerimientos aprobados y análisis (etapa 5)
- **Motor:** PostgreSQL

El modelo cubre el **Sistema completo**, aunque hoy se programa solo Web + Gestión. Las tablas marcadas como *Futuro* no se crean todavía, pero las actuales ya dejan su lugar: sumar inventario, planilla, caja, factura SIAT o una segunda sucursal no obliga a rehacer tablas (RNF-13).

## Decisiones de diseño

| # | Decisión | Por qué |
|---|---|---|
| D-1 | **Reserva y orden son una sola tabla: `trabajo`**, con estados agendado → recibido → en proceso → listo → entregado (o cancelado). | El adelanto se paga en la reserva y el saldo en la orden; con una sola tabla, pagos, servicios y fotos no se copian ni se desincronizan. En pantalla siguen siendo "reserva" y "orden". |
| D-2 | **Todo servicio tiene al menos una variante** (si no tiene opciones, una llamada "Única"). | Precios, cotizaciones y trabajos siempre apuntan a una variante: una sola regla, sin casos especiales. |
| D-3 | **Los precios no se sobrescriben:** cada cambio es una fila nueva con fecha (`precio`). | Historial de precios (RF-28) gratis. |
| D-4 | **Las líneas de cotización y de trabajo copian descripción y precio.** | Una cotización enviada no cambia si después cambia el catálogo (RN-02). |
| D-5 | **Cruces de agenda imposibles en la base de datos:** restricción de exclusión sobre `(espacio_id, rango de fechas)` para trabajos activos. | RN-06 se cumple aunque dos personas reserven al mismo tiempo. |
| D-6 | **Nada se borra si tiene historial:** campo `activo` o estado `anulado`. | RN-14 y auditoría. |
| D-7 | **`sucursal_id` desde el inicio** en espacios, trabajos y (futuro) caja e inventario. Hoy hay una sola sucursal. | Segunda sucursal sin migración grande. |
| D-8 | **Parámetros como tabla clave-valor validada en código** (`parametro`). | Agregar un parámetro no requiere migración (RNF-11). |
| D-9 | **Montos en `numeric(10,2)`**, fechas de agenda en `date`, marcas de tiempo en `timestamptz` (America/La_Paz al mostrar). | Sin errores de redondeo ni de zona horaria. |
| D-10 | **Archivos en una tabla común (`archivo`)**; el binario va al almacenamiento de fotos, la base guarda solo la referencia. | La base queda liviana y los respaldos son rápidos. |

## Diagrama entidad-relación (núcleo)

```mermaid
erDiagram
    SUCURSAL ||--o{ ESPACIO_TALLER : tiene
    USUARIO ||--o{ USUARIO_PERMISO : tiene

    SERVICIO ||--|{ VARIANTE : tiene
    VARIANTE ||--o{ PRECIO : "historial de"
    TAMANO_VEHICULO ||--o{ PRECIO : define

    CLIENTE ||--o{ VEHICULO : tiene
    TAMANO_VEHICULO ||--o{ VEHICULO : clasifica

    CLIENTE ||--o{ CONSULTA : hace
    VEHICULO ||--o{ CONSULTA : sobre
    CONSULTA ||--o{ COTIZACION : "versiones"
    COTIZACION ||--|{ COTIZACION_LINEA : detalla
    VARIANTE ||--o{ COTIZACION_LINEA : cotiza

    COTIZACION |o--o| TRABAJO : origina
    CLIENTE ||--o{ TRABAJO : contrata
    VEHICULO ||--o{ TRABAJO : recibe
    ESPACIO_TALLER ||--o{ TRABAJO : ocupa
    USUARIO |o--o{ TRABAJO : "técnico asignado"
    TRABAJO ||--|{ TRABAJO_LINEA : incluye
    TRABAJO ||--o{ TRABAJO_FOTO : documenta
    TRABAJO ||--o{ TRABAJO_AVANCE : registra
    TRABAJO ||--o{ PAGO : cobra

    TRABAJO ||--o{ RECORDATORIO_MANTENIMIENTO : genera
    RECORDATORIO_MANTENIMIENTO |o--o| TRABAJO : "agenda nuevo"

    SERVICIO ||--o{ GALERIA_ITEM : ilustra
```

Las relaciones con `archivo` (fotos y PDF) y con `usuario` como autor (`created_by`) se omiten del diagrama para que se lea.

## Tablas

Convenciones: `id` es `bigint` autoincremental; todas las tablas tienen `created_at` y, donde corresponde, `updated_at` y `created_by` (usuario). Solo se listan los campos propios.

### Configuración y accesos (entrega 1)

| Tabla | Campos | Notas |
|---|---|---|
| `negocio` | nombre, logo_archivo_id, correo, redes (json), nit, razon_social | Una sola fila |
| `sucursal` | nombre, direccion, lat, lng, horarios (json), telefono_whatsapp, activo | Hoy una fila |
| `parametro` | clave (pk), valor (jsonb) | Adelanto sugerido, validez de cotización, intervalo de mantenimiento, condiciones del PDF, etc. |
| `tamano_vehiculo` | nombre, descripcion, orden, activo | Hoy 5, de compactos a extra grandes; `descripcion` lleva modelos de ejemplo para clasificar el vehículo |
| `espacio_taller` | sucursal_id, nombre, orden, activo | Hoy 3 |
| `usuario` | nombre, username (único), password_hash, rol (`dueno`, `encargado`, `tecnico`), activo | Las tablas de sesión las maneja la librería de autenticación |
| `usuario_permiso` | usuario_id, modulo | Solo para encargado (RF-16) |
| `plantilla_mensaje` | clave (pk), texto | "Listo" y "mantenimiento" (HU-40) |
| `auditoria` | usuario_id, entidad, entidad_id, accion, datos (jsonb) | Cambios en cotizaciones, pagos y precios (RNF-10) |
| `archivo` | clave_almacenamiento, tipo_mime, bytes, ancho, alto | Fotos, videos, logo y PDF |

### Sitio público (entrega 1)

| Tabla | Campos | Notas |
|---|---|---|
| `contenido_pagina` | clave (pk: `inicio`, `nosotros`, `contacto`), datos (jsonb) | Textos editables (RF-10) |
| `faq` | pregunta, respuesta, orden, visible | |
| `galeria_item` | servicio_id, foto_antes_id, foto_despues_id, descripcion, orden, visible, trabajo_id (opcional) | `trabajo_id` cuando la foto viene de una orden (RF-44) |
| `reclamo` | nombre, telefono, placa, servicio_id, fecha_aproximada, descripcion, estado (`pendiente`, `atendido`), nota_atencion, atendido_por, atendido_at | |
| `reclamo_archivo` | reclamo_id, archivo_id | Hasta 3 |

### Catálogo (servicios en entrega 1, precios en entrega 2)

| Tabla | Campos | Notas |
|---|---|---|
| `servicio` | nombre, slug (único), resumen, descripcion, beneficios (jsonb), pasos (jsonb), foto_archivo_id, orden, visible_sitio, activo, genera_mantenimiento, duracion_dias | Un solo registro para el sitio y el catálogo |
| `variante` | servicio_id, nombre, descripcion, orden, duracion_dias (opcional, pisa la del servicio), activo | D-2 |
| `precio` | variante_id, tamano_id, monto (nulo = según evaluación), vigente_desde | D-3; el vigente es el de fecha más reciente |

### Clientes (entrega 2)

| Tabla | Campos | Notas |
|---|---|---|
| `cliente` | nombre, telefono (único), correo, nit, razon_social, notas, activo | NIT para SIAT futura |
| `vehiculo` | cliente_id, placa (única), marca, modelo, anio, color, tamano_id, activo | |

### Consultas y cotizaciones (entrega 2)

| Tabla | Campos | Notas |
|---|---|---|
| `consulta` | cliente_id, vehiculo_id, servicio_id, canal (`whatsapp`, `taller`), estado (`consulto`, `cotizado`, `confirmado`, `perdido`), motivo_perdida, nota, ultimo_movimiento_at | RF-35 ordena por `ultimo_movimiento_at` |
| `consulta_archivo` | consulta_id, archivo_id | Fotos y videos |
| `cotizacion` | consulta_id, numero, version, es_estimado, subtotal, descuento, total, adelanto_sugerido, valida_hasta, condiciones (texto copiado), estado (`enviada`, `reemplazada`, `aceptada`), pdf_archivo_id | Único (numero, version); número correlativo por año, ej. `2026-0042` |
| `cotizacion_linea` | cotizacion_id, variante_id, tamano_id, descripcion, precio_sugerido, precio, orden | D-4 |
| `cotizacion_foto` | cotizacion_id, archivo_id, orden | Fotos que van en el PDF |

### Trabajos: reserva y orden (entrega 2)

| Tabla | Campos | Notas |
|---|---|---|
| `trabajo` | sucursal_id, cliente_id, vehiculo_id, cotizacion_id (opcional), espacio_id, fecha_inicio, fecha_fin, tecnico_id, estado (`agendado`, `recibido`, `en_proceso`, `listo`, `entregado`, `cancelado`), observaciones_ingreso, recibido_at, listo_at, avisado_listo_at, entregado_at, entrega_con_saldo_autorizada_por, motivo_cancelacion | D-1 y D-5. Al entregar antes de tiempo, `fecha_fin` se ajusta y libera el espacio |
| `trabajo_linea` | trabajo_id, variante_id, descripcion, precio, es_adicional | Total = suma de líneas |
| `trabajo_foto` | trabajo_id, archivo_id, etapa (`ingreso`, `antes`, `durante`, `despues`), subido_por | |
| `trabajo_avance` | trabajo_id, usuario_id, nota | |
| `pago` | trabajo_id, monto, metodo (`efectivo`, `qr`, `transferencia`), tipo (`adelanto`, `saldo`), fecha, comprobante_archivo_id, anulado, motivo_anulacion, anulado_por | Saldo = total − pagos no anulados. Si el trabajo se cancela, el adelanto queda como ingreso (RN-05) |

**Restricción de agenda (D-5):**

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE trabajo ADD CONSTRAINT trabajo_sin_cruces
  EXCLUDE USING gist (
    espacio_id WITH =,
    daterange(fecha_inicio, fecha_fin, '[]') WITH &&
  ) WHERE (estado NOT IN ('cancelado', 'entregado'));
```

### Mantenimiento (entrega 2)

| Tabla | Campos | Notas |
|---|---|---|
| `recordatorio_mantenimiento` | trabajo_origen_id, cliente_id, vehiculo_id, servicio_id, fecha_programada, estado (`pendiente`, `avisado`, `agendado`, `no_interesado`), avisado_at, trabajo_agendado_id, nota | Se crea al entregar un trabajo con `genera_mantenimiento` (RN-08) |

### Futuro: Sistema completo y más allá

No se crean ahora; se documentan para que lo de hoy no les cierre el paso.

| Módulo | Tablas | Se conecta con |
|---|---|---|
| Inventario | `producto`, `movimiento_inventario` (entrada, consumo, ajuste) | `trabajo` (consumo por orden), `sucursal` |
| Asistencia y planilla | `empleado` (tarifa_hora, recargo_extra), `marcacion`, `planilla`, `planilla_detalle` | `usuario` (un técnico es un empleado con acceso) |
| Caja | `movimiento_caja` (ingreso o egreso, categoría), `cierre_caja` | `pago` (cada pago genera su ingreso), `sucursal` |
| Factura SIAT | `factura`, `factura_linea` | `trabajo`, `cliente` (NIT y razón social) |
