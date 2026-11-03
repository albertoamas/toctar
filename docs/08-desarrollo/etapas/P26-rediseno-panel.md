# P26 Rediseño del panel: administrativo estándar: especificación

- **Fase y semana:** C. Entrega 2 · desde el 2 de noviembre de 2026, punto 5 de los ajustes de la reunión con el dueño (`../ajustes-reunion-dueno.md`)
- **Estado:** hecha. El dueño aprobó el rediseño el 02/11/2026; las 7 fases entran a `develop` en un solo commit (PR #125, que reúne los PR #121 a #124). Prototipo: https://claude.ai/artifact/WDzpNpxYmNBX961B98LqMU (Inicio, Órdenes con la ficha de una orden y Cotizaciones con su ficha)
- **Pedido:** 26 de `03-cierre-comercial/registro-de-cambios.md`
- **Historias que cambian:** la apariencia de todas las del panel (HU-04 a HU-41); ninguna regla de negocio cambia

## 1. Objetivo
Que el panel sea un panel administrativo conocido y amigable ("que un tonto pueda usarlo"): cada bloque se separa del fondo, el estado de cada cosa se ve de un vistazo y hay menos texto. La marca queda en el sitio público y en el ingreso.

## 2. Alcance
- **Incluye:** el estilo de todo el panel (`/panel/**`): colores, tipografía, menú, encabezados, tarjetas, listas y tablas, insignias, pestañas, botones, modales y estados vacíos; y el orden de las pantallas que lo pidan (Inicio, Órdenes, Cotizaciones, Sitio web, Configuración, Catálogo y Usuarios).
- **No incluye:** el sitio público y la pantalla de ingreso (siguen con la identidad de marca, en oscuro); el PDF de la cotización; funciones nuevas (lo que aparezca va a `registro-de-cambios.md`).

## 3. Reglas que se cumplen
- **RN-12:** el técnico sigue sin ver precios, pagos ni teléfonos: el rediseño no cambia qué datos llegan a cada pantalla, solo cómo se ven.
- **RNF de accesibilidad:** contraste AA en textos (4,5:1) e insignias; el estado se dice con palabras, no solo con color; foco visible; áreas de toque de 44 px con pantalla táctil.
- **Tokens, nunca colores sueltos:** los colores nuevos del panel son tokens de `globals.css` (abajo). Ningún `#hex` en los componentes.
- **El panel en claro, el sitio y el ingreso en oscuro:** los tokens nuevos del panel no tocan `[data-theme="oscuro"]`.

## 4. Datos
Sin cambios en la base.

## 5. Decisiones de diseño (las del prototipo)

### Tokens (tema claro, `globals.css`)
| Token | Valor | Para qué |
|---|---|---|
| `--fondo-panel` | `#f3f4f6` | El fondo gris del área de trabajo: las tarjetas blancas se separan solas |
| `--fondo` | `#ffffff` | Tarjetas, modales, menús (sin cambio) |
| `--borde` | `#e2e5e9` | Bordes de tarjetas y separadores (más suave que el de hoy) |
| `--sombra-tarjeta` | `0 1px 2px rgb(22 24 29 / 6%), 0 1px 3px rgb(22 24 29 / 4%)` | La sombra suave de las tarjetas |
| `--radius` | `8px` en claro, `2px` en oscuro | Esquinas redondeadas del panel; el ingreso conserva las de la marca |
| `--info` / `--info-fondo` | `#1d4ed8` / `#e8effd` | Insignia azul: en proceso |
| `--exito-fondo` | `#e6f4ea` | Fondo de la insignia verde: lista, pagada, aceptada |
| `--aviso-fondo` | `#fdf1e0` | Fondo de la insignia ámbar: atrasada, sin avisar, sin respuesta |
| `--peligro` / `--peligro-fondo` | `#b42318` / `#fdecea` | Insignia roja: rechazada, cancelada con motivo |
| `--violeta` / `--violeta-fondo` | `#6d28d9` / `#f1ebfd` | Insignia violeta: recibida |
| `--neutro-fondo` | `#eceef1` | Insignia gris: agendada, inactiva |

### Tipografía
Montserrat en todo el panel, sin itálicas. Una escala en utilidades de `globals.css`, así cambiarla es tocar un solo lugar:
- `tt-titulo-pagina`: 24 px, negrita (el `h1` de cada pantalla).
- `tt-titulo-seccion`: 17 px, seminegrita (el `h2` de una sección o tarjeta).
- `tt-titulo-sub`: 15 px, seminegrita (el `h3`).
- `tt-placa`: negrita con cifras tabulares (placas, números de cotización y cuentas grandes).

### Componentes
- **Diseño del panel (`layout.tsx`):** menú lateral oscuro con el logo horizontal sin lema; títulos de grupo en Montserrat chica gris; el módulo actual con fondo marcado, una barra roja recta a la izquierda y su ícono en rojo. Área de trabajo en `--fondo-panel`. En el celular, la barra superior oscura con el mismo logo.
- **`EncabezadoPagina`:** título `tt-titulo-pagina`, la insignia de estado al lado, acciones a la derecha; opcional, el enlace "← Volver" de una ficha.
- **Tarjeta (`tt-tarjeta-panel`):** fondo blanco, borde, radio de 8 px y sombra suave. Reemplaza el recuadro `rounded-sm border border-border`.
- **Insignia (`tt-estado`):** píldora con punto y fondo del color del tono (`--exito`, `--aviso`, `--peligro`, `--info`, `--violeta`; sin tono, gris). Reemplaza en el panel a `tt-insignia`, que queda para el sitio.
- **`ListaFilas`:** las filas dentro de una tarjeta; la placa con `tt-placa`.
- **`Pestanas`:** la activa subrayada en tinta (no en rojo: el rojo es del botón principal y del menú).
- **`SeccionConEditar` y `CabeceraSeccion`:** la sección como tarjeta; el título con `tt-titulo-seccion`.
- **Botones:** los de shadcn con el radio nuevo; el rojo sigue siendo uno por pantalla.
- **Tablas (fase 2):** `ui/table.tsx` de shadcn para las listas en la computadora (≥ 700 px), y las filas de `ListaFilas` en el celular.

## 6. Orden de trabajo (un PR por fase)
| Fase | Rama | Qué entra | Estado |
|---|---|---|---|
| 1. Estilo base | `pedido-26-estilo-base` | Tokens, tipografía, diseño del panel (menú y barra), `EncabezadoPagina`, tarjeta, insignias, `ListaFilas`, `Pestanas`, `SeccionConEditar`, `EstadoVacio`, `Cargando`; los títulos y recuadros de todas las pantallas pasan a las utilidades nuevas | En curso |
| 2. Pantallas del prototipo | `pedido-26-inicio-ordenes-cotizaciones` | Inicio con números, "Para hoy" y "Para atender"; Órdenes y Cotizaciones en tabla (`TablaLista`) con filtros; las fichas de la orden (barra de pasos, cómo llegó resumido) y de la cotización | En curso |
| 3. Sitio web y Configuración | `pedido-26-sitio-configuracion` | Una portada con tarjetas "¿Qué quieres cambiar?" (`TarjetasSeccion`) y, al entrar, solo esa parte con "‹ Sitio web" o "‹ Configuración" (`EncabezadoPagina` con `volver`). Cada página del sitio es su tarjeta (`/panel/sitio/textos?pagina=`); la lista de servicios pasa a `/panel/sitio/servicios` y los datos del negocio a `/panel/configuracion/negocio`. Sin pestañas | En curso |
| 4. Catálogo y Usuarios | `pedido-26-catalogo-usuarios` | Las dos listas en `TablaLista`: el catálogo con precio desde, variantes, duración y lo que falta cargar (lo completo no dice nada, pulido 7.1); usuarios con el rol y el estado en insignias y "(tú)". Los precios de cada variante ya se editaban en un modal ("Editar"); ahora sus recuadros son blancos | En curso |
| 5. Resto | `pedido-26-resto` | Reclamos en `TablaLista` con `Pestanas`; los formularios en tarjetas (`SeccionFormulario`, `tt-seccion-formulario`; los de una sola parte son la tarjeta), también recibir, entregar y publicar; la ficha de la cotización con sus servicios y su descuento. Saldos y Mantenimientos quedan con sus filas en tarjeta (llevan acciones propias: no son de un toque); Clientes y la Agenda se rehicieron en la fase 7 | En curso |
| 6. Reglas | con la fase 5 | `CLAUDE.md`, `06-diseno/identidad-visual.md`, `pulido-visual.md` y la skill `pantallas-panel` (con la tabla de piezas del panel) dicen "el panel es administrativo estándar; la marca es del sitio y del ingreso" | En curso |
| 7. Lo que faltó | `pedido-26-resto` | Lo que no se rediseñó o quedó a medias, encontrado al capturar todas las pantallas: ver "Fase 7" abajo | Hecha (02/11): los 10 puntos; los montos quedaron en dos tarjetas (Servicios y Pagos) y no en una "Cuenta", por las regiones que usan el lector y las pruebas |

### Fase 7: lo que faltó (barrido del 02/11)

Al terminar la fase 6 se capturaron todas las pantallas del panel (24, con datos reales) y se buscó en el código lo que quedaba de la marca. Lo que faltó, en el orden en que se hace (en `pedido-26-resto`, PR #125):

| # | Pantalla | Qué falta | Cómo queda |
|---|---|---|---|
| 1 | Diseño del panel | En una página más larga que la pantalla, debajo del menú negro queda un área blanca (con el fondo gris ahora se nota) | El fondo del menú llega hasta abajo |
| 2 | Clientes (lista) y elegir cliente (Nueva cotización, Nueva reserva) | Cada cliente en tres renglones apilados (nombre, placa, teléfono), sin columnas | `TablaLista`: cliente, vehículos (placas) y WhatsApp; en el celular, el nombre arriba y lo demás de a dos |
| 3 | Agenda (el tablero de la semana) | Sigue con la marca: reservas como cintas negras con el corte a 60°, "Hoy" subrayado en rojo, días cerrados rayados a 60° | Cada reserva, un bloque redondeado del color de su estado (`TONO_ESTADO_TRABAJO`); la columna de hoy en azul suave; los cerrados en gris liso |
| 4 | Montos de la orden (`MontosTrabajo`: ficha de la reserva, de la orden y Entregar) | Total, pagado y saldo sueltos sobre el gris; "Falta cobrar" en una franja gris que casi no se ve | Una tarjeta "Cuenta": servicios, total, pagado y el saldo resaltado, y los pagos |
| 5 | Configuración → Mensajes | Sin tarjetas; la burbuja de la vista previa con la punta a 60°; tres botones rojos a la vista; dice "la pestaña Negocio" | Una tarjeta por mensaje con "Guardar mensaje" en contorno; la burbuja de chat sin el corte; el texto al día |
| 6 | Ficha de un reclamo | Los datos, "Qué pasó" y las fotos, sueltos | En tarjetas |
| 7 | Ficha de un usuario | "Contraseña" y "Acceso", sueltos; el texto de los módulos dice que el encargado "nunca puede cotizar" (desde el pedido 24 puede, con el permiso Cotizaciones) | En tarjetas; el texto al día |
| 8 | Página de un servicio (Sitio web) | La columna de fotos (principal y de la página), sin tarjeta | En tarjetas |
| 9 | Checklist al recibir | "Bien" y "Sin revisar" como texto suelto | Insignias: verde y gris |
| 10 | Negocio | En el celular, una línea gris de antes separa el logo de una tarjeta que ya lo separa | Sin la línea |

Quedan bien y no cambian: Inicio, Órdenes, Cotizaciones, la ficha del cliente, Saldos, Mantenimientos, la lista de Reclamos, Catálogo, Usuarios (lista y crear), Sitio web (portada, servicios, textos, preguntas, galería), Configuración (portada, negocio, parámetros, taller), Nueva reserva y las páginas de error.

Ninguna fase se une a `develop` hasta que el dueño apruebe el prototipo: al unir se despliega en pruebas, y un panel a medio cambiar mezcla dos estilos. Las fases se apilan (cada una sale de la anterior) y se unen en orden.

### Decisiones de la fase 2
- **Montos en el inicio:** la HU-39 lo dejaba sin montos. Con el pedido 26, "Por cobrar" y los totales de "Para atender" se ven solo con el permiso de Pagos o Cotizaciones; el técnico nunca (RN-12).
- **Sin accesos a cada módulo en el inicio del dueño:** repetían el menú (pulido 4.1) y el dueño pidió un inicio simple. El técnico y el encargado sin permisos los conservan.
- **Sin contadores en el menú** (estaban en el prototipo): el menú vive en el diseño compartido, que no se vuelve a pedir al navegar, y los números quedarían viejos. Los números están en el inicio.

### Decisiones de la fase 3
- **Sin pestañas en Sitio web y Configuración:** la portada con tarjetas las reemplaza (el dueño no encontraba dónde cambiar un texto) y cada parte vuelve con "‹". Los formularios siguen sobre el fondo gris: pasarlos a tarjetas es de la fase 5, con el resto de los formularios.
- **E2E intermitente corregida:** la del pedido 30 (`hu-37-saldos`, "el total por cobrar sigue siendo el de todas") fallaba con los dos proyectos en paralelo: el total es de toda la base y otra prueba lo cambiaba mientras corría. Ahora compara, en el mismo momento, el total con la búsqueda y el de la pantalla sin buscar.

## 7. Pruebas
- **Unitarias:** las reglas nuevas de la fase 2: `textoEntrega` y `estadoFiltrado` (`tests/unit/ordenes.test.ts`) y `paraHoy` (`tests/unit/inicio.test.ts`).
- **E2E:** las existentes siguen pasando (buscan por rol y nombre accesible, no por estilo). Si una pantalla cambia de forma (tabla en lugar de filas), se ajusta su prueba en esa fase.
- **A mano, en cada fase:** capturas de antes y después a 360 y 1280 px, con el dueño, el encargado y el técnico; nada se sale de la pantalla; el foco se ve; contraste de las insignias AA.

## 8. Criterio de salida
El dueño aprueba el prototipo y, con todo el panel cambiado, encuentra cada cosa sin ayuda en la capacitación.

## 9. Decisiones abiertas
- La aprobación del prototipo por el dueño (se le comparte el enlace).
- Menú oscuro o claro: oscuro (decisión del 02/11, revisable con el dueño).
