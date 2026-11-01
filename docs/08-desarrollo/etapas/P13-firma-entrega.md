# P13 Firma del cliente al entregar: especificación

- **Fase y semana:** C. Entrega 2 · desde el 1 de noviembre de 2026, punto 3 de los ajustes de la reunión con el dueño (`../ajustes-reunion-dueno.md`)
- **Estado:** aprobada (01/11/2026) y en curso en la rama `pedido-13-firma-entrega`
- **Pedido:** 13 de `03-cierre-comercial/registro-de-cambios.md`. Decisiones del 01/11: firma **al entregar**; se puede entregar **sin firma, con el motivo**; la constancia en PDF queda aparte (no se hace ahora)
- **Historias que cambian:** HU-36 (entregar), HU-34 (la orden)
- **Base:** RF-49 (entregar), RN-12 (el técnico no ve precios ni teléfonos), D-10 (archivos), datos de clientes en el bucket privado

## 1. Objetivo
Que al llevarse su vehículo el cliente firme con el dedo en el celular del taller, como constancia de que lo recibe conforme. La firma queda en la orden con su nombre, la fecha y quién entregó. No es una firma digital certificada: es una constancia de conformidad.

## 2. Alcance
- **Incluye:**
  - En "Entregar vehículo", la sección **"Firma del cliente"**: un recuadro para firmar con el dedo (o el mouse), "Borrar firma" y **"Nombre de quien recibe"** (llega el del cliente; se cambia si retira otra persona).
  - **"Entregar sin firma"**: una casilla que pide el motivo (el cliente no estaba, retiró otra persona…). Sin firma ni motivo, no se entrega.
  - En la orden entregada: "Recibido conforme por {nombre}" con la firma (y el "Entregado el … por …" de siempre), o "Entregado sin firma: {motivo}".
- **No incluye:** la constancia en PDF para mandar por WhatsApp (queda aparte, por pedido del 01/11); la firma al recibir en el taller.

## 3. Reglas que se cumplen

| Regla | Cómo se garantiza |
|---|---|
| Se entrega con firma o con un motivo | Esquema Zod en el servidor (`esquemaEntregar`): sin firma, `sinFirma` y un motivo de 3 a 300 caracteres |
| Firma con nombre; nunca firma y motivo a la vez | CHECK en la base (`trabajo_firma_con_nombre`, `trabajo_firma_o_motivo`) |
| La firma es un dato del cliente | Se guarda con `guardarFoto(..., { privado: true })` y se muestra con un enlace firmado |
| La firma no cambia después | Se escribe solo en la transacción de la entrega; si la entrega falla, el archivo se borra |
| RN-12 | La firma y el nombre no son precios ni teléfonos: los ve también el técnico en su orden |

## 4. Datos (migración `0041_firma_entrega`)
En `trabajo`: `firma_archivo_id` (archivo, único), `firma_nombre`, `sin_firma_motivo`. La fecha y quién entregó ya están (`entregado_at`, `entregado_por`).

## 5. Pantallas
- **Entregar (`/panel/ordenes/[id]/entregar`):** antes del botón, "Firma del cliente" (recuadro, "Borrar firma", nombre) y la casilla "Entregar sin firma" (con su motivo). El botón dice "Entregar vehículo".
- **Orden (`/panel/ordenes/[id]`):** en la columna de datos, debajo de "Entregado el …", la sección "Firma": la imagen y "Recibido conforme por {nombre}", o "Entregado sin firma: {motivo}".

## 6. Acciones
`entregarVehiculo` (cambia): además de lo de siempre, recibe `firma` (PNG del recuadro, hasta 1 MB) y `firmaNombre`, o `sinFirma` y `sinFirmaMotivo`. Valida antes de guardar nada; guarda la firma (WebP, privada) antes de la transacción y la borra si la entrega no se completa. Auditoría: `conFirma` en `datos`.

## 7. Textos
"Firma del cliente"; ayuda "El cliente firma con el dedo: recibe su vehículo conforme."; "Borrar firma"; "Nombre de quien recibe"; casilla "Entregar sin firma"; "Motivo" (ayuda "Por ejemplo: retiró otra persona."). Errores: "Falta la firma del cliente, o marca «Entregar sin firma».", "Escribe el nombre de quien recibe.", "Cuenta por qué no firma.". En la orden: "Recibido conforme por {nombre}." / "Entregado sin firma: {motivo}".

## 8. Pruebas
- **Unitarias:** el esquema de la entrega (firma con nombre; sin firma, el motivo; nombre y motivo con su largo).
- **E2E:** sin firma ni casilla no entrega; con firma dibujada y nombre, entrega y la orden muestra la firma (privada) y el nombre, también al técnico; "Entregar sin firma" pide el motivo y queda en la orden; las demás pruebas que entregan marcan "Entregar sin firma".

## 9. Terminado cuando
El cliente firma en el celular al llevarse su auto y la firma queda en la orden, con su nombre.
