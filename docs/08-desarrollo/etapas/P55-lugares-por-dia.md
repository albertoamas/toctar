# P55 Sin espacios fijos ni límite por día, y la Agenda rehecha — especificación

- **Fase y semana:** Cierre de la Entrega 2 · desde el 20/11/2026
- **Estado:** en curso (programado el 20/11/2026)
- **Historias:** HU-05 (configuración del taller), HU-29 (tablero de la agenda), HU-30 (agendar), HU-31 (reprogramar), HU-34 (extender la entrega)
- **Base:** RN-06, D-5 (`modelo-de-datos.md`), C3 (`C3-agenda-pagos.md`), P41 (reserva en pasos), pedido 28 (entregadas en la agenda), registro de cambios, pedido 55

## 1. Objetivo
Los trabajos dejan de tener un espacio fijo ("Espacio 1, 2, 3") y la agenda deja de bloquear días: muestra **cuántos autos
hay cada día** y quien reserva decide si caben. La Agenda se rehace de cero, con el diseño de las agendas de uso diario.

**Por qué (20/11/2026).** El dueño confirmó que los espacios son solo nombres: no recuerda en cuál está cada auto ni el
taller tiene puestos distintos. El espacio fijo dejaba huecos y conflictos falsos:
- una reserva de varios días necesitaba un mismo espacio libre todos los días, aunque cada día hubiera lugar;
- una orden atrasada liberaba su espacio desde su fecha de entrega, aunque el auto siguiera en el taller, y se podía
  reservar encima;
- extender una orden con otro espacio reescribía dónde estuvo los días pasados.

Se probó primero un límite de autos por día (un número en Configuración). Se quitó el mismo día, a pedido del
desarrollador: un lavado ocupa unas horas y un cerámico tres días, así que contar autos no representa la capacidad real,
y quien reserva (el dueño o su encargado) conoce el taller. La Agenda del celular (una tira de siete días que había que
tocar de a uno) y la de la computadora (llena de entregadas) no se entendían: se rehicieron.

Es un error de construcción del modelo: **sin costo** (Incluido).

## 2. Alcance
- **Incluye:**
  - Quitar el espacio de los trabajos, de la base y de todas las pantallas.
  - Sin límite por día: reservar, reprogramar y extender solo revisan las fechas.
  - La Agenda nueva (computadora, tableta y celular), con las entregadas escondidas salvo con "Ver entregadas".
  - Una orden en el taller cuenta hasta entregarse, aunque se atrase: la Agenda la muestra hasta hoy.
  - Datos de demostración sin espacios.
- **No incluye:** capacidad por horas de trabajo ni avisos de días cargados: si el dueño los pide, es otro pedido.

## 3. Reglas que se cumplen

**RN-06 (nueva redacción):** la Agenda muestra cuántos autos hay cada día; quien reserva decide si caben.

**Qué cuenta en un día `d`:**

| Estado | Cuenta los días |
|---|---|
| `agendado` | de `fecha_inicio` a `fecha_fin` |
| `recibido`, `en_proceso`, `listo` | de `fecha_inicio` a **el mayor entre `fecha_fin` y hoy**: sigue en el taller hasta entregarse |
| `entregado`, `cancelado` | ninguno |

Puro, en `agenda/reglas.ts` (`ocupaLugar`, `ultimoDiaOcupado`, `ocupadosEnDia`).

## 4. Datos
Migración `0054_sin_espacios`: se quitan la restricción `trabajo_sin_cruces`, `trabajo.espacio_id` y la tabla
`espacio_taller`. Con `IF EXISTS`: una base de desarrollo que aplicó la versión con lugares (`sucursal.lugares`) queda
igual que una nueva. Producción todavía no tiene datos reales.

Se actualizan `modelo-de-datos.md` (D-5, `trabajo`), `requerimientos.md` (RN-06) y `C3-agenda-pagos.md`.

## 5. Pantallas
- **Agenda, computadora (desde 1280 px):**
  - La semana en siete columnas. Cada día dice arriba "3 autos", "Sin reservas" o "Cerrado"; hoy, con su número en negro.
  - Sus reservas, en tarjetas compactas apiladas: placa, cliente y estado (o el problema en rojo: "Atrasada desde el 18
    nov.", "Debía ingresar el 7 nov."). Una de varios días va en cada día, con "Día 2 de 3".
  - Los días que vienen terminan con "+ Reservar" (`?fecha=`). Los pasados, en gris.
- **Agenda, tableta y celular:** una lista que empieza hoy ("Hoy, jueves 20", "Mañana, viernes 21"); los días pasados de la
  semana, plegados. Cada día, sus reservas (placa y estado; cliente y servicio; "Hasta el jueves 23") y "+ Reservar". Una
  de varios días va entera el primer día que se ve; los siguientes la nombran ("Siguen en el taller: …"). Un día sin
  reservas, en un renglón ("Sin reservas · + Reservar").
- **Entregadas:** escondidas en las dos vistas; "Ver entregadas" (`?entregadas=1`) las muestra en los días que
  estuvieron, apagadas.
- **Nueva reserva, Reprogramar, Extender, fichas, Inicio y Configuración → Taller:** sin espacio.

## 6. Acciones del servidor
- `agendarReserva` y `reprogramarReserva`: sin `espacioId` y sin contar lugares.
- `extenderEntrega`: sin `espacioId`.
- `semanaDeAgenda(lunes, domingo, conEntregadas)`: las reservas de la semana (las atrasadas hasta hoy, con su entrega
  original para el aviso) y los autos de cada día.

## 7. Componentes
`SemanaEnColumnas` y `SemanaEnLista` (`agenda/componentes/tablero.tsx`, de cero). Se quitan `CampoEspacio`,
`espacios-libres.ts`, el tablero por espacio, la tira de días del celular y la lista de espacios de Configuración.
Estados con `MarcaEstado`; sin colores nuevos.

## 8. Textos
"3 autos", "Sin reservas", "Cerrado", "Día 2 de 3", "Hasta el jueves 23", "Siguen en el taller:", "+ Reservar", "Ver
entregadas" / "Ocultar entregadas", "Atrasada desde el 18 nov.", "Debía ingresar el 7 nov.".

## 9. Pruebas
- **Unitarias:** qué cuenta cada estado (la atrasada hasta hoy) y los autos de un día.
- **De punta a punta:** la Agenda dice los autos de cada día y lleva a reservar; una de varios días en la computadora
  ("Día 1 de 2") y en la lista ("Siguen en el taller"); las entregadas solo con "Ver entregadas"; reprogramar y extender
  sin espacio. Se ajustan las que elegían espacio.

## 10. Orden de trabajo
Rama `p55-lugares-por-dia`, sobre `develop` después del recorrido visual (PR #293). Un solo PR.

## 11. Criterio de salida
Ninguna pantalla pide ni muestra un espacio; la Agenda se entiende en el celular sin tocar día por día y en la
computadora no la tapan las entregadas; toda la suite pasa.

## 12. Decisiones abiertas
Ninguna.
