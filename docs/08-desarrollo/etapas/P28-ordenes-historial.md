# P28 Órdenes con historial y entregadas en la agenda: especificación

- **Fase y semana:** C. Entrega 2 · 1 de noviembre de 2026, punto 6 de los ajustes de la reunión con el dueño (`../ajustes-reunion-dueno.md`)
- **Estado:** aprobada (01/11/2026) y en curso en la rama `pedido-28-ordenes-historial`
- **Pedido:** 28 de `03-cierre-comercial/registro-de-cambios.md`
- **Historias que cambian:** HU-34 (órdenes), HU-29 (tablero de la agenda)

## 1. Objetivo
Que el dueño encuentre una orden pasada (por placa, cliente o fecha) y que en la agenda se vean los autos que ya se entregaron, en verde, sin tapar las reservas que siguen.

## 2. Qué cambia
- **Órdenes:** dos pestañas.
  - **"En el taller"** (la de siempre): recibidas, en proceso y listas. Desde el 10/11 (la barra de las listas) también se busca, por placa, cliente o vehículo (`filtrarOrdenes`), y los filtros por estado cuentan lo buscado; lo buscado no pasa a "Entregadas", que busca también fechas.
  - **"Entregadas"**: el historial, la más reciente primero, de a 20 por página ("Más recientes" y "Anteriores"), con una búsqueda por **placa**, **cliente** o **fecha de entrega** ("5/10" o "5/10/2026", en hora de Bolivia). Cada fila: la placa, "Entregada el …", los servicios y el cliente (y el técnico, para quien ve todas), con la insignia verde "Entregada".
  - El técnico ve solo las suyas, también en "Entregadas" (RN-12).
- **Agenda:** las entregadas **siguen en el tablero**, en verde y con "Entregada", en los días que estuvieron. Ya no ocupan el espacio, así que:
  - se ven en los días **anteriores a hoy**: el día de la entrega el espacio queda "Libre" para agendar el siguiente auto, y la entregada aparece desde el día siguiente;
  - si otra reserva (u otra entregada) usa ese espacio alguno de esos días, gana esa, y la entregada se ve en los días que quedan (cada tramo seguido, una cinta);
  - al entregar, el último día pasa a ser el de la entrega: antes de lo previsto se acorta, y si se atrasó se alarga hasta ese día.
  - Las canceladas siguen sin verse.
- Los roles quedan claros: **Agenda** planifica (qué entra y cuándo); **Órdenes** es el trabajo y su historial.

## 3. Reglas
| Regla | Cómo se garantiza |
|---|---|
| Una entregada no tapa a otra reserva ni a otra entregada, y no quita el "Libre" de hoy | `entregadasALaVista` (`agenda/reglas.ts`), pura, día por día (no depende de la semana) y con prueba unitaria |
| Una página de más o rara no rompe la lista | La página se lleva a la primera o a la última |
| La fecha buscada es la de Bolivia | `entregado_at at time zone 'America/La_Paz'` en la consulta; `fechaBuscada` lee "d/m" o "d/m/aaaa" |
| El técnico, solo las suyas | `ordenesEntregadas({ tecnicoId })` |
| Una búsqueda nueva empieza en la primera página | El buscador quita `?pagina=` al escribir |

## 4. Datos
Sin cambios en la base.

## 5. Pruebas
- **Unitarias:** `entregadasALaVista` (recorte, sin días libres, canceladas); `fechaBuscada`.
- **E2E (`hu-34-historial`):** buscar entregadas por placa, cliente y fecha, y abrir una; la agenda la muestra en verde con "Entregada"; el técnico ve solo las suyas y sin precios.

## 6. Terminado cuando
El dueño busca "5678" en Órdenes → Entregadas y abre la orden de hace dos meses; en la agenda ve qué días se entregó cada auto.
