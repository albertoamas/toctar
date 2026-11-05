# P37 Un vehículo cambia de dueño — especificación

- **Fase y semana:** C. Entrega 2 · 4 de noviembre de 2026, antes del cierre
- **Estado:** aprobada por YankoSoft y hecha (04/11/2026, PR #138).
- **Pedido:** 37 de `03-cierre-comercial/registro-de-cambios.md`
- **Historias que cambian:** HU-21 (registrar vehículos), HU-23 (ficha del cliente), HU-38 (mantenimientos)
- **Base:** C1 (`C1-catalogo-clientes.md`): la placa es única entre los vehículos activos (RF-23) y nada se borra (RN-14). P21 (`P21-planes-mantenimiento.md`): el plan de mantenimiento es del vehículo.

## 1. Objetivo
Los autos se venden. Cuando el comprador trae un auto que ya atendimos, el sistema hoy no deja cargar su placa (es del dueño anterior) y la única salida es desactivar el vehículo y cargarlo de nuevo, perdiendo su historia. Además, una cotización abierta del dueño anterior se podía reservar con un auto que ya no es suyo. "Cambió de dueño" pasa **el mismo vehículo** al cliente nuevo, con su plan de mantenimiento, y deja intacto lo del anterior.

## 2. Alcance
- **Incluye:**
  - **"Cambiar de dueño"** en el menú "Más" de la edición de un vehículo (ficha del dueño actual), junto a "Desactivar": lleva a una pantalla que pide elegir al nuevo dueño y confirma.
  - **Desde el aviso de placa repetida** al agregar un vehículo en la ficha de otro cliente: "Cambiar de dueño a este cliente", que lleva a la misma confirmación con el nuevo dueño ya elegido.
  - Al confirmar, en una transacción:
    - el vehículo pasa al nuevo dueño (sigue siendo el mismo, con su placa y sus datos);
    - sus mantenimientos abiertos (pendientes o avisados) pasan al nuevo dueño: el aviso le llega a él;
    - las cotizaciones abiertas del dueño anterior para ese vehículo (pendientes o aceptadas sin fecha) pasan a rechazadas con el motivo "Otro: el vehículo cambió de dueño";
    - queda en la auditoría quién lo hizo, cuándo y de quién a quién.
- **No cambia:** lo del dueño anterior (sus reservas, órdenes, pagos, cotizaciones cerradas y PDF) sigue a su nombre.
- **Lo frena:** una reserva activa (agendada, en el taller o lista para entregar): primero se entrega o se cancela. También un vehículo o un cliente nuevo desactivado, o pasarlo al mismo dueño. Si tiene cotizaciones abiertas, lo hace quien tiene "Cotizaciones" (cerrarlas es rechazarlas, pedido 24).
- **Abierta** es una cotización pendiente o aceptada **sin** trabajo (no cancelado). Una aceptada con su trabajo, aunque ya entregado, es historia y no se toca (`cotizacionAbierta`).
- **Después del cambio**, una cotización del anterior para ese vehículo no vuelve a pendiente, no se acepta y no se reserva: el vehículo ya es de otro cliente. Una reserva y un cambio de dueño a la vez no se cruzan: reservar bloquea el vehículo y mira que siga siendo de ese cliente.
- **No incluye:** registrar al nuevo dueño desde esta pantalla (se crea antes en Clientes, como siempre) ni pasar el historial de trabajos del anterior al nuevo.

## 3. Reglas que se cumplen
- RN-14: nada se borra.
- RF-23: la placa sigue siendo de un solo vehículo activo (el mismo, que cambia de dueño).
- RN-02: las cotizaciones enviadas no cambian su precio ni su PDF; solo su estado.

## 4. Datos
Sin migración. Cambia `vehiculo.cliente_id`, `recordatorio_mantenimiento.cliente_id` de los abiertos y el estado de las consultas abiertas (con su versión aceptada de vuelta a `enviada`, como al rechazar). Se registra en `auditoria` (`entidad = 'vehiculo'`, `accion = 'cambiar_dueno'`, con los dos clientes).
- Bloqueos, en el orden del resto de la app: primero las consultas del vehículo, después el vehículo (`FOR UPDATE`, que frena una reserva nueva sobre él mientras se cambia).

## 5. Pantallas y rutas
- `/panel/clientes/[id]/vehiculos/[vehiculo]/dueno`: "Cambiar de dueño {placa}", un flujo de un paso a 768 px. Sin `?nuevo=`, el buscador de clientes con el título "Nuevo dueño", sin el dueño actual; con él, una tarjeta con tres filas (Pasa, Se cierra, Queda) y al pie "Cambiar de dueño" y "Cancelar", fijos abajo en el celular. Al terminar, la ficha del nuevo dueño con el aviso "{placa} ahora es de {cliente}."

## 6. Acciones del servidor
- `cambiarDuenoVehiculo`: con el permiso de Clientes; `vehiculoId`, `clienteActualId` y `clienteNuevoId` validados con Zod.

## 9. Pruebas
- E2E: pasar un vehículo desde la edición, con el aviso, el mantenimiento abierto y la cotización abierta cerrada; desde el aviso de placa repetida; frenado con una reserva activa.

## 12. Decisiones abiertas
| Qué | De quién | Mientras tanto |
|---|---|---|
| ¿El nuevo dueño debería ver los trabajos que se le hicieron al auto antes? | Dueño | No: son del cliente anterior. El plan de mantenimiento sí pasa |
