# P51 La ficha del vehículo — especificación

- **Fase y semana:** C. Entrega 2 · 16 de noviembre de 2026, antes del cierre
- **Estado:** aprobada con su prototipo (16/11/2026, https://claude.ai/artifact/VxT6a14hV54eF535xvSiW1) y programada en la rama `p51-ficha-del-vehiculo`
- **Pedido:** 51 de `03-cierre-comercial/registro-de-cambios.md`. Incluido: decisión del desarrollador del 16/11, porque los vehículos debieron estar separados de los clientes desde el inicio. Salió de la prueba en celulares (`08-desarrollo/hallazgos-prueba-celulares.md`, hallazgo 6)
- **Historias que cambian:** HU-21 (registrar vehículos), HU-23 (ficha del cliente)
- **Base:**
  - C1 (`C1-catalogo-clientes.md`): el vehículo es de un cliente y la placa es única entre los activos (RF-23).
  - P37 (`P37-cambio-de-dueno.md`): al cambiar de dueño, el vehículo es el mismo, con otro `cliente_id`; su historial no se mueve.
  - P21 (`P21-planes-mantenimiento.md`): el plan de mantenimiento es del vehículo.

## 1. Objetivo
Ver todo lo de **un auto** en un solo lugar: sus datos, su dueño, su mantenimiento y su historial, también lo que se le hizo con un dueño anterior.

Hoy, la ficha del cliente muestra sus reservas, cotizaciones y mantenimientos **mezclados entre todos sus autos**. Saber qué se le hizo a "la Hilux" obliga a leer todo. Y si el auto cambió de dueño, lo de antes queda en la ficha del dueño anterior.

## 2. Alcance

Opción **B**, aprobada el 16/11: la ficha va **dentro de Clientes**, sin un módulo nuevo en el menú. El dueño pidió un panel simple, y buscar por placa ya existe en Clientes.

- **Incluye:**
  - **La ficha del vehículo** en `/panel/clientes/[id]/vehiculos/[vehiculo]`, de tipo `ficha`:
    - sus datos;
    - su dueño;
    - su mantenimiento;
    - su historial de reservas y órdenes, y de cotizaciones.
  - **La ficha del cliente:** cada vehículo de su lista es una fila de un toque que abre su ficha. "Editar" ya no está en la fila: pasa a la ficha del vehículo, con el mismo modal de siempre. "Agregar vehículo" sigue en la ficha del cliente.
  - **El buscador de Clientes:** si se buscó una placa y coincide con un vehículo, el resultado lleva directo a la ficha de ese vehículo (la placa es única).
  - **La ficha de una orden y la de una cotización:** la placa enlaza a la ficha del vehículo, solo para quien ve Clientes.
- **No incluye:**
  - Una lista "Vehículos" en el menú (opción A, descartada).
  - Fotos en la ficha. Están en cada orden, y el dueño pidió menos fotos (`reunion-dueno-panel`); cada fila del historial lleva a su orden.
  - Mover el historial de un dueño a otro. Sigue a nombre de quien era dueño en ese momento (P37).

## 3. Reglas que se cumplen
- **RN-12:** sin Pagos ni Cotizaciones no se ven montos. El historial muestra el total de cada orden y de cada cotización solo a quien los ve.
- **Permisos:** la ficha es del módulo Clientes (`exigirModulo("clientes")`), igual que la del cliente. Desde una orden, la placa enlaza solo si se ve Clientes.
- **La ruta es del cliente actual:** `/panel/clientes/[id]/vehiculos/[vehiculo]` con un `id` que no es el dueño actual (por ejemplo, un enlace viejo, de antes de un cambio de dueño) redirige a la del dueño actual. Un vehículo inexistente da "No encontrado".
- **RN-14:** nada se borra. Un vehículo desactivado se ve con "Inactivo", su historial completo y "Reactivar" como acción principal, igual que hoy en la ficha del cliente.

## 4. Datos
Sin migración. Todo sale de lo que ya existe:
- **El vehículo y su dueño:** `vehiculo` y `cliente`.
- **El historial de reservas y órdenes:** `trabajo` por `vehiculo_id`, con su `cliente_id` de ese momento, sus líneas, su estado y sus fechas.
- **El historial de cotizaciones:** `consulta` por `vehiculo_id` y su versión vigente.
- **El mantenimiento:** `recordatorio_mantenimiento` por `vehiculo_id`.

Consulta nueva `fichaVehiculo(vehiculoId)` en `modulos/clientes/consultas.ts`, que reúne todo esto, ordenado del más reciente al más viejo.

## 5. Pantallas y rutas

### `/panel/clientes/[id]/vehiculos/[vehiculo]`: la ficha del vehículo
De tipo `ficha` (`PaginaPanel`), a 1024 px. En el celular, una columna.

1. **Encabezado:**
   - Título: la placa, con `tt-placa`. Debajo, marca, modelo, año y color si los tiene.
   - "‹ Volver" a la ficha de su dueño, o a la pantalla de origen (`volver`, pedido 43).
   - Inactivo: la insignia "Inactivo".
   - **Acción principal: "Nueva reserva"**, con el cliente y el vehículo ya elegidos. Si está inactivo, "Reactivar vehículo" en su lugar.
   - **"Más":** Cambiar de dueño (P37) y Desactivar vehículo, que hoy están en el modal de edición.
2. **Datos** (`SeccionConEditar`): el vehículo (marca, modelo, año y color) y el tamaño; la placa ya es el título. "Editar" abre el modal de siempre (`FormularioVehiculo`), sin "Más" adentro: esas acciones pasaron al encabezado.
3. **Dueño:** una fila de un toque con el nombre y el WhatsApp, que abre la ficha del cliente.
4. **Mantenimiento:** su plan, si tiene, con el servicio, cada cuántos meses, el próximo y su estado. Se ajusta igual que hoy en la ficha del cliente (`MasPlan`). Sin plan: "No tiene mantenimiento programado."
5. **Historial:** las reservas y órdenes, con la misma tabla que la ficha del cliente (`ReservasCliente`, con `duenoActual`): las próximas primero y después las pasadas. Cada fila abre su orden o su reserva y muestra:
   - la fecha, el espacio y el estado (`NOMBRE_ESTADO_TRABAJO`);
   - el saldo, solo con Pagos (RN-12);
   - "Con {dueño anterior}" si era de otro cliente en ese momento (comparado por id).

   Más de 5: "Ver todo el historial ({n})", que muestra todas (`?historial=todo`). Vacío: "Todavía no tiene trabajos."
6. **Cotizaciones:** igual que el historial, con `ListaCotizaciones`. Vacío: sin la sección.

### La ficha del cliente
"Vehículos" pasa a ser una lista de filas de un toque (`ListaFilas`): la placa grande, el detalle y el tamaño. Cada fila abre la ficha del vehículo. "Agregar vehículo" sigue igual. Las desactivadas, en "Vehículos desactivados", también abren su ficha.

### Clientes (la lista)
Una búsqueda que coincide exactamente con una placa (normalizada) muestra arriba la fila "{placa}: {cliente}", que abre la ficha del vehículo. Debajo, los clientes como siempre.

### Ficha de la orden y de la cotización
La placa del encabezado (o de "Reserva para") es un enlace a la ficha del vehículo, para quien ve Clientes.

## 6. Acciones del servidor
No hay acciones nuevas. Las de siempre (`guardarVehiculo`, `cambiarEstadoVehiculo`, el cambio de dueño y los planes) se llaman desde la ficha nueva, y `revalidatePath` suma su ruta.

## 7. Componentes y diseño
Con las piezas del panel (`sistema-del-panel.md`):
- `EncabezadoPagina`: placa, estado, acción y "Más".
- `SeccionConEditar` y `ListaDatos` para los datos.
- `ListaFilas` para el dueño, los vehículos del cliente y el historial.
- `ListaCotizaciones`, `Insignia` con `TONO_ESTADO_TRABAJO`, `MenuMas` y `ModalFormulario`.

Componentes nuevos o compartidos:
- `MasVehiculo`: "Reactivar vehículo", o "Más" con "Cambiar de dueño" y "Desactivar vehículo", con confirmación.
- `ListaMantenimientos`: sale de la ficha del cliente y ahora la usan las dos fichas.
- `FilaVehiculo`: la fila que enlaza a la ficha desde la orden, la reserva y la cotización.
- `FormularioVehiculo` se exporta, sin su "Más" interno.

Las consultas por vehículo reutilizan las del cliente con otro filtro: `reservasDelVehiculo`, `cotizacionesDelVehiculo`, `mantenimientosDelVehiculo`, más `fichaVehiculo` y `vehiculoConPlacaExacta`.

## 8. Textos de la interfaz
- **Secciones:** "Datos", "Dueño", "Mantenimiento", "Historial" y "Cotizaciones".
- **Acciones:** "Nueva reserva", "Reactivar vehículo", "Cambiar de dueño", "Desactivar vehículo" y "Ver todo el historial".
- **Vacíos:** "No tiene mantenimiento programado." y "Todavía no tiene trabajos."
- **Fila de un trabajo con otro dueño:** "Con {nombre del dueño anterior}".

## 9. Pruebas
- **Unitarias:** el armado del historial, con el orden, "Con {dueño anterior}" y sin montos sin permiso (RN-12).
- **De punta a punta** (`tests/e2e/p51-ficha-vehiculo.spec.ts`):
  - desde la ficha del cliente, tocar un vehículo abre su ficha con sus datos, su dueño y su historial;
  - "Editar" guarda, y "Nueva reserva" llega con el cliente y el vehículo elegidos;
  - después de un cambio de dueño, la ficha muestra el historial completo, con "Con {anterior}" en lo de antes, y la ruta vieja redirige a la del dueño actual;
  - sin Pagos ni Cotizaciones, el historial no muestra montos;
  - el perfil Taller no entra (sin Clientes) y, en la orden, su placa no es un enlace;
  - buscar una placa en Clientes lleva a la ficha del vehículo.
- **Pruebas que cambian:** las que editan un vehículo desde la ficha del cliente (hu-21, hu-23, p37 y modales) pasan a hacerlo desde la ficha del vehículo.

## 10. Orden de trabajo
Una rama, `p51-ficha-del-vehiculo`, en un PR:
1. La consulta, la ficha y sus pruebas.
2. La lista de vehículos en la ficha del cliente.
3. Los enlaces desde la búsqueda, la orden y la cotización.

`code-review` antes del PR. La revisión de seguridad aplica a los permisos y a la redirección del dueño.

## 11. Criterio de salida
- En el celular, de la ficha de un cliente con dos autos, se ve el historial de uno solo en dos toques.
- Un auto que cambió de dueño muestra lo de antes.
- Las pruebas, en verde.

## 12. Decisiones abiertas
- Ninguna para empezar. El prototipo se aprueba antes de programar.
