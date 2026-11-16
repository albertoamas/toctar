# P16 Reportes y gastos — especificación

- **Fase y semana:** C. Entrega 2 · del 16 al 27 de noviembre de 2026, junto con el cierre (se entrega con la Entrega 2)
- **Estado:** programada el 16/11/2026 en la rama `p16-gastos` (gastos y reportes), sin subir todavía; aprobada por YankoSoft el 16/11/2026, con las dos decisiones de §12 como se proponen (los gastos, solo el dueño; las categorías, en Configuración → Parámetros). Se programa después del lavado de cara de la Agenda.
- **Pedido:** 16 de `03-cierre-comercial/registro-de-cambios.md`. Aprobada el 16/11/2026 la **opción B**: reportes y gastos con la ganancia del mes, Bs 720. Pagado el 50 %; el otro 50 %, al entregar.
- **Prototipo aprobado por el dueño:** el de la cotización (opción B: "Reportes con gastos", "Gastos del mes" y "Registrar gasto", en el celular y en la computadora). Está en `out/prototipo-reportes` (local) y en el artifact de la cotización.
- **Base:**
  - los pagos de los clientes (`pago`, C3), que ya tienen fecha, método, comprobante y anulación;
  - los trabajos y sus líneas (`trabajo`, `trabajo_linea`, C4);
  - las cotizaciones y su motivo de pérdida (`consulta`, C2);
  - los mantenimientos (`recordatorio_mantenimiento`, P21).

## 1. Objetivo
Que el dueño vea, en una pantalla, **cuánto entró, cuánto salió y cuánto le quedó** en el mes, en qué se le fue la plata y cómo le fue al taller. Para eso registra sus gastos desde el celular, con la foto del comprobante.

## 2. Alcance
- **Incluye:**
  - **Gastos:** registrar un gasto (qué se pagó, monto, cómo, fecha, detalle y comprobante opcionales), la lista del mes con filtro por categoría, ver el comprobante y anular un gasto con su motivo. Nada se borra (RN-14).
  - **Las categorías de gasto**, editables en Configuración. Vienen cuatro: Insumos y productos, Alquiler del local, Luz, agua e internet, y Otros.
  - **Reportes, de un mes:** "Este mes" o "Mes pasado".
    - **Ganancia:** "Entró − Salió = Quedó", con la comparación con el mes anterior y qué parte de lo que entró quedó.
    - **Últimos 6 meses:** lo que entró, lo que salió y lo que quedó, en barras.
    - **En qué se gastó:** por categoría, de mayor a menor.
    - **El taller en el mes:** vehículos entregados y servicios más pedidos.
    - **Cotizaciones:** cuántas se enviaron, cuántas se aceptaron y por qué no se aceptaron.
    - **Clientes y mantenimientos:** clientes que volvieron, los que vinieron por primera vez, mantenimientos avisados y cuántos reservaron después del aviso.
  - **El menú:** "Reportes" en Administración, solo para el dueño.
- **No incluye:**
  - Sueldos ni pagos al personal (pedido 15, Sistema completo).
  - Contabilidad, impuestos o facturación: "Quedó" es lo que entró menos lo que se registró como gasto, no un balance contable.
  - Exportar a Excel o PDF, comparar otros períodos (un mes cualquiera o un año) y reportes por encargado: quedan para el Sistema completo.

## 3. Reglas que se cumplen
- **RN-01 y permisos:** solo el dueño ve los Reportes y registra o anula gastos. El módulo `reportes` no se asigna a encargados, como el Catálogo y Configuración. Cada página y acción llama a `exigirModulo("reportes")`.
- **Qué cuenta como "entró":** los pagos **no anulados** de los clientes, por su **fecha de pago**, en hora de Bolivia. No cuenta lo cotizado ni lo reservado: solo lo cobrado.
- **Qué cuenta como "salió":** los gastos **no anulados**, por su fecha.
- **RN-14:** un gasto no se borra. Se anula con su motivo, como un pago (quién y cuándo), y deja de contar.
- **Fechas:** se guarda la fecha del gasto (`date`). Los meses se cortan en hora de Bolivia (`America/La_Paz`).
- **Montos:** `numeric(12,2)`, mayores a cero, con la misma lectura que los pagos (`leerMonto`, "250" o "250,50"). Se muestran como "Bs 1.180".
- **Comprobantes:** son datos del negocio, así que van al bucket **privado** (`guardarFoto(…, { privado: true })`) y se ven con `urlsFotoPrivada`, como los comprobantes de pago.
- **Todo configurable:** las categorías, desde el panel. Nada fijo en el código salvo las cuatro iniciales, que se cargan con la migración.

## 4. Datos
Migración `0050_gastos`:
- **`categoria_gasto`:**
  - `id`, `nombre` (text, único entre las activas), `orden` (int) y `activo` (bool, true);
  - datos iniciales: las cuatro categorías.
- **`gasto`:**
  - `id`, `categoria_id` (→ `categoria_gasto`), `monto` (numeric(12,2), > 0), `metodo` (`efectivo` | `qr` | `transferencia`, como `METODOS_PAGO`), `fecha` (date), `detalle` (text, nulo, hasta 200), `comprobante_archivo_id` (→ `archivo`, nulo);
  - de la anulación: `anulado` (bool, false), `motivo_anulacion`, `anulado_at` y `anulado_por`;
  - `created_at` y `created_by`;
  - índice por `fecha` (los reportes y la lista son por mes).

Consultas nuevas en `modulos/reportes/consultas.ts`:
- `resumenDelMes(mes)` devuelve entró, salió, quedó, la comparación con el mes anterior y los gastos por categoría;
- `ultimosMeses(mes, 6)`;
- `elTallerEnElMes(mes)`;
- `gastosDelMes(mes, categoria?)`.

Los meses llegan como `AAAA-MM` y se convierten a rango de fechas en Bolivia.

## 5. Pantallas y rutas
- **`/panel/reportes`** (tipo `lista`, 1280 px). Arriba, "Este mes" y "Mes pasado" (`?mes=`). Debajo, en este orden:
  1. "Ganaste Bs X, N % más que en {mes anterior}." y la cuenta "Entró − Salió = Quedó", con la acción principal **"Registrar gasto"**.
  2. "Últimos 6 meses", en barras.
  3. "En qué se gastó", con "Ver todos los gastos".
  4. "El taller en el mes".
  5. "Servicios más pedidos".
  6. "Cotizaciones".
  7. "Clientes y mantenimientos".

  En la computadora, como el prototipo: la ganancia arriba y lo demás en tarjetas de a dos. Un mes sin pagos ni gastos: "Todavía no hay movimientos en {mes}."
- **`/panel/reportes/gastos`** (tipo `lista`): "Gastos" de un mes, con su total, el filtro por categoría (`Filtros`) y la lista (fecha, categoría, detalle, método, monto y "Con comprobante"). Cada fila abre el gasto en un modal, con su comprobante y "Anular gasto" en "Más", con su motivo. La acción principal es "Registrar gasto". Vacío: "Todavía no hay gastos en {mes}."
- **"Registrar gasto"** es un modal (`ModalFormulario`), como "Registrar pago", que también lleva una foto. Tiene:
  - "Qué se pagó": las categorías, en tarjetas;
  - "Monto (Bs)";
  - "Cómo se pagó": efectivo, QR o transferencia;
  - "Detalle" (opcional);
  - "Comprobante" (opcional), con la cámara o la galería;
  - "Fecha", que por defecto es hoy.

  Al guardar: "Gasto registrado: {categoría}, Bs X." y la lista o el reporte se ponen al día.
- **Configuración → Parámetros:** la sección "Categorías de gasto" (`ListaEditable`), para agregar, renombrar, ordenar y desactivar. Una categoría con gastos no se borra: se desactiva.
- **El menú:** "Reportes", con un ícono de barras, en Administración, solo para el dueño.

- **Ajustes al programar los gastos (16/11):**
  - cada gasto va en una fila, como un pago en la orden (pulido 13.49): con su comprobante a la izquierda y "Anular gasto" en su "⋯". No hay un modal de detalle, porque la fila ya dice todo;
  - los montos se escriben como en el resto del panel: "1180,50 Bs";
  - el mes va primero en la barra y los filtros por categoría solo aparecen si hay gastos de más de una;
  - el monto es `numeric(10,2)`, como el de un pago (hasta 99.999.999,99 Bs por gasto): las sumas del mes se hacen en la consulta y no tienen ese tope;
  - con un filtro, el total es el de esa categoría y se queda al cambiar de mes. Los meses van desde enero del año pasado, igual que las fechas de un gasto.

## 6. Acciones del servidor
Todas en `modulos/reportes/acciones.ts`, con `exigirModulo("reportes")` y Zod (el mismo esquema en el formulario y en el servidor):
- **`registrarGasto(formData)`:**
  - recibe la categoría (activa), el monto (> 0, hasta el máximo de los pagos), el método, la fecha (no futura, de este año o el anterior), el detalle (≤ 200) y la foto opcional (como el comprobante de un pago);
  - guarda el gasto y su archivo privado;
  - responde "Gasto registrado." o el error junto al campo.
- **`anularGasto({ id, motivo })`:** el motivo es obligatorio (≤ 200). Un gasto ya anulado no se vuelve a anular.
- **Las categorías:** agregar, renombrar, mover y activar o desactivar, con las mismas reglas que las listas de Configuración (`ListaEditable`).
- **Después de cada cambio:** `revalidatePath("/panel/reportes", "layout")`.

## 7. Componentes y diseño
- **Del panel:** `EncabezadoPagina`, `Filtros` (este mes y mes pasado; las categorías), `ModalFormulario`, `ListaEditable` y `Insignia`, y las tarjetas de selección de "Registrar pago" para las categorías y el método.
- **Nuevos:**
  - `BarrasMeses`: barras en SVG, con su texto para el lector de pantalla y los números con `tabular-nums`;
  - `CuentaDelMes`: "Entró − Salió = Quedó".

  Colores con los tokens del panel. Las barras distinguen "Entró" y "Salió" por el tono y además por su leyenda escrita (no solo por el color).

## 8. Textos de la interfaz
- **Títulos:** "Reportes", con el subtítulo "Cuánto entró, cuánto salió y cuánto quedó", y "Gastos".
- **Cuentas:**
  - "Ganaste Bs X, N % más que en {mes}." (o "menos que"; sin mes anterior con datos, sin la comparación);
  - "Entró", "Salió" y "Quedó";
  - "de N vehículos", "en N gastos" y "N % de lo que entró".
- **Secciones:** "Últimos 6 meses", "En qué se gastó", "Ver todos los gastos", "El taller en el mes", "Servicios más pedidos" (con "El más pedido"), "Cotizaciones" y "Clientes y mantenimientos".
- **Cotizaciones:** "De N que enviaste, aceptaron M. La razón más común para no aceptar fue {motivo}."
- **Registrar un gasto:** "Registrar gasto", "Qué se pagó", "Monto (Bs)", "Cómo se pagó", "Detalle", "Comprobante", "Guardar gasto" y "Gasto registrado".
- **Anular un gasto:** "Anular gasto", "Motivo" y "Gasto anulado".
- **Errores:** "Escribe el monto del gasto." y "Elige qué se pagó."
- **Pie de los reportes:** "Lo que entró sale de los pagos registrados; lo que salió, de los gastos."

## 9. Pruebas
- **Unitarias** (`tests/unit/reportes.test.ts`):
  - los meses en hora de Bolivia, también un pago a las 23:30 del último día;
  - la ganancia y el porcentaje, con un mes anterior en cero;
  - el esquema de un gasto: monto, fecha futura y categoría.
- **De punta a punta** (`tests/e2e/p16-reportes.spec.ts`):
  - registrar un gasto con su comprobante, que aparezca en la lista y en el reporte, y que lo que salió y lo que quedó cambien;
  - anular un gasto, que deje de contar y se vea anulado;
  - los pagos del mes en lo que entró, sin los anulados;
  - "Mes pasado" muestra otro mes;
  - un encargado, incluso con todos sus permisos, no ve "Reportes" ni entra a sus direcciones;
  - las categorías: agregar una en Configuración y usarla al registrar.

## 10. Orden de trabajo
Una rama, `p16-reportes-y-gastos`, en dos PR:
1. **Los gastos:** la migración, las categorías en Configuración, registrar, la lista y anular, con sus pruebas.
2. **Los reportes:** las consultas y la pantalla, con sus pruebas, y el menú.

`code-review` en cada uno. `security-review` en el primero, porque toca archivos privados, montos y un módulo nuevo.

## 11. Criterio de salida
- En el celular, el dueño registra un gasto con su foto en menos de un minuto.
- En "Reportes" ve cuánto le quedó en el mes, y los números coinciden con los pagos y los gastos cargados.
- Ningún encargado ve los montos de los reportes.
- Pruebas en verde.

## 12. Decisiones abiertas
- **¿Registra gastos solo el dueño?** El prototipo dice que estas pantallas son solo del dueño. Si quiere que un encargado (por ejemplo, el de Atención) registre gastos sin ver los reportes, se suma un permiso "Gastos" aparte. Mientras tanto, solo el dueño.
- **¿Dónde se editan las categorías?** Propuesta: Configuración → Parámetros. Otra opción es una pestaña "Gastos" en Configuración.
