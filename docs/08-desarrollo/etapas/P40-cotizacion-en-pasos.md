# P40 Nueva cotización en pasos — especificación

- **Fase y semana:** cierre de la Entrega 2 · semana 4 (05/11/2026)
- **Estado:** programada (05/11/2026); el flujo de la maqueta quedó aprobado, con el diseño de la app
- **Historias:** HU-25 (armar cotización), pedido 23 (cotización directa)
- **Base:** `P23-cotizacion-directa.md`, `registro-de-cambios.md` (pedido 40), skill `pantallas-panel` (flujo de un paso)

## 1. Objetivo
Que cotizarle a un cliente nuevo no sea una columna larga que mezcla cliente, vehículo y servicios. Va en tres pasos, uno por pantalla: **Cliente**, **Vehículo** y **Servicios y precio**, con los datos completos del cliente y del vehículo.

## 2. Alcance
- **Incluye:**
  - El indicador de pasos arriba ("Paso 2 de 3: Vehículo").
  - Un paso por pantalla, con "Siguiente: vehículo", "Siguiente: servicios", "Atrás" y, al final, "Crear cotización".
  - El cliente nuevo con todos sus datos: nombre y WhatsApp, y correo, NIT, razón social y notas en "Agregar correo, NIT y notas".
  - El vehículo nuevo con placa, tamaño, marca, modelo, año y color, todo a la vista.
  - Arriba, lo ya elegido (cliente y vehículo), con "Cambiar" para volver a ese paso.
- **No incluye:**
  - Cotizar sin registrar al cliente: es el pedido 31, parte 2, y lo decide el dueño. Si se aprueba, el paso del cliente se reduce a nombre y WhatsApp.
  - Otros flujos (Nueva reserva y Agregar cliente): cada uno, con su propia maqueta.

## 3. Reglas que se cumplen
- **Nada queda a medias:** es un solo formulario. Los pasos que no están a la vista se esconden y se envían igual. El cliente y el vehículo nuevos se registran recién con "Crear cotización", en la misma transacción que la cotización.
- **El mismo esquema en el formulario y en el servidor:**
  - "Siguiente" revisa el paso con los esquemas de Clientes (`esquemaCliente` y `esquemaVehiculo`) y la elección del vehículo.
  - La acción vuelve a revisar todo, incluido lo que solo sabe el servidor: un WhatsApp o una placa repetidos.
  - Si la acción devuelve un error, la pantalla vuelve al primer paso que lo tiene y el foco va al campo.
- **RN-01 y RN-12:** sin cambios. Cotiza quien tiene "Cotizaciones" y ve los montos.

## 4. Datos
Sin cambios en la base. La acción guarda el cliente nuevo con todos los campos de `esquemaCliente` (antes, solo nombre y WhatsApp).

## 5. Pantallas y rutas
`/panel/cotizaciones/nueva`, en tres casos según lo que llegue en la dirección:
- **Sin cliente:** paso 1 con la búsqueda (`ElegirCliente`) y "Cliente nuevo", y el indicador en el paso 1.
- **Con `?nuevo=1`:** el paso 1 es el formulario del cliente nuevo, con "Buscar un cliente registrado".
- **Con `?cliente=`:** empieza en el paso 2, con el cliente arriba. Si tiene un solo vehículo, ya va marcado. "Cambiar" del cliente vuelve a la búsqueda.

En el paso 3 van los servicios, ¿cómo se cotizó?, el total y las condiciones, como antes.

**Detalles de la pantalla:**
- **El pie:** fijo abajo en el celular (`PieFormulario`), con "Atrás" (contorno) y el botón principal en rojo.
- **El historial:** cada paso es una entrada (`#vehiculo`, `#servicios`). Avanzar agrega una; volver retrocede, sea con "Atrás", con "Cambiar" o por un error de la acción. Así el botón Atrás del celular siempre lleva al paso anterior. Adelante del navegador revisa los pasos que salta.
- **Enter en un campo** de los dos primeros pasos sigue al próximo, en lugar de crear la cotización.

## 6. Acciones del servidor
`crearCotizacion`, sin cambios en su forma. Con un cliente nuevo valida y guarda `esquemaCliente` completo.

## 7. Componentes y diseño
- **`PasosFlujo`** (`componentes/panel/pasos-flujo.tsx`): las barras de los pasos del trabajo, generalizadas. `PasosTrabajo` ahora lo usa.
- **Los de siempre:** `SeccionFormulario`, `CabeceraSeccion` (para el resumen, con "Cambiar") y `PieFormulario`, más `CamposCliente` (con `plegar`), `CamposVehiculo` (completo) y `CamposPrecio`.
- **Lógica pura en `modulos/cotizaciones/pasos.ts`:** los pasos, en qué paso está cada error y la revisión de cada paso.
- **Ayudantes de formulario en `modulos/clientes/valores.ts`** (`leerValores`, `camposConPrefijo` y `erroresConPrefijo`): sin nada del servidor, para que también los use el navegador.

## 8. Textos de la interfaz
- **Pasos:** "Cliente", "Vehículo" y "Servicios y precio".
- **Botones:** "Siguiente: vehículo", "Siguiente: servicios", "Atrás", "Crear cotización", "Cambiar" (anunciado "Cambiar cliente" o "Cambiar vehículo") y "Buscar un cliente registrado".
- **Títulos del vehículo:** "Vehículo" (con los suyos), "Otro vehículo" o "Vehículo nuevo".

## 9. Pruebas
- **Unitarias** (`tests/unit/cotizacion-pasos.test.ts`):
  - En qué paso está cada error, y el primer paso con uno.
  - La revisión del cliente nuevo, del vehículo nuevo y de uno elegido.
- **E2E** (`hu-25`):
  - El cliente nuevo en tres pasos, con correo y NIT guardados y la marca y el color del vehículo.
  - "Siguiente" no envía la cotización: con el botón reusado, "Siguiente" se volvía "Crear cotización" en el mismo toque.
  - El cambio de tamaño desde "Cambiar vehículo".
  - Un WhatsApp repetido vuelve al paso del cliente con el foco en el campo, y lo demás se conserva.
  - Atrás, el de la pantalla y el del navegador, sin perder lo escrito ni registrar nada.
  - Las demás pruebas que cotizan entran por el paso 2.

## 10. Orden de trabajo
Rama `pedido-40-cotizacion-en-pasos`, un PR.

## 11. Criterio de salida
En el celular, una cotización a un cliente nuevo se arma paso a paso sin bajar por una columna larga, y queda guardada con el cliente y el vehículo completos.

## 12. Decisiones abiertas
- Si se aprueba el pedido 31, parte 2 (cotizar sin registrar), el paso del cliente se rehace sobre este mismo flujo.
