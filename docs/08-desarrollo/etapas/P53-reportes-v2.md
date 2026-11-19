# P53 · Reportes v2

Rediseño de la pantalla de Reportes del pedido 16 (`P16-reportes-y-gastos.md`), pedido por el dueño el 19/11/2026 con
las referencias de YankoPOS y aprobado sobre el prototipo del mismo día. No cambia el alcance: los mismos datos (pagos,
gastos, órdenes, clientes y cotizaciones), mejor organizados. Solo el dueño.

## 1. Fechas

| Opción | Desde / hasta | Cada punto del gráfico | Contra qué se compara |
|---|---|---|---|
| Hoy | hoy | una hora (cobros y órdenes) | el mismo día de la semana pasada, hasta la misma hora |
| Esta semana | lunes a hoy | un día | los mismos días de la semana pasada |
| Este mes (la de siempre) | 1 a hoy | un día | los mismos días del mes pasado |
| Mes pasado | el mes entero | un día | el mes anterior entero |
| Últimos 6 meses | día 1 de hace 5 meses a hoy | un mes | el mismo largo justo antes |
| Elegir fechas (hasta un año) | las elegidas | día hasta 31 días, semana hasta 90, mes después | el mismo largo justo antes |

- En la computadora, un control segmentado; en el celular, un selector compacto. "Elegir fechas" abre un modal.
- Bajo el título: las fechas y contra qué se comparan ("comparado con el 1 al 19 de octubre").
- Los gastos guardan solo el día: en "Hoy" no van en un gráfico por hora, y la pestaña lo dice.

## 2. Pestañas

| Pestaña | Indicadores | Gráficos |
|---|---|---|
| Resumen | Ingresos cobrados · Gastos · Resultado · Órdenes completadas | Resultado del período (dona y desglose) · Ingresos por servicio (los 3 primeros) · Ingresos y gastos (líneas) |
| Ingresos | Ingresos cobrados · Órdenes cobradas · Ticket promedio · Por cobrar hoy | Ingresos por tramo (área) · Órdenes cobradas por tramo (área) · Servicios que más generan (ranking) · Cómo se cobró |
| Gastos | Total gastado · Movimientos · Sobre los ingresos | Gastos por tramo (área) · Gastos por categoría (con la lista de gastos). Aquí se registra un gasto |
| Taller | Órdenes recibidas · Completadas · Días en el taller · En el taller ahora | Recibidas y completadas (barras) · Servicios más realizados (ranking) · Órdenes por estado (dona) · Días promedio por servicio |
| Clientes | Clientes atendidos · Nuevos · Volvieron · Cotizaciones aceptadas | Clientes que más pagaron (ranking) · Nuevos y que volvieron (dona) · Clientes atendidos por tramo (área) |

Los rankings muestran 5 y "Ver los N restantes".

## 3. Reglas de los números

- **Ingresos = lo cobrado** (pagos y adelantos sin anular, por la fecha del pago), nunca lo vendido.
- **Por servicio:** cada cobro se reparte entre los servicios de su orden según el precio de sus líneas. Un cobro de una
  orden sin líneas va a "Otros".
- **Órdenes completadas:** las entregadas en las fechas. **Recibidas:** las recibidas en las fechas.
- **Órdenes por estado:** las recibidas en las fechas, según cómo están hoy (entregadas, listas, en el taller).
- **Días en el taller:** de recibida a entregada, de las completadas. **Por servicio:** de las órdenes que lo incluyen.
- **Clientes atendidos:** clientes distintos con una orden completada. **Nuevo:** su primera entrega cae en las fechas.
- **El cambio** en verde si es bueno y en rojo si es malo (más gastos, más días en el taller: en rojo). Sin un anterior
  con qué comparar, lo dice ("Sin datos para comparar").
- **Colores:** ingresos en verde y gastos en rojo (`--grafico-ingreso`, `--grafico-gasto`, validados para daltonismo);
  cada servicio con un color fijo por su lugar en el catálogo (`--grafico-servicio-1` a `8`).

## 4. Código

- `src/modulos/reportes/datos.ts`: los datos crudos de unas fechas (cobros, gastos, órdenes y sus líneas), una vez por
  pantalla.
- `src/modulos/reportes/calculos.ts`: los indicadores, los tramos, los repartos y los rankings. Funciones puras, con
  sus pruebas en `tests/unit/reportes-calculos.test.ts`.
- `src/modulos/reportes/pestanas/`: una pestaña por archivo, y `comun.tsx` con la carga y las piezas compartidas.
- `src/modulos/reportes/componentes/graficos.tsx`: los gráficos (Recharts, con shadcn/ui Charts) y las listas con
  barras de progreso.
- `src/modulos/reportes/componentes/selector-periodo.tsx`: el selector de fechas.

## 5. Pruebas

- Unitarias: `tests/unit/reportes.test.ts` (períodos y tramos) y `tests/unit/reportes-calculos.test.ts` (los números).
- E2E: `tests/e2e/p16-reportes.spec.ts` (los montos contra la base, las cinco pestañas, que nada se salga de la
  pantalla en el celular y "Elegir fechas").
