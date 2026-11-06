# P41 Nueva reserva en pasos — especificación

- **Fase y semana:** cierre de la Entrega 2 · semana 4 (06/11/2026)
- **Estado:** hecha (06/11/2026, PR #152); los cuatro pasos aprobados el 06/11, con el diseño de Nueva cotización (pedido 40)
- **Historias:** HU-30 (agendar), HU-38 (reservar un mantenimiento), pedido 31 (Nueva reserva con las cotizaciones del cliente)
- **Base:** `C3-agenda-pagos.md`, `P31-flujo-de-un-trabajo.md`, `P40-cotizacion-en-pasos.md`, `registro-de-cambios.md` (pedido 41)

## 1. Objetivo
Que reservar no sea una columna larga con las cotizaciones del cliente, los servicios, las fechas, el espacio y el adelanto. Va en cuatro pasos, uno por pantalla y con el mismo indicador que Nueva cotización: **Cliente**, **Vehículo**, **Servicios** y **Fecha y adelanto**. Quien aprendió una pantalla ya sabe usar la otra.

## 2. Alcance
- **Incluye:**
  - El indicador de pasos arriba ("Paso 3 de 4: Servicios"). Sin el permiso de Pagos, el último dice "Fecha" (no registra adelanto, RN-04).
  - Lo ya elegido arriba (cliente, vehículo y servicios), con "Cambiar" para volver a su paso.
  - **Con un solo vehículo**, pasa directo a Servicios con ese vehículo.
  - **En Servicios:** sus cotizaciones para reservar (un toque lleva al último paso) y la reserva sin cotización, plegada si tiene cotizaciones. "Siguiente: fecha y adelanto" aparece al armar una sin cotización.
  - **Desde una cotización** ("Por reservar" o la ficha de la cotización): un solo paso, la fecha, con los pasos del trabajo arriba como hasta ahora (pedido 31).
  - **Desde Mantenimientos:** el cliente y el vehículo fijos. Si el servicio de mantenimiento tiene precio, entra en la fecha; si es "según evaluación" o ya no se ofrece, en Servicios para escribirlo.
- **No incluye:**
  - Registrar un cliente nuevo al reservar: depende del pedido 31, parte 2 (cotizar sin registrar), que decide el dueño.

## 3. Reglas que se cumplen
- **Nada queda a medias:** los servicios y la fecha son un solo formulario. Los pasos que no están a la vista se esconden y se envían igual. La reserva se guarda recién con "Reservar".
- **El mismo esquema en el formulario y en el servidor:** "Siguiente" revisa los servicios con `esquemaServiciosReserva` (las mismas líneas que la acción). La acción revisa todo de nuevo; si el error es de un servicio (por ejemplo, uno que se desactivó), la pantalla vuelve a Servicios con el foco en él.
- **RN-04, RN-06 y RN-12:** sin cambios. El adelanto, solo con Pagos; los espacios, solo los libres; los montos, con Pagos o Cotizaciones.

## 4. Datos
Sin cambios en la base ni en la acción `agendarReserva`.

## 5. Pantallas y rutas
`/panel/agenda/nueva`, según lo que llegue en la dirección (siempre con `?fecha=` y `?espacio=` del tablero, si llegaron):

| Dirección | Paso |
|---|---|
| Sin nada | 1, Cliente: la búsqueda (`ElegirCliente`) |
| `?cliente=` con varios vehículos | 2, Vehículo: la lista de sus vehículos |
| `?cliente=` con uno, o `&vehiculo=` | 3, Servicios |
| `?cotizacion=&cliente=&vehiculo=` (elegida en Servicios) | 4, con "Cambiar servicios" que vuelve al paso 3 |
| `?cotizacion=` sola (desde "Por reservar" o la cotización) | La fecha, con los pasos del trabajo arriba |
| `?cliente=&vehiculo=&recordatorio=` | 4 si el servicio tiene precio; si no, 3 |

**Detalles de la pantalla:**
- **El pie:** fijo abajo en el celular (`PieFormulario`), con el total de la reserva sin cotización.
  - En Servicios: "Siguiente: fecha y adelanto".
  - En la fecha: "Atrás" (contorno) y "Reservar".
- **El historial:** los pasos 1 a 3 son direcciones. Dentro del formulario, la fecha es una entrada (`#fecha`), así el botón Atrás del celular vuelve a Servicios. Adelante del navegador revisa los servicios. Desde un mantenimiento que entra en la fecha, "Cambiar" de los servicios agrega su entrada (`#servicios`).
- **Enter en un campo de los servicios** sigue a la fecha, en lugar de reservar.
- **Sin "Cambiar":** desde un mantenimiento, ni el cliente ni el vehículo (el recordatorio es de ellos); con un solo vehículo, el vehículo.

## 6. Acciones del servidor
`agendarReserva`, sin cambios.

## 7. Componentes y diseño
- **`PasosFlujo`** (pedido 40), con los pasos de `pasosNuevaReserva`.
- **`ResumenPaso`** (`componentes/panel/resumen-paso.tsx`): lo ya elegido con "Cambiar", sacado de Nueva cotización para que lo usen las dos pantallas. `href` para un paso de la dirección (lo puede pasar una página del servidor) y `alCambiar` para un paso del mismo formulario.
- **`useFocoDePaso`** (`componentes/panel/foco-de-paso.ts`): el foco al cambiar de paso y tras un error, común a las dos pantallas. Lo que se hace después del await de una acción se dibuja antes que su resultado: el foco espera a que el resultado nuevo esté a la vista y no cae en el error del envío anterior (lo encontró la revisión; también pasaba en la cotización). Por lo mismo, los errores de "Siguiente" quedan atados al resultado con que se hicieron, en lugar de reiniciarse tras el await.
- **Lógica pura en `modulos/agenda/pasos-reserva.ts`:** los pasos, en qué paso está cada error, la revisión de los servicios y dónde empieza la reserva sin cotización.

## 8. Textos de la interfaz
- **Pasos:** "Cliente", "Vehículo", "Servicios" y "Fecha y adelanto" (o "Fecha").
- **Botones:** "Siguiente: fecha y adelanto", "Atrás", "Reservar" y "Cambiar" (anunciado "Cambiar cliente", "Cambiar vehículo" o "Cambiar servicios").

## 9. Pruebas
- **Unitarias** (`tests/unit/reserva-pasos.test.ts`):
  - Los pasos según el permiso de Pagos.
  - En qué paso está cada error.
  - La revisión de los servicios, con las claves de la acción.
  - Dónde empieza un mantenimiento, con precio y sin él.
- **E2E:**
  - `hu-30`, la reserva sin cotización paso a paso: con un solo vehículo directo a Servicios; "Siguiente" sin servicios avisa y no avanza; "Siguiente" no reserva; Atrás, el del navegador y el de la pantalla, sin perder lo elegido.
  - `hu-30`: con varios vehículos, el paso Vehículo y "Cambiar vehículo".
  - `p31-flujo-trabajo`: la cotización elegida en Servicios lleva al paso 4, con "Cambiar servicios".
  - `hu-38` y `flujo-taller-completo`: el mantenimiento según evaluación entra en Servicios.

## 10. Orden de trabajo
Rama `pedido-41-reserva-en-pasos`, un PR (después del pedido 40, que trae `PasosFlujo`).

## 11. Criterio de salida
En el celular, una reserva sin cotización se arma paso a paso sin bajar por una columna larga, y con una cotización o un mantenimiento se llega directo a la fecha.

## 12. Decisiones abiertas
- Si se aprueba el pedido 31, parte 2 (cotizar sin registrar), el paso Cliente suma "Cliente nuevo", como en Nueva cotización.
