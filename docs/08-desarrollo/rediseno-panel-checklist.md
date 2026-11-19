# Patrones comunes del panel — checklist

Para ir una por una con la especificación `etapas/C7-rediseno-del-panel.md` (alcance acotado el 18/11: 6 patrones y la
regla de anchos). Cada fila se marca `[x]` cuando cumple **todo** lo de "Hecho" (abajo), con su PR al lado. Cada paso:
análisis con capturas → propuesta → aprobación → programar → capturas después → marcar.

## Hecho (vale para cada fila)

- [ ] Usa la pieza común de su patrón; no arma la suya a mano.
- [ ] Sigue la regla de anchos (§4 de C7): todo el ancho, alineado a la izquierda, columnas según el tipo.
- [ ] Menos es más: lo que decide primero, lo que se consulta después, lo poco usado en "Más".
- [ ] Una sola acción principal (roja) a la vista; lo destructivo con contorno y confirmación.
- [ ] Estados: vacío, cargando, error y sin conexión.
- [ ] Con cada rol: dueño; encargado con y sin el permiso; perfil Taller (sin montos, RN-12).
- [ ] 360, 390, 768, 1280 y 1600 px sin desborde horizontal; nada debajo del teclado ni del pulgar.
- [ ] Teclado y lector de pantalla: todo con Tab, foco visible, un `h1`, botones de ícono con nombre.
- [ ] E2E que la tocan en verde; capturas antes y después (390, 1280 y 1600 px) en el PR.

## Paso 0 — Prototipo y decisiones

- [x] Prototipo v1 y v2 (18/11): https://claude.ai/artifact/SJE6vhxguZyWteDE6XJLe6
- [x] Decidido (18/11): se mantienen Inicio, el menú (lateral negro y desplegable en el celular), el checklist de Recibir, Montserrat y los colores de hoy.
- [x] Decidido (18/11): de la v2 se toman Nueva cotización, Cotización, Orden, los modales, Entregar, Saldos, Ficha del cliente y Mantenimientos.
- [x] Decidida la regla de anchos (§4 de C7).
- [x] Prototipo v3 (18/11): solo las pantallas de este alcance, completas, con el menú desplegable, a 390, 1280 y 1600 px (mismo enlace).
- [ ] Visto bueno del desarrollador al v3.
- [ ] Visto bueno del dueño al v3.

## Paso 1 — La regla de anchos (rama `patrones-anchos`)

- [x] `pagina-panel.tsx`: la pieza de dos columnas no se agrega (el paso 3, donde se iba a usar, se descartó el 18/11).
- [x] Ancho por tipo de dato (monto, fecha, año, placa, teléfono, cantidad): un solo mapa, `ANCHO_DATO` en `anchos.ts`, aplicado a las 9 fechas, el monto, el año, la placa, el NIT, el WhatsApp y las cantidades del panel; `consistencia-panel` detecta una fecha sin su ancho.
- [x] `campo-monto.tsx` con su ancho (de 8 a 10 rem).
- [x] Texto de corrido cortado en unos 70 caracteres (`MEDIDA_TEXTO`, en los valores de `ListaDatos`).
- [x] Capturas antes y después (Nuevo cliente, Parámetros, Registrar pago) a 390, 1280 y 1600 px.
- [x] `sistema-del-panel.md` §1 y la skill `pantallas-panel` con la regla.

## Paso 2 — Modales (rama `patrones-modales`)

### Piezas

- [x] `modal-formulario.tsx`: tamaños chico (30 rem), mediano (40 rem) y grande (50 rem); la hoja desde abajo en el celular ya estaba. Mediano: precios, historial de precios, subir fotos, portada y editar trabajo.
- [x] `modal-pie.tsx`: "Cancelar" a la izquierda y la acción a la derecha en la computadora; a todo el ancho en el celular. `PieModal` pone "Cancelar" primero también en el código (el orden de Tab es el que se ve).
- [x] `DatoClave` (nuevo, `dato-clave.tsx`): el recuadro con el dato que decide, en tono neutro, aviso o peligro.
- [x] Botón destructivo de contorno con texto rojo (la variante `destructive` de `button.tsx`: cambia en los 10 lugares que la usan).

### Los 6 que se revisan uno por uno

- [x] Registrar pago (`registrar-pago.tsx`): "Falta cobrar" arriba (antes, una ayuda bajo el monto).
- [x] Anular pago (`anular-pago.tsx`): el pago que se anula como dato clave.
- [x] Reprogramar (`acciones-reserva.tsx`): las fechas de ahora como dato clave.
- [x] Cancelar reserva (`acciones-reserva.tsx`): el adelanto recibido en tono peligro, si hay.
- [x] Rechazar la cotización (`estado-cotizacion.tsx`): qué se rechaza y su total arriba; el motivo en tarjetas.
- [x] Agregar servicio (`agregar-adicional.tsx`): el precio del catálogo como ayuda; el botón dice "Agregar servicio".

### Los demás (heredan las piezas; se miran en el recorrido de capturas)

- [ ] Agenda: no hay otros. Órdenes: Extender entrega, Volver al paso anterior, Detalle del checklist.
- [ ] Cotizaciones: Volver a pendiente. Mantenimientos: Agregar mantenimiento, Mantenimiento de {servicio}, No le interesa.
- [ ] Clientes: Datos, Agregar vehículo, editar vehículo, Desactivar cliente, ¿Desactivar {placa}?
- [ ] Catálogo: Nuevo servicio, Datos, Precios, Historial de precios, Variantes, ¿Desactivar {servicio}?
- [ ] Sitio web: Dirección de la página, Subir fotos, El trabajo de la portada, Editar trabajo, ¿Eliminar esta foto?, preguntas (agregar, editar, eliminar).
- [ ] Usuarios: Datos, Cambiar mi contraseña, Nueva contraseña, ¿Desactivar a {nombre}? Configuración: espacios y tamaños, ¿Volver al texto original? Reclamos: Marcar como atendido.

## Paso 3 — Ficha con el recorrido (descartado)

- [x] Descartado el 18/11: se programó y el desarrollador prefirió las fichas de Orden, Cotización y Reserva como estaban. Quedan como hoy, con sus barras de pasos y su paso siguiente. La pieza de dos columnas (`Columnas`) no se agrega.

## Paso 4 — Formulario en pasos con resumen (rama `patrones-anchos`)

Decidido el 18/11, con capturas: en el celular queda como estaba (lo elegido arriba y el total en el pie fijo); el cambio
es en la computadora.

### Piezas

- [x] `pasos-flujo.tsx`, `resumen-paso.tsx` y `pie-formulario.tsx`: quedan como estaban.
- [x] `ConResumen` (nuevo, `con-resumen.tsx`): el paso a la izquierda (2/3) y el resumen fijo a la derecha (1/3) desde `@4xl`; en lo angosto no se muestra. Sin nada que resumir, el paso a todo el ancho. `FilaResumen`, sus filas.
- [x] `ResumenPrecios` (nuevo, en `campos-precio.tsx`): subtotal y descuento si hay, el total (que se anuncia al cambiar), el adelanto sugerido y, en una versión nueva, con cuánto se compara.
- [x] "¿Cómo se cotizó?" en tarjetas (`OpcionesEnTarjetas`, que suma `tituloOculto`).

### Pantallas

- [x] Nueva cotización — `/panel/cotizaciones/nueva`: en el paso de servicios, "Cotización para" y el total al costado.
- [x] Nueva reserva — `/panel/agenda/nueva`: en el paso de la fecha, al costado los servicios (en la directa), el total, el adelanto y lo que falta al entregar, si quien mira ve montos.
- [x] Nueva versión — `/panel/cotizaciones/[id]/nueva-version`: el total y la versión anterior al costado.
- [x] E2E: `hu-25` y `hu-30` buscan el total y los servicios donde se ven (al costado en la computadora, arriba en el celular).

### Títulos de las tarjetas (18/11)

- [x] Regla: en los formularios, el título adentro de cada tarjeta; en las fichas, fuera (sistema-del-panel.md §2). Las listas para elegir, como las listas.
- [x] `CabeceraTarjeta` (nueva) y `Seccion dentro`; `SeccionFormulario` con `accion`.
- [x] Adentro: `ResumenClienteVehiculo` ("Cotización para", "Reserva para"), `ResumenPaso` (los servicios de la reserva), "Cliente nuevo" de Nueva cotización, el resumen del costado (una sola tarjeta con el total al pie), Servicios, Pagos, Mantenimiento y la firma de Entregar, el checklist de Recibir (sus filas como estaban) y el vehículo de Cambiar de dueño.

## Paso 5 — Flujo de un paso (rama `patrones-anchos`)

Decidido el 18/11, con capturas: el mismo marco en los tres; Publicar en una columna (elegir fotos necesita el ancho).

### Piezas

- [x] `AvisoEstado` (nuevo, `aviso-estado.tsx`): verde, ámbar o azul, con ícono y texto, y su acción en la misma franja.
- [x] `PasoConCostado` (nuevo, en `con-resumen.tsx`): lo que se entrega o se recibe al costado (1/3) desde `@4xl`; en el celular, arriba del paso.
- [x] El botón del paso siempre fuera de la tarjeta, al pie (`PieFormulario`, fijo abajo en el celular).

### Pantallas

- [x] Entregar — arriba "Pagado por completo." o "Falta cobrar 300 Bs" con "Registrar pago"; al costado "Se entrega", Servicios y Pagos; los mantenimientos que hace la entrega, en una línea antes del botón.
- [x] Recibir — al costado "Se recibe"; el checklist como estaba; el botón fuera de la tarjeta de Observaciones.
- [x] Publicar en la galería — el aviso azul arriba (era un texto gris bajo el título); el botón fuera de la tarjeta.

### Tarjetas de datos (18/11)

- [x] Recibir y Entregar: lo que se recibe o se entrega en la tarjeta de "Cotización para", sin título (el cliente, la placa grande, los servicios con viñeta: `ServiciosResumen`).
- [x] `ListaDatos`: una línea entre dato y dato; angosta (celular, costado), la etiqueta chica arriba y el valor abajo; con lugar, al lado (ficha del vehículo, reclamo, Negocio, Parámetros).

### El título adentro en todo el panel (18/11)

- [x] Decidido con capturas de muestra (ficha del vehículo, orden, Parámetros, Nueva cotización): una sola regla, el título adentro en la cabecera de la tarjeta, con una línea que lo separa del contenido.
- [x] Piezas: `CabeceraTarjeta` (la franja), `Seccion` (siempre adentro; `sinRelleno` para listas, que pierden su marco), `SeccionConEditar` y `SeccionFormulario` (la leyenda en la misma franja).
- [x] Pasadas a mano las secciones de lista: fichas del cliente, del vehículo, de la cotización y del catálogo; Inicio (Para hoy, Para atender); Mantenimientos; Usuarios; Sitio web (textos, opciones); Nueva reserva (vehículo, sus cotizaciones); Elegir cliente.

## Paso 6 — Lista con acción en la fila (rama `patrones-anchos`)

Decidido el 18/11, con capturas: Saldos ya seguía el patrón; el problema era Mantenimientos.

### Piezas

- [x] `fila-lista.tsx`: `FilaConAcciones` como estaba; `ListaFilas` suma `accion` ("Reservar ›" a la derecha si la lista es ancha, debajo si es angosta, como "Para atender").
- [x] `tabla-acciones.tsx`: como estaba.

### Pantallas

- [x] Saldos pendientes — el total grande arriba ("980 Bs por cobrar en 2 órdenes"); las filas, como estaban.
- [x] Mantenimientos — el servicio sin "Mantenimiento de" y el intervalo en gris; el vencimiento en una insignia (ámbar si venció); "Avisado el 03/06" (la hora y quién, al pasar el puntero y para el lector); "No le interesa" en el "⋯". Las filas bajan de 5 renglones a 3 en la computadora.
- [x] Por reservar (Agenda) — cada fila dice "Reservar".

## Paso 7 — Ficha con historia (rama `patrones-ficha-historia`)

### Piezas

- [ ] `LineaDeTiempo` (nueva): cada trabajo con su insignia, placa, servicio, monto (si los ve) y fecha; plegada desde el sexto.
- [ ] La consulta que junta cotizaciones, reservas y órdenes del cliente o del vehículo.

### Pantallas

- [ ] Ficha del cliente — `/panel/clientes/[id]`: historia; vehículos y datos al costado; WhatsApp y "Más" arriba.
- [ ] Ficha del vehículo — `/panel/clientes/[id]/vehiculos/[vehiculo]`: su historia; datos al costado.
- [ ] E2E nueva: la historia en orden y sin montos para el perfil Taller.

## Paso 8 — Cierre (rama `patrones-cierre`)

- [ ] `consistencia-panel.test.ts` con una regla por pieza nueva.
- [ ] `recorrido-panel.spec.ts`: capturas a 390 y 1366 px con los tres roles, revisadas.
- [ ] Toda la suite E2E y el CI en verde.
- [ ] Manual del panel: capturas nuevas de las pantallas que cambiaron (`npm run manual:capturas`, `manual:armar`, `manual:pdf`).
- [ ] `sistema-del-panel.md`, la skill `pantallas-panel`, `CLAUDE.md` y `plan-de-desarrollo.md` al día.
- [ ] Prueba a mano en Android e iPhone: el recorrido completo de un trabajo, también instalada como app.

## Queda como hoy (no se marca; solo hereda las piezas)

Inicio · el menú · el checklist de Recibir · Clientes, Cotizaciones, Órdenes, Reclamos, Usuarios y Catálogo (listas) ·
Agenda (tablero) · Nuevo cliente · Configuración · Sitio web · sin acceso, no existe y error. Reportes y Gastos (#257),
aparte.
