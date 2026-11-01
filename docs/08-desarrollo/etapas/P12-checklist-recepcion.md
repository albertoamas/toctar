# P12 Checklist al recibir el vehículo: especificación

- **Fase y semana:** C. Entrega 2 · desde el 1 de noviembre de 2026, punto 2 de los ajustes de la reunión con el dueño (`../ajustes-reunion-dueno.md`)
- **Estado:** aprobada (01/11/2026) y en curso en la rama `pedido-12-checklist-recepcion`
- **Pedido:** 12 de `03-cierre-comercial/registro-de-cambios.md`. Tratamiento: incluido en el plan de ajustes (decisión del 01/11, no se cotiza aparte)
- **Historias que cambian:** HU-33 (recibir), HU-34 (la orden), HU-05 (configuración del taller)
- **Base:** RF-40 (recibir con fotos y observaciones), RN-12 (el técnico no ve precios ni teléfonos), RNF-11 (todo configurable), D-4 (lo registrado copia el nombre), D-6 (se desactiva, no se borra), D-10 (archivos)

## 1. Objetivo
Que al recibir un vehículo el dueño o el encargado **revisen parte por parte** en el celular y marquen cada una **"Bien"** o **"Detalle"** (rayón, golpe, raspón, roto u otro, con una nota y una foto). No se recibe con partes sin revisar: así ninguna se pasa por alto (ajuste pedido el 01/11, al probarlo; antes, todo arrancaba en "Bien"). En la orden se ve "Cómo llegó": los detalles con su foto y "El resto, bien".

## 2. Alcance
- **Incluye:**
  - En Configuración → Taller, la lista **"Partes del checklist"** (agregar, renombrar, ordenar, desactivar), con una lista base que el dueño ajusta.
  - Al recibir, la sección **"Checklist"**: una fila por parte activa, **"Sin revisar"** al empezar, con **"Bien"** (un toque) y **"Detalle"** (un modal con el tipo, una nota y la foto con la cámara), y arriba "Revisadas N de M". Cada marca se guarda al momento, como las fotos de ingreso.
  - Una parte se cambia (de bien a detalle y al revés, con "Está bien") mientras la reserva no se recibió; después queda fija, como prueba.
  - **Recibir exige todas las partes activas revisadas;** si falta alguna, el mensaje dice cuáles.
  - En la orden (también para el técnico), "Cómo llegó" con los detalles, su foto en grande al tocarla, "El resto, bien" y las observaciones.
  - Recibir sin fotos pide confirmar si no hay fotos de ingreso **ni** fotos de detalles.
- **No incluye** (y dónde queda):
  - Reordenar las fotos de la orden por etapas (detalles, inicio y final) y quitar las de proceso: pedido 27.
  - Que el cliente firme el checklist: pedido 13 (la firma lo usará).

## 3. Reglas que se cumplen

| Regla | Cómo se garantiza |
|---|---|
| Una parte, una revisión por orden | Índice único `(trabajo_id, parte_id)` en `trabajo_revision` |
| Se recibe con todo revisado | `recibirVehiculo` busca las partes activas sin fila y no recibe si hay alguna |
| "Bien" no lleva tipo, nota ni foto; "detalle" siempre lleva su tipo | CHECK en la base (`trabajo_revision_tipo_si_detalle`, `trabajo_revision_bien_sin_foto`) |
| El detalle es prueba: no cambia después de recibir | La acción solo escribe con la reserva en `agendado`, dentro de una transacción con candado sobre el trabajo |
| Con "Otro", la nota dice qué es | Esquema Zod (`esquemaDetalle`) |
| RNF-11: la lista la arma el dueño | Tabla `parte_revision`, editable en Configuración; los tipos de detalle son fijos (vocabulario, no un valor del negocio) |
| D-4: renombrar una parte no cambia lo registrado | `trabajo_revision.parte` copia el nombre |
| RN-12 | El checklist no tiene precios ni teléfonos; el técnico lo ve en sus órdenes |
| Datos de clientes en el bucket privado | La foto va con `guardarFoto(..., { privado: true })` y se muestra con `urlsFotoPrivada` |

## 4. Datos (migraciones `0039_checklist_recepcion` y `0040_checklist_parte_por_parte`)
- **`parte_revision`:** `id`, `nombre` (único sin distinguir mayúsculas), `orden`, `activo`. Datos iniciales: Capó, Techo, Maletero, Parachoques delantero, Parachoques trasero, Puertas del lado izquierdo, Puertas del lado derecho, Guardabarros, Faros y luces, Espejos, Parabrisas y vidrios, Aros y llantas, Tapizado e interior.
- **`trabajo_revision`:** `id`, `trabajo_id`, `parte_id`, `parte` (nombre copiado), `estado` (`bien` o `detalle`), `tipo` (solo con detalle: `rayon`, `golpe`, `raspon`, `roto`, `otro`), `nota` (opcional), `archivo_id` (foto, opcional, única), `created_by`, `created_at`, `updated_at`. Único `(trabajo_id, parte_id)`. Sin fila, la parte no se revisó.

## 5. Pantallas
- **Configuración → Taller:** una tercera lista, "Partes del checklist", con el mismo componente que espacios y tamaños.
- **Recibir (`/panel/ordenes/[id]/recibir`):** después de los servicios, la sección "Checklist" (lista de partes con "Marcar detalle" o, con detalle, el tipo, la nota, la miniatura y "Cambiar"). Debajo, las fotos de ingreso y el formulario de siempre.
- **Orden (`/panel/ordenes/[id]`):** "Cómo llegó" muestra los detalles (tipo, parte, nota, foto) y "El resto, bien" si hubo checklist, más las observaciones.

## 6. Acciones
| Acción | Quién | Qué hace |
|---|---|---|
| `guardarDetalle` | `puede(usuario, "recibir_vehiculo")` | Valida `trabajoId`, `parteId`, `tipo`, `nota` y la foto (opcional). Con la reserva `agendado` y la parte activa (o ya marcada), crea o cambia el detalle; una foto nueva reemplaza a la anterior (que se borra). "Detalle guardado." |
| `marcarBien` | ídem | Datos sueltos (Zod). Marca la parte "bien" (si tenía un detalle, borra su nota y su foto). Mismas reglas de estado y día |
| Lista de partes | `exigirModulo("configuracion")` (el dueño) | Las de `guardarElemento`, `moverElemento` y `cambiarEstadoElemento`, con la lista `partes` |

## 7. Textos
Sección "Checklist"; ayuda "Revisa cada parte: bien, o con un detalle y su foto."; "Revisadas N de M"; en cada fila "Sin revisar", botones "Bien" y "Detalle" ("Cambiar" una vez revisada); modal con el nombre de la parte; campos "Qué tiene" (Rayón, Golpe, Raspón, Roto, Otro), "Nota" (ayuda "Dónde y cómo es."), "Foto"; botones "Guardar detalle", "Está bien" (quitar). Errores: "Elige qué tiene.", "Con «Otro», cuenta qué es.". Al recibir con partes sin revisar: "Faltan revisar N partes del checklist: …". En la orden: "El resto, bien.", "Revisada parte por parte: todas bien." o "Se recibió sin checklist." (las de antes).

## 8. Pruebas
- **Unitarias:** `esquemaDetalle` (tipo obligatorio, "Otro" pide la nota, nota de hasta 300), los nombres de los tipos.
- **E2E:** al recibir, cada parte arranca sin revisar; un detalle con foto, otro con "Otro" que pide la nota y vuelve a "Bien"; sin revisar todo no se recibe; una por una "Bien" y se recibe; la orden los muestra, también al técnico; todas bien y sin fotos pide confirmar. Ninguna prueba agrega partes a la lista (es de todos y las pruebas corren a la vez). Las demás pruebas que reciben marcan todo bien en la base (`revisarChecklistEnBase`).

## 9. Terminado cuando
El dueño, en el celular, revisa cada parte (bien o con detalle y foto) antes de recibir, y los detalles quedan visibles en la orden.
