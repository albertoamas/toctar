# C7 Rediseño del panel — especificación

- **Fase y semana:** cierre de la Entrega 2 · desde el 18/11/2026 (fechas en §10)
- **Estado:** borrador (falta el visto bueno del desarrollador y, para la fase 0, del dueño)
- **Historias:** todas las del panel (HU-01 a HU-41 y los pedidos 12 a 51). No agrega funciones: cambia cómo se ven y se usan.
- **Base:** `docs/06-diseno/sistema-del-panel.md` (estructura, que se mantiene y se amplía), la skill `pantallas-panel`, la
  reunión del dueño sobre el panel (fin de octubre: "un panel administrativo estándar y amigable, que un tonto pueda
  usarlo") y el checklist `docs/08-desarrollo/rediseno-panel-checklist.md`.

## 1. Objetivo

Que el panel se vea y se use como un panel administrativo estándar y amigable, en el celular y en la computadora: una
paleta agradable y con sentido, cada pantalla con solo lo necesario, todo hecho con las mismas piezas, y un camino claro
desde la cotización hasta la entrega y el cobro, con la historia de cada cliente y vehículo a mano.

## 2. Alcance

- **Incluye:** las 40 pantallas del panel (y las 2 de Reportes y Gastos, en la rama `p16-gastos`), sus modales, los
  componentes del panel y de shadcn/ui, el armazón (menú, encabezado, navegación del celular), la PWA (ícono, colores,
  pantalla de inicio, zonas seguras), los estados (vacío, cargando, error, sin conexión) y el Manual del panel (sus
  capturas se regeneran al final).
- **No incluye:** el sitio público y la pantalla de ingreso (siguen con la marca, en oscuro), el PDF de la cotización,
  funciones nuevas (lo que lo sea va a `03-cierre-comercial/registro-de-cambios.md`), cambios de datos o de reglas de
  negocio. Si al rediseñar aparece algo que solo se arregla cambiando una regla, se anota y se decide aparte.

## 3. Principios (lo que decide cada pantalla)

1. **Menos es más.** Cada pantalla hace una cosa. Lo que no ayuda a esa tarea se quita, se pliega ("Más", "Ver más") o
   se va a otra pantalla. Sin párrafos de introducción: el título y las etiquetas alcanzan.
2. **Un color, un significado.** El color principal es solo para la acción principal y lo activo. Verde, ámbar, rojo y
   azul son estados (bien, atención, peligro, información) y nunca decoran. Hoy el rojo de la marca es a la vez el botón
   principal y el color de los errores: se separan.
3. **Siempre se sabe dónde se está y qué sigue.** Cada ficha dice en qué paso del trabajo está y ofrece el paso
   siguiente como su única acción principal.
4. **Las mismas piezas en todas partes.** Una pantalla nueva no inventa su estilo. Si una pieza no alcanza, se extiende
   la pieza (y su prueba de consistencia), no se copia.
5. **El celular primero.** Se diseña a 360–390 px y se amplía. Toques de 44 px, botones al alcance del pulgar, nada
   debajo del teclado, y la computadora aprovecha el ancho (tablas, dos columnas) sin cambiar el orden.
6. **Accesible por defecto.** Contraste AA (4,5:1 en texto, 3:1 en bordes de controles), foco visible, todo con teclado,
   estados con palabra además de color, y movimiento reducido respetado.

## 4. Referencias

Se toma de cada una lo que resuelve bien, no su apariencia:

| Plataforma | Qué se toma |
|---|---|
| **Shopify Polaris** (admin de comercios, con app de celular) | Encabezado de página (título, volver, acción principal), tarjetas por sección, tono de los textos, "menos es más" |
| **Tekmetric y Shopmonkey** (software de talleres) | El trabajo como un recorrido: cotización → aprobada → en el taller → listo → entregado, con su estado siempre visible y la historia del vehículo |
| **Square Dashboard** | Inicio con lo del día y los números que importan; cobrar en un toque desde el celular |
| **Linear y Stripe Dashboard** | Tablas limpias, insignias de estado discretas, listas con filtros y páginas, búsqueda rápida |
| **Material 3 y Apple HIG** | Barra de navegación inferior en el celular, hojas desde abajo, zonas seguras, tamaños de toque |

## 5. Pantallas y rutas

El inventario completo, una fila por pantalla, modal y componente, está en el checklist. Aquí, lo que cambia en general:

- **Armazón.** Computadora: menú lateral claro (no negro), agrupado como hoy (Taller, Clientes, Administración), con el
  módulo activo marcado y el usuario abajo. Celular: barra superior con el título y una **barra inferior** con los cuatro
  módulos de todos los días según los permisos (por ejemplo Inicio, Agenda, Órdenes, Cotizaciones) y "Más" para el
  resto. Reemplaza al menú desplegable de hoy, que esconde todo detrás de un botón.
- **El recorrido del trabajo.** Las fichas de cotización, reserva y orden muestran el mismo indicador de pasos
  (Cotizado → Aceptado → Reservado → En el taller → Listo → Entregado, y el cobro al lado) con enlaces a lo anterior, y
  el paso siguiente como botón principal en el encabezado. Desde Inicio, "Para hoy" lleva a ese paso.
- **La historia.** La ficha del cliente y la del vehículo muestran sus trabajos en una línea de tiempo (la más reciente
  arriba, plegada si es larga), y las listas que crecen van de a páginas (ya hecho el 17/11, #272).
- **Tipos de pantalla.** Se mantienen los de `sistema-del-panel.md` (lista, ficha, crear, configuración, flujo de un
  paso, portada), con un diseño nuevo para cada uno que se aplica igual a todas sus pantallas.
- **Estados.** Vacío (qué falta y cómo agregarlo), cargando (esqueletos con la forma de la pantalla), error (qué pasó y
  qué hacer) y sin conexión (aviso fijo y discreto), iguales en todo el panel.

## 6. Acciones del servidor

No cambian. Si una pantalla rediseñada necesita un dato que hoy no se lee, se agrega a su consulta (sin cambiar reglas).

## 7. Componentes y diseño

### 7.1 Fundamentos (fase 1)

Se definen en la fase 0 con un prototipo y se fijan como tokens del panel en `globals.css` (el sitio no cambia):

- **Paleta.** Neutros fríos (fondo, superficie, bordes, tres tintas de texto), **un color principal** y cuatro de estado
  con su fondo suave. El principal no puede ser rojo, verde ni ámbar (son estados). Propuestas para el prototipo:

  | Opción | Principal | Idea | Por qué |
  |---|---|---|---|
  | A (recomendada) | Azul petróleo `#155E75` | El brillo del auto recién encerado: profundo y sereno | Se distingue de los estados, se lee bien sobre blanco (AA) y no es el azul violáceo de cualquier SaaS |
  | B | Grafito `#1F2937` (botones oscuros) | Sobrio, como Linear o Vercel | Lo más neutro; el color queda solo para los estados |
  | C | Azul cobalto `#1D4ED8` | El estándar de los paneles | El más conocido; se parece al resto |

  Neutros de partida: fondo `#F5F7FA`, superficie `#FFFFFF`, borde `#E3E8EF` (separadores), borde de campos `#8A94A6`
  (3,1:1), texto `#18212F` (15:1), texto suave `#5B6778` (5,4:1). Estados, con su fondo suave: bien `#166534` sobre
  `#E8F5EC`, atención `#B45309` sobre `#FEF3E2`, peligro `#C2262E` sobre `#FDECEC`, información (el principal sobre
  `#E6F1F4`); todos pasan AA (4,5:1) como texto, sobre blanco y sobre su fondo (medido el 18/11). El rojo de la marca
  queda solo en el logo.
- **Estados del trabajo.** Un color por estado, con palabra: agendado (ámbar suave), en el taller (principal), listo
  (verde), entregado (gris), cancelado (gris tachado), con saldo (ámbar). Se definen una vez (`TONO_ESTADO_TRABAJO`).
- **Tipografía.** Una sola familia de interfaz con números tabulares, servida desde `public/fuentes/`. Candidatas para
  el prototipo: Inter (la estándar de los paneles), Figtree (más amable) y Montserrat (la de hoy, para comparar). Escala:
  12 / 14 (cuerpo) / 16 / 20 / 24 px, pesos 400, 500 y 600.
- **Espacios, radios y sombras.** Espaciado de a 4 px. Radios con jerarquía: 6 px controles, 10 px tarjetas, 16 px
  hojas y modales. Tarjetas con borde, sin sombra; sombra solo en lo que flota (menús, modales, avisos).
- **Íconos.** Lucide, 16 px en texto y 20 px en navegación, un solo trazo.
- **Movimiento.** Solo como respuesta: abrir, cerrar, confirmar (150–200 ms). Nada se anima solo al cargar, salvo los
  gráficos de Reportes.

### 7.2 Componentes (fase 2)

Primero los de `src/componentes/ui/` (botón, campo, selector, casillas, diálogo, hoja, menú, tabla, aviso), después
los del panel por familia (encabezado, navegación, listas y tablas, fichas y secciones, formularios, modales, estados,
fotos y firma, números e insignias). Cada componente rediseñado actualiza su uso en todas las pantallas a la vez: así el
panel nunca queda mitad viejo y mitad nuevo dentro de una pantalla.

### 7.3 PWA

Ícono y colores del manifiesto con la paleta nueva (`theme_color`, pantalla de inicio), barra de estado del celular,
zonas seguras (`env(safe-area-inset-*)`) para la barra inferior, y el aviso de versión nueva y de sin conexión con el
estilo nuevo. Sigue sin modo sin conexión.

## 8. Textos de la interfaz

Se revisan con cada pantalla: verbos claros en los botones ("Registrar pago", no "Aceptar"), el mismo verbo en el
botón y en su aviso ("Pago registrado."), sin mayúsculas sostenidas, errores que dicen qué pasó y cómo seguir, y vacíos
que invitan a actuar. Los nombres de los estados salen siempre de `NOMBRE_ESTADO_TRABAJO`.

## 9. Pruebas

- **Unitarias:** `tests/unit/consistencia-panel.test.ts` se amplía con cada regla nueva (por ejemplo, ningún color suelto
  en el panel, toda acción principal con el botón principal, todo modal con `ModalFormulario`).
- **E2E:** las que existen siguen pasando (buscan por rol y nombre accesible, no por estilo). `recorrido-panel.spec.ts`
  toma las capturas de cada pantalla a 390 y 1366 px con los tres roles, para revisarlas a ojo.
- **Contraste:** cada combinación de la paleta se valida (AA) antes de fijarla.
- **Celular real:** al cerrar, la prueba a mano de `09-pruebas/prueba-en-celulares.md` en Android e iPhone, también
  instalada como app.

## 10. Orden de trabajo

| Fase | Qué | Cómo se aprueba | Días aprox. |
|---|---|---|---|
| 0 | Decisiones: paleta, tipografía, armazón y el diseño de cada tipo de pantalla, en un prototipo con contenido real (Inicio, una lista, una ficha con el recorrido, un formulario y un modal, en celular y computadora) | El desarrollador elige; el dueño lo ve y da el visto bueno | 1–2 |
| 1 | Fundamentos: tokens del panel en `globals.css`, contraste validado, fuentes | Capturas de antes y después | 1 |
| 2 | Componentes, por familia (§7.2) | Capturas por familia | 2–3 |
| 3 | Armazón: menú lateral, barra superior, barra inferior del celular, PWA | Capturas y prueba en el celular | 1 |
| 4 | El recorrido del trabajo: indicador de pasos, paso siguiente, Inicio, historia en fichas | Propuesta y aprobación | 2 |
| 5 | Pantallas, una por una, con sus modales (orden del checklist) | Propuesta, aprobación y capturas, una por vez | 5–7 |
| 6 | Cierre: QA completo, Manual del panel regenerado, documentos al día, prueba en celulares | Checklist completo | 1–2 |

Total: entre 13 y 18 días de trabajo. Ramas `rediseno-<fase>-<tema>`, cada una con su PR; las fases 1 a 3 cambian todo
el panel a la vez y van en PR chicos y seguidos para que `develop` no quede a medias más de un día.

**El plazo.** El acuerdo cierra la Entrega 2 el 1/12 (13 días). El rediseño completo no entra junto con la prueba a mano,
la demo y las actas. Dos caminos, para decidir con el dueño (§12):

1. **Mover la fecha de cierre** unas dos semanas y entregar el panel rediseñado completo (recomendado: el dueño prueba y
   acepta el panel definitivo, y la capacitación y el manual se hacen una sola vez).
2. **Mantener el 1/12** con las fases 0 a 4 (paleta, componentes, armazón y recorrido: lo que más se nota, porque cambia
   todas las pantallas a la vez) y la fase 5 después, como mejora de la versión 2.0.x.

## 11. Criterio de salida

- Cada fila del checklist marcada, con sus capturas en el PR.
- Ningún color, tamaño o radio suelto en el panel: todo sale de los tokens (lo verifica la prueba de consistencia).
- Las E2E en verde, el CI en verde y la prueba en celulares hecha.
- El Manual del panel regenerado con las capturas nuevas.
- En la demo: el recorrido completo de un trabajo (cotizar, reservar, recibir, trabajar, listo, entregar y cobrar) en el
  celular, y la historia de un cliente.

## 12. Decisiones abiertas

| Qué | De quién | Mientras tanto |
|---|---|---|
| La paleta (A, B o C) y la tipografía | Desarrollador, con el visto bueno del dueño en el prototipo | Se arma el prototipo con las tres |
| Mover la fecha de cierre o dejar la fase 5 para después del 1/12 (§10) | Desarrollador con el dueño | Se avanza con las fases 0 a 4, que sirven en los dos caminos |
| Barra inferior en el celular: qué cuatro módulos (según los permisos de cada uno) | Desarrollador, en la fase 3 | Propuesta: Inicio, Agenda, Órdenes y Cotizaciones; el perfil Taller, Inicio, Agenda y Órdenes |
| Búsqueda general (clientes, placas y cotizaciones desde el encabezado) | Es una función nueva: va a `registro-de-cambios.md` si se quiere | Cada lista mantiene su buscador |
| Reportes y Gastos (`p16-gastos`, #257) | Desarrollador | Se rediseñan con el resto antes de unirlos |
