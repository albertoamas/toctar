# P12 Checklist al recibir el vehículo: especificación

- **Fase y semana:** C. Entrega 2 · desde el 1 de noviembre de 2026, punto 2 de los ajustes de la reunión con el dueño (`../ajustes-reunion-dueno.md`)
- **Estado:** aprobada (01/11/2026) y en curso en la rama `pedido-12-checklist-recepcion`
- **Pedido:** 12 de `03-cierre-comercial/registro-de-cambios.md`. Tratamiento: incluido en el plan de ajustes (decisión del 01/11, no se cotiza aparte)
- **Historias que cambian:** HU-33 (recibir), HU-34 (la orden), HU-05 (configuración del taller)
- **Base:** RF-40 (recibir con fotos y observaciones), RN-12 (el técnico no ve precios ni teléfonos), RNF-11 (todo configurable), D-4 (lo registrado copia el nombre), D-6 (se desactiva, no se borra), D-10 (archivos)

## 1. Objetivo
Que al recibir un vehículo el dueño o el encargado marquen, en el celular y en menos de un minuto, **qué partes llegaron con un detalle** (rayón, golpe, raspón, roto u otro), con una nota y una foto de cada uno. Lo que no se marca llegó bien. En la orden se ve "Cómo llegó": los detalles con su foto y "El resto, bien".

## 2. Alcance
- **Incluye:**
  - En Configuración → Taller, la lista **"Partes del checklist"** (agregar, renombrar, ordenar, desactivar), con una lista base que el dueño ajusta.
  - Al recibir, la sección **"Checklist"**: una fila por parte activa, "Bien" por defecto; **"Marcar detalle"** abre un modal con el tipo, una nota y la foto (cámara). Cada detalle se guarda al momento, como las fotos de ingreso.
  - Un detalle se cambia o se quita ("Está bien") mientras la reserva no se recibió; después queda fijo, como prueba.
  - En la orden (también para el técnico), "Cómo llegó" con los detalles, su foto en grande al tocarla, "El resto, bien" y las observaciones.
  - Recibir sin fotos pide confirmar si no hay fotos de ingreso **ni** fotos de detalles.
- **No incluye** (y dónde queda):
  - Reordenar las fotos de la orden por etapas (detalles, inicio y final) y quitar las de proceso: pedido 27.
  - Que el cliente firme el checklist: pedido 13 (la firma lo usará).

## 3. Reglas que se cumplen

| Regla | Cómo se garantiza |
|---|---|
| Una parte, un detalle por orden | Índice único `(trabajo_id, parte_id)` en `trabajo_revision` |
| El detalle es prueba: no cambia después de recibir | La acción solo escribe con la reserva en `agendado`, dentro de una transacción con candado sobre el trabajo |
| Con "Otro", la nota dice qué es | Esquema Zod (`esquemaDetalle`) |
| RNF-11: la lista la arma el dueño | Tabla `parte_revision`, editable en Configuración; los tipos de detalle son fijos (vocabulario, no un valor del negocio) |
| D-4: renombrar una parte no cambia lo registrado | `trabajo_revision.parte` copia el nombre |
| RN-12 | El checklist no tiene precios ni teléfonos; el técnico lo ve en sus órdenes |
| Datos de clientes en el bucket privado | La foto va con `guardarFoto(..., { privado: true })` y se muestra con `urlsFotoPrivada` |

## 4. Datos (migración `0039_checklist_recepcion`)
- **`parte_revision`:** `id`, `nombre` (único sin distinguir mayúsculas), `orden`, `activo`. Datos iniciales: Capó, Techo, Maletero, Parachoques delantero, Parachoques trasero, Puertas del lado izquierdo, Puertas del lado derecho, Guardabarros, Faros y luces, Espejos, Parabrisas y vidrios, Aros y llantas, Tapizado e interior.
- **`trabajo_revision`:** `id`, `trabajo_id`, `parte_id`, `parte` (nombre copiado), `tipo` (`rayon`, `golpe`, `raspon`, `roto`, `otro`, con CHECK), `nota` (opcional), `archivo_id` (foto, opcional, única), `created_by`, `created_at`, `updated_at`. Único `(trabajo_id, parte_id)`.

## 5. Pantallas
- **Configuración → Taller:** una tercera lista, "Partes del checklist", con el mismo componente que espacios y tamaños.
- **Recibir (`/panel/ordenes/[id]/recibir`):** después de los servicios, la sección "Checklist" (lista de partes con "Marcar detalle" o, con detalle, el tipo, la nota, la miniatura y "Cambiar"). Debajo, las fotos de ingreso y el formulario de siempre.
- **Orden (`/panel/ordenes/[id]`):** "Cómo llegó" muestra los detalles (tipo, parte, nota, foto) y "El resto, bien" si hubo checklist, más las observaciones.

## 6. Acciones
| Acción | Quién | Qué hace |
|---|---|---|
| `guardarDetalle` | `puede(usuario, "recibir_vehiculo")` | Valida `trabajoId`, `parteId`, `tipo`, `nota` y la foto (opcional). Con la reserva `agendado` y la parte activa (o ya marcada), crea o cambia el detalle; una foto nueva reemplaza a la anterior (que se borra). "Detalle guardado." |
| `quitarDetalle` | ídem | Datos sueltos (Zod). Borra el detalle y su foto: la parte vuelve a "Bien". "La parte quedó bien." |
| Lista de partes | `exigirModulo("configuracion")` (el dueño) | Las de `guardarElemento`, `moverElemento` y `cambiarEstadoElemento`, con la lista `partes` |

## 7. Textos
Sección "Checklist"; ayuda "Marca solo lo que llegó con un detalle: lo demás queda bien."; botón "Marcar detalle" / "Cambiar"; modal "Detalle: {parte}"; campos "Qué tiene" (Rayón, Golpe, Raspón, Roto, Otro), "Nota" (ayuda "Dónde y cómo es."), "Foto"; botones "Guardar detalle", "Está bien" (quitar). Errores: "Elige qué tiene.", "Con «Otro», cuenta qué es.". En la orden: "El resto, bien." / "Sin checklist." si no hubo ninguno.

## 8. Pruebas
- **Unitarias:** `esquemaDetalle` (tipo obligatorio, "Otro" pide la nota, nota de hasta 300), los nombres de los tipos.
- **E2E:** el dueño agrega una parte a la lista; al recibir marca dos detalles (uno con foto), cambia uno y quita otro; después de recibir ya no se cambian; la orden los muestra, también al técnico (sin precios); recibir solo con fotos de detalles no pide confirmar "sin fotos".

## 9. Terminado cuando
El dueño, en el celular, marca los detalles con su foto antes de recibir y quedan visibles en la orden.
