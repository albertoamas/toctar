# P55 Sin espacios fijos ni límite por día, y la Agenda rehecha — especificación

- **Fase y semana:** Cierre de la Entrega 2 · desde el 20/11/2026
- **Estado:** en curso (programado el 20/11/2026)
- **Historias:** HU-05 (configuración del taller), HU-29 (tablero de la agenda), HU-30 (agendar), HU-31 (reprogramar), HU-34 (extender la entrega)
- **Base:** RN-06, D-5 (`modelo-de-datos.md`), C3 (`C3-agenda-pagos.md`), P41 (reserva en pasos), pedido 28 (entregadas en la agenda), registro de cambios, pedido 55

## 1. Objetivo
Los trabajos dejan de tener un espacio fijo ("Espacio 1, 2, 3") y la agenda deja de bloquear días: quien reserva decide si
caben. La Agenda se rehace de cero como el **calendario de citas** de los sistemas de talleres (Shopmonkey, Tekmetric,
Jobber): solo las reservas por recibir. Lo que ya está en el taller se trabaja en Órdenes, su tablero.

**Por qué (20/11/2026).** El dueño confirmó que los espacios son solo nombres: no recuerda en cuál está cada auto ni el
taller tiene puestos distintos. El espacio fijo dejaba huecos y conflictos falsos:
- una reserva de varios días necesitaba un mismo espacio libre todos los días, aunque cada día hubiera lugar;
- una orden atrasada liberaba su espacio desde su fecha de entrega, aunque el auto siguiera en el taller, y se podía
  reservar encima;
- extender una orden con otro espacio reescribía dónde estuvo los días pasados.

Se probó primero un límite de autos por día (un número en Configuración). Se quitó el mismo día, a pedido del
desarrollador: un lavado ocupa unas horas y un cerámico tres días, así que contar autos no representa la capacidad real,
y quien reserva (el dueño o su encargado) conoce el taller. La Agenda del celular (una tira de siete días que había que
tocar de a uno) y la de la computadora (llena de entregadas) no se entendían. Un primer rediseño (tarjetas por día con
los autos en el taller) tampoco convenció: mezclaba el calendario de citas con el tablero de trabajos, que ya es Órdenes.
El 20/11 se compararon tres prototipos y se aprobó este, con el estándar del rubro.

Es un error de construcción del modelo: **sin costo** (Incluido).

## 2. Alcance
- **Incluye:**
  - Quitar el espacio de los trabajos, de la base y de todas las pantallas.
  - Sin límite por día: reservar, reprogramar y extender solo revisan las fechas.
  - La Agenda nueva (computadora, tableta y celular): solo reservas por recibir; lo que está en el taller, en una línea
    que lleva a Órdenes; las entregadas, en Órdenes → Entregadas.
  - Datos de demostración sin espacios.
- **No incluye:** capacidad por horas de trabajo ni avisos de días cargados: si el dueño los pide, es otro pedido.

## 3. Reglas que se cumplen

**RN-06 (nueva redacción):** los trabajos solo tienen sus fechas; la Agenda muestra las reservas por recibir de cada día
y quien reserva decide si caben.

**Qué muestra la Agenda:** las reservas (`agendado`) el día que llegan; una que no llegó en su día, hoy y en rojo
("Debía ingresar el 18 nov."). Las órdenes en el taller (`recibido`, `en_proceso`, `listo`) solo se cuentan en "En el
taller: N autos", que lleva a Órdenes. Entregadas y canceladas, no.

## 4. Datos
Migración `0054_sin_espacios`: se quitan la restricción `trabajo_sin_cruces`, `trabajo.espacio_id` y la tabla
`espacio_taller`. Con `IF EXISTS`: una base de desarrollo que aplicó la versión con lugares (`sucursal.lugares`) queda
igual que una nueva. Producción todavía no tiene datos reales.

Se actualizan `modelo-de-datos.md` (D-5, `trabajo`), `requerimientos.md` (RN-06) y `C3-agenda-pagos.md`.

## 5. Pantallas
- **Arriba, en las dos vistas:** "En el taller: 3 autos" con sus placas y un punto del color de cada estado (lleva a
  Órdenes; sin ese módulo, solo informa) y "Cotizaciones por reservar", plegadas como antes.
- **Computadora (desde 1280 px):** la semana en siete columnas, con sus flechas y "Hoy". Cada día dice "2 llegan", "Sin
  reservas" o "Cerrado"; hoy, con su número en negro. Las reservas en tarjetas compactas con una barra fina a la izquierda
  (ámbar; roja si no llegó): placa, cliente, estado y "3 días" si dura más de uno. Los días siguientes de una reserva
  larga la nombran en gris ("7788PQR sigue"). Los días que vienen terminan con "+ Reservar" (`?fecha=`).
- **Tableta y celular:** una sola lista desde hoy, sin semanas ni días anteriores. Cada día con reservas lleva su fecha
  a la izquierda (hoy en negro, siempre presente aunque esté vacío) y sus reservas: placa y estado; cliente y servicio;
  "3 días, hasta el jueves 27". Los días sin reservas, juntos en un renglón ("Lun 23 al Mié 25 · sin reservas", con
  "+ Reservar"); entre semanas, "Semana del 24 nov."; los cerrados, "Dom 23 · cerrado". Muestra cuatro semanas y sigue
  con "Ver más días" (`?hasta=`, hasta un año).
- **Nueva reserva, Reprogramar, Extender, fichas, Inicio y Configuración → Taller:** sin espacio.

## 6. Acciones del servidor
- `agendarReserva` y `reprogramarReserva`: sin `espacioId` y sin límite.
- `extenderEntrega`: sin `espacioId`.
- `datosAgenda(desde, hasta)`: las reservas por recibir del tramo (y las que no llegaron), los autos en el taller y los
  días cerrados. Una sola consulta para las dos vistas.

## 7. Componentes
`EnElTaller`, `SemanaEnColumnas` y `ListaDesdeHoy` (`agenda/componentes/tablero.tsx`, de cero). Se quitan `CampoEspacio`,
`espacios-libres.ts`, el tablero por espacio, la tira de días del celular, "Ver entregadas" y la lista de espacios de
Configuración. Estados con `MarcaEstado`; sin colores nuevos.

## 8. Textos
"En el taller: 3 autos", "2 llegan", "Sin reservas", "Cerrado", "3 días", "7788PQR sigue", "3 días, hasta el jueves 27",
"Lun 23 al Mié 25 · sin reservas", "Semana del 24 nov.", "+ Reservar", "Ver más días", "Debía ingresar el 7 nov.".

## 9. Pruebas
- **De punta a punta:** la Agenda muestra las reservas de cada día y lleva a reservar; una de varios días en la
  computadora ("2 días", "sigue") y en la lista ("hasta el miércoles"); los días libres juntos; el celular sin semanas y
  con "Ver más días"; una entregada no aparece (está en Órdenes → Entregadas); reprogramar y extender sin espacio.

## 10. Orden de trabajo
Rama `p55-lugares-por-dia`, sobre `develop` después del recorrido visual (PR #293). Un solo PR.

## 11. Criterio de salida
Ninguna pantalla pide ni muestra un espacio; la Agenda muestra solo lo que viene, se lee en el celular sin tocar día por
día y lleva a Órdenes para lo que está en el taller; toda la suite pasa.

## 12. Decisiones abiertas
Ninguna.
