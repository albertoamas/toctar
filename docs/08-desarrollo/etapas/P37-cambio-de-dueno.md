# P37 Un vehículo cambia de dueño — especificación

- **Fase y semana:** C. Entrega 2 · 4 de noviembre de 2026, antes del cierre
- **Estado:** aprobada por YankoSoft (04/11/2026). Rama `pedido-37-cambio-de-dueno`.
- **Pedido:** 37 de `03-cierre-comercial/registro-de-cambios.md`
- **Historias que cambian:** HU-21 (registrar vehículos), HU-23 (ficha del cliente), HU-38 (mantenimientos)
- **Base:** C1 (`C1-catalogo-clientes.md`): la placa es única entre los vehículos activos (RF-23) y nada se borra (RN-14). P21 (`P21-planes-mantenimiento.md`): el plan de mantenimiento es del vehículo.

## 1. Objetivo
Los autos se venden. Cuando el comprador trae un auto que ya atendimos, el sistema hoy no deja cargar su placa (es del dueño anterior) y la única salida es desactivar el vehículo y cargarlo de nuevo, perdiendo su historia. Además, una cotización abierta del dueño anterior se podía reservar con un auto que ya no es suyo. "Cambió de dueño" pasa **el mismo vehículo** al cliente nuevo, con su plan de mantenimiento, y deja intacto lo del anterior.

## 2. Alcance
- **Incluye:**
  - **"Cambió de dueño"** en la edición de un vehículo (ficha del dueño actual), junto a "Desactivar": lleva a una pantalla que pide elegir al nuevo dueño y confirma.
  - **Desde el aviso de placa repetida** al agregar un vehículo en la ficha de otro cliente: "¿Cambió de dueño? Pasarlo a {cliente}", que lleva a la misma confirmación con el nuevo dueño ya elegido.
  - Al confirmar, en una transacción:
    - el vehículo pasa al nuevo dueño (sigue siendo el mismo, con su placa y sus datos);
    - sus mantenimientos abiertos (pendientes o avisados) pasan al nuevo dueño: el aviso le llega a él;
    - las cotizaciones abiertas del dueño anterior para ese vehículo (pendientes o aceptadas sin fecha) pasan a rechazadas con el motivo "Otro: el vehículo cambió de dueño";
    - queda en la auditoría quién lo hizo, cuándo y de quién a quién.
- **No cambia:** lo del dueño anterior (sus reservas, órdenes, pagos, cotizaciones cerradas y PDF) sigue a su nombre.
- **Lo frena:** una reserva activa (agendada, en el taller o lista para entregar): primero se entrega o se cancela. También un vehículo o un cliente nuevo desactivado, o pasarlo al mismo dueño.
- **No incluye:** registrar al nuevo dueño desde esta pantalla (se crea antes en Clientes, como siempre) ni pasar el historial de trabajos del anterior al nuevo.

## 3. Reglas que se cumplen
- RN-14: nada se borra.
- RF-23: la placa sigue siendo de un solo vehículo activo (el mismo, que cambia de dueño).
- RN-02: las cotizaciones enviadas no cambian su precio ni su PDF; solo su estado.

## 4. Datos
Sin migración. Cambia `vehiculo.cliente_id`, `recordatorio_mantenimiento.cliente_id` de los abiertos y el estado de las consultas abiertas (con su versión aceptada de vuelta a `enviada`, como al rechazar). Se registra en `auditoria` (`entidad = 'vehiculo'`, `accion = 'cambiar_dueno'`, con los dos clientes).
- Bloqueos, en el orden del resto de la app: primero las consultas del vehículo, después el vehículo (`FOR UPDATE`, que frena una reserva nueva sobre él mientras se cambia).

## 5. Pantallas y rutas
- `/panel/clientes/[id]/vehiculos/[vehiculo]/dueno`: "Cambiar de dueño {placa}". Sin `?nuevo=`, el buscador de clientes; con él, el resumen (de quién a quién, qué pasa y qué se cierra) y "Pasar a {cliente}". Al terminar, la ficha del nuevo dueño con el aviso "{placa} ahora es de {cliente}."

## 6. Acciones del servidor
- `cambiarDuenoVehiculo`: con el permiso de Clientes; `vehiculoId`, `clienteActualId` y `clienteNuevoId` validados con Zod.

## 9. Pruebas
- E2E: pasar un vehículo desde la edición, con el aviso, el mantenimiento abierto y la cotización abierta cerrada; desde el aviso de placa repetida; frenado con una reserva activa.

## 12. Decisiones abiertas
| Qué | De quién | Mientras tanto |
|---|---|---|
| ¿El nuevo dueño debería ver los trabajos que se le hicieron al auto antes? | Dueño | No: son del cliente anterior. El plan de mantenimiento sí pasa |
