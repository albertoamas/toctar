# C6 Consistencia del panel: especificación

- **Fase y semana:** C. Entrega 2 · desde el 8 de noviembre de 2026, antes de la capacitación y de la prueba en celulares reales
- **Estado:** aprobada por YankoSoft el 08/11/2026 · terminada el 08/11/2026 (PR #172 a #183). Sigue la guía de capacitación y la prueba en celulares reales
- **Historias:** ninguna nueva. Cambia la forma de las pantallas de HU-04 a HU-41, no lo que hacen
- **Base:** `06-diseno/sistema-del-panel.md` (las reglas), `P26-rediseno-panel.md` (el estilo), la skill `pantallas-panel`

## 1. Objetivo

Que todas las pantallas del panel se vean y se usen igual, y que el código impida que vuelvan a separarse. El dueño aprende una forma de trabajar y le sirve en todo el panel.

## 2. Alcance

- **Incluye:** anchos, forma de las fichas, lugar de las acciones, listas y datos en lectura, la pregunta al cerrar un modal, y una prueba en el CI que haga cumplir las reglas.
- **No incluye:** funciones nuevas, cambios en la base, el sitio público, el ingreso ni el PDF. No va a `registro-de-cambios.md`, porque no agrega funciones. Si el dueño pide algo nuevo durante el trabajo, eso sí se anota ahí.

### Diagnóstico (08/11/2026)

El panel tiene buenos componentes, pero usarlos es opcional, y `pulido-visual.md` nunca definió reglas de estructura. Al pulir una pantalla por vez, cada una mejoró sin quedar igual a las demás.

| Qué | Cómo estaba |
|---|---|
| Anchos máximos | 5 medidas, escritas a mano 38 veces |
| Títulos de sección | Unas 30 veces a mano, en 22 archivos: arriba o adentro de la tarjeta |
| Listas de filas | A mano en 12 archivos, aparte de los componentes comunes |
| Etiqueta y valor | `<dl>` a mano en 12 archivos |
| Modales | 27 con el común, 2 formularios sin él; ninguno pregunta antes de perder lo escrito |
| Control automático | Ninguno |

### Decisiones (aprobadas el 08/11/2026)

| # | Decisión |
|---|---|
| 1 | Las fichas van en `5xl`, con secciones de a dos en la computadora cuando son cortas |
| 2 | Al cerrar un modal se pregunta solo si hubo cambios |
| 3 | Orden tiene un solo botón rojo según el estado, y pasa al encabezado |
| 4 | Usuario se convierte en ficha; Contraseña y Desactivar van en "Más" |
| 5 | Las reglas viven en `sistema-del-panel.md`; `pulido-visual.md` queda como historial y estándares generales |
| 6 | La fase 3 se migra por tipo de pantalla, con capturas para aprobar el grupo. La fase 4 sigue siendo una pantalla por vez, con propuesta |

## 3. Reglas que se cumplen

- **RNF de accesibilidad:** foco visible y devuelto al cerrar un modal; áreas de toque de 44 px con pantalla táctil.
- **RN-12:** sin los permisos de Pagos o Cotizaciones no se ven precios. C6 mueve piezas, no cambia qué datos llegan a cada pantalla; se revisa con cada rol en la fase 5.
- **Toda página y acción sigue verificando la sesión y el permiso:** `PaginaPanel` no protege nada.

## 4. Datos

Sin cambios en la base.

## 5. Pantallas: inventario

Las 37 pantallas del panel, sin contar "sin acceso" ni "no encontrada". "Ancho hoy" es el del 08/11, antes de migrar: lo que falta de verdad son las listas de `tests/unit/consistencia-panel.test.ts`.

| Pantalla | Tipo | Ancho hoy | Ancho final | Qué cambia | Fase |
|---|---|---|---|---|---|
| Inicio | portada | 3xl | propio | `PaginaPanel` | 3 |
| Agenda | lista | todo | todo | `PaginaPanel` | 3 |
| Nueva reserva | formulario | 3xl | 3xl | `PaginaPanel` | 3 |
| Reserva | ficha | 5xl | 5xl | Títulos arriba de la tarjeta | 4 |
| Órdenes | lista | todo | todo | `PaginaPanel` | 3 |
| Orden | ficha | 5xl | 5xl | Títulos arriba; "Avisar" y "Entregar" con el paso siguiente, grande debajo del encabezado (`PasoSiguiente`, decidido el 08/11) | 4 |
| Recibir | formulario | 3xl | 3xl | `PaginaPanel` | 3 |
| Entregar | formulario | 3xl | 3xl | `PaginaPanel` | 3 |
| Publicar en la galería | formulario | 3xl | 3xl | `PaginaPanel` | 3 |
| Clientes | lista | todo | todo | `PaginaPanel` | 3 |
| Nuevo cliente | formulario | 2xl | 3xl | Ancho | 3 |
| Cliente | ficha | 5xl | 5xl | Acciones de sección sin borde | 3 |
| Cambiar dueño del vehículo | formulario | 3xl | 3xl | `PaginaPanel` | 3 |
| Cotizaciones | lista | todo | todo | `PaginaPanel` | 3 |
| Nueva cotización | formulario | 3xl | 3xl | `PaginaPanel` | 3 |
| Nueva versión | formulario | 3xl | 3xl | `PaginaPanel` | 3 |
| Cotización | ficha | 3xl | 5xl | Ancho; títulos arriba; principal y datos | 4 |
| Saldos pendientes | ficha | 3xl | 5xl | Ancho; filas con su componente | 3 |
| Mantenimientos | ficha | 3xl | 5xl | Ancho; filas con su componente | 3 |
| Reclamos | lista | 5xl | todo | Ancho | 3 |
| Reclamo | ficha | sin medida | 5xl | Títulos arriba; acciones al encabezado; "Qué se hizo" en un modal | 4 |
| Sitio web | portada | todo | propio | `PaginaPanel` | 3 |
| Servicios del sitio | ficha | 3xl | 5xl | Ancho | 3 |
| Servicio del sitio | ficha | 4xl | 5xl | Ancho; secciones de a dos donde son cortas | 3 |
| Textos del sitio | ficha | 3xl | 5xl | Ancho | 3 |
| Preguntas frecuentes | ficha | 3xl | 5xl | Ancho | 3 |
| Galería | ficha | sin medida | 5xl | `PaginaPanel`; se revisa si la cuadrícula gana con todo el ancho | 3 |
| Catálogo | lista | 5xl | todo | Ancho | 3 |
| Servicio del catálogo | ficha | 5xl | 5xl | `PaginaPanel` | 3 |
| Usuarios | lista | 4xl | todo | Ancho | 3 |
| Nuevo usuario | formulario | xl | 3xl | Ancho | 3 |
| Usuario | ficha | sin medida | 5xl | Se convierte en ficha, con modales y "Más" | 4 |
| Configuración | portada | todo | propio | `PaginaPanel` | 3 |
| Negocio | ficha | 3xl | 5xl | Ancho; secciones de a dos | 3 |
| Taller | ficha | 3xl | 5xl | Ancho; acciones de sección sin borde salvo "Agregar" | 3 |
| Parámetros | ficha | 3xl | 5xl | Ancho; secciones de a dos | 3 |
| Mensajes | ficha | 3xl | 5xl | Ancho; secciones de a dos | 3 |

## 6. Acciones del servidor

Sin acciones nuevas en las fases 1 a 3. En la fase 4:

- **Reclamo:** "Marcar como atendido" usa la acción actual desde un modal.
- **Usuario:** se decide en su propuesta si el guardado pasa a ser por parte. Si pasa, lleva `exigirModulo`, Zod, su prueba unitaria y `security-review`.

## 7. Componentes y diseño

- **Nuevos:** `PaginaPanel` (`tipo`: `lista`, `ficha`, `formulario` o `portada`) y `Seccion`.
- **Se unifica:** un hook para los formularios en modal, que reemplaza a los `useParte` de Negocio y del servicio del sitio.
- **Se amplía:** `ModalFormulario` pregunta al cerrar si hay cambios. Reutiliza la detección de `useCambiosSinGuardar`.
- **Se migran:** los 2 formularios que usan `DialogContent` directo (`formulario-precios` y `acceso-usuario`) y los `<dl>` y listas a mano donde corresponda.
- **Al terminar Usuario (08/11):** `BarraGuardar` queda solo en "Crear usuario", siempre activa (el 10/11 se va también de ahí: Crear usuario usa `PieFormulario` y `AvisoAlSalir` con `anunciar`, como las demás pantallas de crear; inventario-pantallas.md, cambio 2); se quitó su estado desactivado hasta un cambio, que ya no usaba nadie. La ficha del usuario se guarda por partes (`guardarDatosUsuario`, `guardarRolUsuario`), con su revisión de seguridad.

## 8. Textos de la interfaz

- Al cerrar un modal con cambios: "¿Salir sin guardar?", con "Seguir editando" (con el foco) y "Salir sin guardar". Son los textos que ya usa el panel.
- Los demás textos no cambian, salvo los que se definan en cada propuesta de la fase 4.

## 9. Pruebas

- **Unitarias:** `tests/unit/consistencia-panel.test.ts` lee el código y falla si una página no usa `PaginaPanel`, si un archivo fuera de los componentes comunes escribe un ancho de pantalla (`max-w-prose` o de `2xl` a `7xl`), usa `DialogContent` o `SheetContent`, o arma un título de sección a mano con `tt-titulo-seccion`. Sus listas de excepciones cuentan las apariciones por archivo, se achican en cada fase y al final quedan vacías o justificadas.
- **De punta a punta:** una prueba de la pregunta al cerrar un modal (con cambios pregunta; sin cambios, no; "Seguir editando" conserva lo escrito). Las E2E de cada pantalla se adaptan al cambiar su forma.
- **Capturas:** las pantallas principales en 390 y 1366 px quedan como archivos del CI para revisarlas a ojo. No se comparan píxel por píxel: Windows y Linux dibujan distinto.
- **Fase 5:** recorrido por las 37 pantallas en 360, 390, 768 y 1366 px, con dueño, encargado con permisos y encargado con el perfil Taller, y `npm run test:e2e` completo dos veces seguidas.

## 10. Orden de trabajo

Cada PR entra a `develop` con el CI en verde y después de la revisión de código.

| Fase | Qué | PR | Lo que se aprueba |
|---|---|---|---|
| 0 | Reglas y plan: este documento, `sistema-del-panel.md`, aviso en `pulido-visual.md`, guía y `CLAUDE.md` | 1 | Los documentos |
| 1 | `PaginaPanel`, `Seccion`, hook de formularios en modal y la pregunta al cerrar | 1 o 2 | La pregunta, en local |
| 2 | Prueba de consistencia, con todas las excepciones actuales | 1 | Nada visible |
| 3 | Migración por tipo: listas y formularios; después fichas y portadas | 2 o 3 | Capturas de cada grupo |
| 4 | Reserva, Orden, Cotización, Reclamo y Usuario, una por vez | 5 | Propuesta de cada una |
| 5 | Recorrido final, capturas en el CI y estado en `plan-de-desarrollo.md` | 1 | Revisión final |

Después de la fase 5 se hace la guía de capacitación y la prueba en celulares reales.
