# P55 Lugares por día en vez de espacios fijos — especificación

- **Fase y semana:** Cierre de la Entrega 2 · desde el 20/11/2026
- **Estado:** borrador (para revisar con el desarrollador)
- **Historias:** HU-05 (configuración del taller), HU-30 (agendar), HU-31 (reprogramar), HU-34 (extender la entrega), HU-39 (pantalla del día)
- **Base:** RN-06, D-5 (`modelo-de-datos.md`), C3 (`C3-agenda-pagos.md`), P41 (reserva en pasos), registro de cambios, pedido 55

## 1. Objetivo
La agenda deja de asignar un espacio fijo ("Espacio 1, 2, 3") a cada reserva y pasa a contar **cuántos autos hay cada día** contra la cantidad de lugares del taller. Una orden que sigue en el taller ocupa su lugar hasta entregarse. Es lo mínimo para que funcione: un número en Configuración y que un día lleno no se pueda reservar (20/11, a pedido del desarrollador: "quitar lo innecesario").

**Por qué (20/11/2026).** El dueño confirmó que los espacios son solo nombres: no recuerda en cuál está cada auto ni el taller tiene puestos distintos. El espacio fijo dejaba huecos y conflictos falsos:
- una reserva de varios días necesitaba un mismo espacio libre todos los días, aunque cada día hubiera lugar;
- una orden atrasada liberaba su espacio desde su fecha de entrega, aunque el auto siguiera en el taller, y se podía reservar encima;
- extender una orden con otro espacio reescribía dónde estuvo los días pasados.

Es un error de construcción del modelo: **sin costo** (Incluido).

## 2. Alcance
- **Incluye:**
  - Contar lugares por día al reservar y al reprogramar.
  - Las órdenes abiertas ocupan su lugar hasta entregarse.
  - "Lugares en el taller" en Configuración → Taller.
  - Quitar el espacio de todas las pantallas y de la base.
  - Datos de demostración sin cruces.
- **No incluye:**
  - Capacidad por horas de trabajo (cuántas horas toma cada servicio): queda como idea futura si el dueño la pide.
  - Asignar un puesto físico al recibir: el dueño dijo que no lo necesita.
  - Avisos de días con más autos que lugares en Inicio, en Extender o al bajar los lugares: alcanza con que la Agenda los marque.

## 3. Reglas que se cumplen

**RN-06 (nueva redacción):** el taller tiene **N lugares** (configurable, hoy 3). Al reservar, reprogramar o extender, ningún día queda con más trabajos que lugares. Si queda alguno, se avisa (ver "Extender").

**Qué ocupa un lugar en un día `d`:**

| Estado | Ocupa los días |
|---|---|
| `agendado` | de `fecha_inicio` a `fecha_fin` |
| `recibido`, `en_proceso`, `listo` | de `fecha_inicio` a **el mayor entre `fecha_fin` y hoy**: sigue en el taller hasta entregarse, aunque esté atrasada |
| `entregado`, `cancelado` | ninguno |

Una lista que espera al cliente también ocupa: el auto sigue en el taller.

**Cada acción:**
- **Reservar** (directa o desde cotización): cada día del rango tiene que tener lugar. Si alguno está lleno, error junto a las fechas con los días llenos. Se hace en el servidor; la pantalla lo adelanta.
- **Reprogramar:** igual que reservar, sin contarse a sí misma.
- **Extender la entrega:** solo cambia la fecha, sin contar lugares. El auto ya está en el taller y no se lo puede rechazar.
- **Días con más autos que lugares** (por una extensión o por una atrasada): la Agenda los marca en rojo ("4 de 3 lugares"). No hay avisos en otras pantallas.
- **Bajar los lugares** en Configuración: se permite, sin aviso. Si deja días con más autos que lugares, la Agenda los marca.

**Dos personas a la vez:**
- La restricción de exclusión de la base (D-5) deja de servir. En su lugar, las acciones que suman ocupación (reservar y reprogramar) bloquean la fila de la sucursal (`SELECT … FOR UPDATE`) dentro de su transacción y recién después cuentan.
- Así, dos reservas del último lugar a la vez no pasan las dos: la segunda espera, vuelve a contar y recibe "Ese día ya se llenó".

**Días cerrados del horario:** sin cambio, no se reserva en ellos.

## 4. Datos

Migración `0054_lugares_por_dia`:
1. `sucursal.lugares integer not null default 3`, con `check (lugares between 1 and 50)`. Se llena con la cantidad de espacios activos de cada sucursal (mínimo 1).
2. Se quita la restricción `trabajo_sin_cruces`.
3. Se quita `trabajo.espacio_id`. El nombre del espacio no tenía significado, así que no hace falta guardarlo en el historial.
4. Se quita la tabla `espacio_taller`, con su índice.

Producción todavía no tiene datos reales. En pruebas, las reservas pierden el espacio y nada más.

Se actualizan:
- `modelo-de-datos.md`: D-5 nueva, sin la restricción de exclusión; `trabajo` sin `espacio_id`; `sucursal.lugares`.
- `requerimientos.md`: RN-06.
- `C3-agenda-pagos.md`.

## 5. Pantallas y rutas
- **Configuración → Taller:** en lugar de la lista de espacios, una sección "Lugares en el taller" con un campo numérico y "Guardar lugares". Ayuda: "Cuántos autos entran a la vez. La agenda no deja reservar un día lleno."
- **Agenda, tablero de la computadora:**
  - Las filas por espacio pasan a ser columnas por día.
  - Cada día lleva arriba "2 de 3 lugares" y debajo sus autos: las reservas de varios días, una vez por día, como en la tableta.
  - Día lleno: "Lleno" en gris. Sobrecupo: "4 de 3 lugares" en rojo.
  - Un día con lugar ofrece "Reservar" (`?fecha=`).
- **Agenda en la tableta y el celular:** la cabecera de cada día dice "2 de 3 lugares", con las mismas marcas.
- **Nueva reserva, paso Fecha:**
  - Sin el campo Espacio.
  - Si un día está lleno, el error debajo de las fechas: "El viernes 21 ya tiene los 3 lugares ocupados".
  - El resumen deja de decir el espacio.
- **Reprogramar:** solo las fechas. "Ahora: Vie 11 dic." sin el espacio.
- **Extender la entrega:** solo la nueva fecha.
- **Fichas de reserva y orden:** sin la fila "Espacio". El aviso de reservada dice "Reservada para el viernes 11 de diciembre."
- **Inicio:** "Para hoy" sin el espacio ("Por recibir").

## 6. Acciones del servidor
- `agendarReserva` y `reprogramarReserva`: sin `espacioId` en la entrada; bloquean la sucursal y cuentan con `diasLlenos(rango, excepto)`; los errores van con la clave `fechaInicio` (los días llenos, en una frase).
- `extenderEntrega` (`ordenes/acciones/estado.ts`): sin `espacioId` y sin contar lugares.
- `guardarLugares` (configuración): Zod `z.coerce.number().int().min(1).max(50)`. La llama el dueño o quien tiene Configuración. Revalida la Agenda.
- La consulta `espaciosEnFechas` se reemplaza por `ocupacion(desde, hasta)`, que devuelve por día los trabajos que ocupan y los lugares. Lugares libres por día y días llenos son reglas puras en `agenda/reglas.ts`.

## 7. Componentes y diseño
- Se quitan `CampoEspacio` y `espacios-libres.ts`.
- La cabecera de día con "2 de 3 lugares", que comparten el tablero y las listas.
- Más autos que lugares, en el tono `peligro`; lleno, en gris. Sin colores nuevos.

## 8. Textos de la interfaz
- Configuración: "Lugares en el taller", ayuda "Cuántos autos entran a la vez. La agenda no deja reservar un día lleno.", botón "Guardar lugares", aviso "Lugares guardados."
- Paso Fecha:
  - un día lleno: "El {día} ya tiene los {N} lugares ocupados."
  - varios días llenos: "Sin lugar el {día} y el {día}."
- Reservar a la vez: "Ese día se llenó recién. Elige otra fecha."
- Agenda: "{n} de {N} lugares", "Lleno", "{M} de {N} lugares" (en rojo).

## 9. Pruebas
- **Unitarias** (`tests/unit/agenda.test.ts`):
  - qué ocupa cada estado, incluida la atrasada hasta hoy;
  - los días llenos de un rango, sin contarse a sí misma;
  - un día con más autos que lugares.
- **De punta a punta:**
  - una reserva de varios días entra aunque ningún "espacio" estuviera libre todos los días;
  - un día lleno no se puede reservar;
  - una orden atrasada ocupa su lugar hoy, y una reserva nueva para hoy ve un lugar menos;
  - extender hasta un día lleno se permite, y la Agenda marca ese día en rojo;
  - Configuración guarda los lugares;
  - dos reservas del último lugar a la vez: solo una pasa.
- Se ajustan las pruebas que eligen espacio: hu-30, hu-31, hu-33, hu-39, hu-05, reserva-empieza-de-cero, flujo-taller-completo, entre otras.

## 10. Orden de trabajo
- Rama `p55-lugares-por-dia`, sobre `develop` **después de unir el recorrido visual (PR #293)**.
- Orden: reglas y pruebas unitarias → migración → acciones → pantallas → Agenda → Inicio → datos de demostración → documentos.
- Un solo PR.

## 11. Criterio de salida
- Con la base de demostración recargada, la Agenda no muestra cruces.
- Una orden atrasada ocupa su lugar.
- Un día con más autos que lugares se ve en rojo en la Agenda.
- Ninguna pantalla pide ni muestra un espacio.
- Toda la suite de pruebas pasa.

## 12. Decisiones abiertas
Ninguna.
