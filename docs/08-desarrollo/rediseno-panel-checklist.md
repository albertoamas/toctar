# Rediseño del panel — checklist

Para ir una por una con la especificación `etapas/C7-rediseno-del-panel.md`. Cada fila se marca `[x]` cuando cumple
**todo** lo de "Hecho" (abajo), con su PR al lado. Una pantalla a la vez: análisis con capturas → propuesta →
aprobación → programar → capturas después → marcar. Sus modales y componentes propios van con ella.

## Hecho (vale para cada fila)

- [ ] Solo tokens del panel: ningún color, tamaño, radio ni sombra suelto.
- [ ] Hecha con las piezas comunes; si una no alcanzaba, se extendió la pieza (no se copió).
- [ ] Menos es más: cada cosa que queda ayuda a la tarea de la pantalla; lo poco usado, plegado o en "Más".
- [ ] Una sola acción principal a la vista, con un verbo que dice qué hace.
- [ ] Estados: vacío, cargando (esqueleto), error y sin conexión.
- [ ] Con cada rol: dueño; encargado con y sin el permiso; perfil Taller (sin precios, RN-12).
- [ ] 360, 390, 768, 1280 y 1600 px sin desborde horizontal; nada debajo del teclado ni del pulgar.
- [ ] Teclado y lector de pantalla: todo con Tab, foco visible, un `h1`, botones de ícono con nombre, contraste AA.
- [ ] Textos revisados (§8 de C7).
- [ ] E2E que la tocan en verde; capturas antes y después en el PR.

## Fase 0 — Decisiones y prototipo

- [ ] Prototipo con contenido real: Inicio, una lista (Clientes), una ficha con el recorrido (Orden), un formulario (Nueva cotización) y un modal (Registrar pago), en 390 y 1280 px.
- [x] Paleta: el rojo de la marca como principal, con neutros fríos; contraste validado (18/11, §7.1 de C7).
- [ ] Tipografía elegida (Inter, Figtree o Montserrat).
- [ ] Armazón elegido: menú lateral y barra inferior del celular (qué cuatro módulos).
- [ ] Diseño de cada tipo de pantalla: lista, ficha, crear, configuración, flujo de un paso y portada.
- [ ] Visto bueno del dueño.
- [x] Plazo: 1 a 3 días, dentro del cierre del 1/12 (18/11).

## Fase 1 — Fundamentos

- [ ] Tokens del panel en `globals.css`: neutros, principal, estados con su fondo, estados del trabajo.
- [ ] Escala de tipografía y fuente servida desde `public/fuentes/`.
- [ ] Espacios, radios (6 / 10 / 16 px) y sombras (solo lo que flota).
- [ ] El rojo de la marca fuera de las acciones del panel (solo el logo).
- [ ] Prueba de consistencia: ningún color suelto en `src/app/panel` ni en los componentes del panel.

## Fase 2 — Componentes

### Base (`src/componentes/ui/`)

- [ ] `button` (principal, secundario, sin borde, peligro; tamaños; cargando)
- [ ] `input` y `textarea`
- [ ] `checkbox` y `radio-group`
- [ ] `dialog` y `sheet`
- [ ] `dropdown-menu`
- [ ] `table`
- [ ] `sonner` (avisos)
- [ ] `label`

### Página y navegación

- [ ] `encabezado-pagina` (título, volver, estado, acción principal)
- [ ] `pagina-panel` (tipos de pantalla)
- [ ] `boton-volver` y `enlace-texto`
- [ ] `pestanas`, `filtros`, `pildora-vista` y `pildora`
- [ ] `barra-lista` y `buscador`
- [ ] `paginacion`
- [ ] `navegacion-pendiente` (barra de carga y respuesta al instante)

### Listas y tablas

- [ ] `tabla-lista` y su celda doble
- [ ] `tabla-acciones`
- [ ] `fila-lista` (`ListaFilas`)
- [ ] `lista-editable`, `editor-lista`, `ordenar-lista` y `ordenar`
- [ ] `lista-datos` y `datos-en-bloques`
- [ ] `estado-vacio`

### Fichas y secciones

- [ ] `seccion-con-editar` y `cabecera-seccion`
- [ ] `tarjetas-seccion` ("¿Qué quieres cambiar?")
- [ ] `tarjeta-numero`
- [ ] `insignia`
- [ ] `menu-mas`
- [ ] `paso-siguiente`, `pasos-trabajo` y `pasos-flujo` (el recorrido del trabajo, fase 4)
- [ ] `resumen-paso`
- [ ] `texto-corto`

### Formularios

- [ ] `campo` (etiqueta, opcional, ayuda, error)
- [ ] `campo-monto` y `selector`
- [ ] `opciones-en-tarjetas`
- [ ] `seccion-formulario`, `formulario-paso` y `mas-datos`
- [ ] `pie-formulario`
- [ ] `cambios-sin-guardar` y `pregunta-salir`
- [ ] `empieza-de-cero`

### Modales

- [ ] `modal-formulario`, `modal-pie` (`PieModal`, `CancelarModal`) y su versión de hoja en el celular

### Avisos y estados del sistema

- [ ] `aviso-flotante` y `avisos`
- [ ] `aviso-conexion`
- [ ] `aviso-version-nueva`
- [ ] `cargando` (esqueletos)

### Fotos, firma y WhatsApp

- [ ] `elegir-foto`, `subida-foto`, `zona-foto` y `guia-foto`
- [ ] `visor-fotos` y `abrir-foto`
- [ ] `panel-firma`
- [ ] `avisar-whatsapp`

## Fase 3 — Armazón y PWA

- [ ] `menu-panel` y `navegacion` (menú lateral de la computadora)
- [ ] Barra superior del celular (`menu-desplazable`, `menu-desplegable`)
- [ ] Barra inferior del celular (nueva), según los permisos
- [ ] `usuario-sesion` (usuario, manual y salir)
- [ ] `src/app/panel/layout.tsx`, `error.tsx`, `not-found.tsx` y `[...resto]`
- [ ] PWA: `manifest.ts` (`theme_color`, fondo), íconos, barra de estado y zonas seguras
- [ ] `registrar-service-worker` y la pantalla sin conexión
- [ ] Prueba instalada como app en Android e iPhone

## Fase 4 — El recorrido del trabajo

- [ ] Indicador de pasos común: Cotizado → Aceptado → Reservado → En el taller → Listo → Entregado, y el cobro
- [ ] El paso siguiente como acción principal en el encabezado de cada ficha
- [ ] Enlaces entre la cotización, la reserva y la orden del mismo trabajo
- [ ] Historia del cliente y del vehículo: línea de tiempo de sus trabajos

## Fase 5 — Pantallas, en el orden del recorrido

### Inicio

- [ ] `/panel` — Inicio: saludo y accesos, números del día, "Para hoy" y "Para atender" (`para-atender`)

### Cotizaciones

- [ ] `/panel/cotizaciones` — Lista con pestañas, búsqueda y páginas (`lista-cotizaciones`)
- [ ] `/panel/cotizaciones/nueva` — Nueva cotización en pasos (`formulario-nueva-cotizacion`, `elegir-servicio`, `lineas-servicio`, `campos-precio`, `formulario-cotizacion`)
- [ ] `/panel/cotizaciones/[id]` — Ficha (`versiones-cotizacion`, `generar-pdf`, `compartir-pdf`, `estado-cotizacion`)
  - [ ] Modal "Rechazar la cotización"
  - [ ] Modal "Volver a pendiente"
- [ ] `/panel/cotizaciones/[id]/nueva-version` — Nueva versión

### Agenda

- [ ] `/panel/agenda` — Tablero de la semana, día del celular, Por reservar y búsqueda (`tablero`)
- [ ] `/panel/agenda/nueva` — Nueva reserva (directa, desde cotización, desde mantenimiento) (`formulario-reserva`, `seccion-fechas-reserva`, `seccion-adelanto`, `campo-espacio`)
- [ ] `/panel/agenda/[id]` — Ficha de la reserva (`acciones-reserva`, `reservas-cliente`)
  - [ ] Modal "Reprogramar"
  - [ ] Modal "Cancelar reserva"

### Órdenes

- [ ] `/panel/ordenes` — En el taller y Entregadas, con búsqueda y páginas
- [ ] `/panel/ordenes/[id]/recibir` — Recibir: cómo llegó, checklist y fotos (`formulario-recepcion`, `como-llego`, `checklist-recepcion`)
  - [ ] Modal "Detalle: {parte}" del checklist
- [ ] `/panel/ordenes/[id]` — Ficha de la orden (`estado-orden`, `fotos-orden`, `historial-orden`, `acciones-orden`)
  - [ ] Modal "Agregar servicio" (`agregar-adicional`)
  - [ ] Modal "Extender entrega" (`extender-entrega`)
  - [ ] Modal "Volver al paso anterior"
- [ ] `/panel/ordenes/[id]/entregar` — Entregar: montos, firma y con saldo (`formulario-entrega`, `firma-entrega`)
- [ ] `/panel/ordenes/[id]/publicar` — Publicar en la galería (`formulario-publicar`)

### Pagos

- [ ] `/panel/pagos` — Saldos pendientes, con búsqueda y orden
- [ ] Montos del trabajo (`montos-trabajo`, `ver-comprobante`) en la reserva, la orden y entregar
  - [ ] Modal "Registrar pago" (`registrar-pago`, `elegir-metodo`, `campo-comprobante`)
  - [ ] Modal "Anular pago" (`anular-pago`)

### Clientes

- [ ] `/panel/clientes` — Lista con búsqueda, desactivados y páginas (`tabla-clientes`)
- [ ] `/panel/clientes/nuevo` — Nuevo cliente (`formulario-nuevo-cliente`, `campos`)
- [ ] `/panel/clientes/[id]` — Ficha del cliente: datos, vehículos, historia (`formulario-datos-cliente`, `vehiculos-cliente`, `acceso-cliente`, `resumen-cliente-vehiculo`)
  - [ ] Modal "Datos" (editar el cliente)
  - [ ] Modal "Agregar vehículo"
  - [ ] Modal "Desactivar cliente"
- [ ] `/panel/clientes/[id]/vehiculos/[vehiculo]` — Ficha del vehículo con su historia (`datos-vehiculo`, `mas-vehiculo`)
  - [ ] Modal editar vehículo
  - [ ] Modal "¿Desactivar {placa}?"
- [ ] `/panel/clientes/[id]/vehiculos/[vehiculo]/dueno` — Cambiar de dueño (`cambiar-dueno`, `elegir-cliente`)

### Mantenimientos

- [ ] `/panel/mantenimientos` — Por avisar, Más adelante y Cerrados (`lista-mantenimientos`)
- [ ] Planes del vehículo (`planes`)
  - [ ] Modal "Agregar mantenimiento"
  - [ ] Modal "Mantenimiento de {servicio}"
  - [ ] Modal "No le interesa" (`no-le-interesa`)

### Reclamos

- [ ] `/panel/reclamos` — Pendientes y todos, con páginas
- [ ] `/panel/reclamos/[id]` — Ficha del reclamo (`estado-reclamo`, `fotos-reclamo`)
  - [ ] Modal "Marcar como atendido" (`atender-reclamo`)

### Reportes y gastos (rama `p16-gastos`, #257)

- [ ] `/panel/reportes` — Resumen, Ingresos, Reporte de gastos, y Taller y clientes (gráficos y elegir fechas)
- [ ] `/panel/reportes/gastos` — Gastos (`registrar-gasto`, `anular-gasto`)
  - [ ] Modal "Registrar gasto"
  - [ ] Modal "Anular gasto"

### Catálogo y precios

- [ ] `/panel/catalogo` — Lista de servicios
  - [ ] Modal "Nuevo servicio" (`agregar-servicio`)
- [ ] `/panel/catalogo/[id]` — Ficha del servicio (`formulario-datos-catalogo`, `precios-servicio`, `precios-variante`, `formulario-precios`, `variantes-servicio`, `mas-servicio`)
  - [ ] Modal "Datos"
  - [ ] Modal "Precios de {variante}"
  - [ ] Modal "Historial de precios"
  - [ ] Modal "Variantes"
  - [ ] Modal "¿Desactivar {servicio}?"

### Sitio web

- [ ] `/panel/sitio` — Portada de la sección ("¿Qué quieres cambiar?")
- [ ] `/panel/sitio/textos` — Textos y fotos de las páginas (`formulario-contenido`, `foto-pagina`, `video-portada`)
- [ ] `/panel/sitio/servicios` — Servicios del sitio (`ordenar-servicios`)
- [ ] `/panel/sitio/servicios/[id]` — Página de un servicio (`formulario-servicio`, `foto-servicio`, `elegir-icono`)
  - [ ] Modal "Dirección de la página"
- [ ] `/panel/sitio/galeria` — Galería (`galeria-panel`, `galeria-portada`, `galeria-tarjeta`, `galeria-subir`, `galeria-comun`)
  - [ ] Modal "Subir fotos"
  - [ ] Modal "El trabajo de la portada"
  - [ ] Modal "Editar trabajo"
  - [ ] Modal "¿Eliminar esta foto?"
- [ ] `/panel/sitio/preguntas` — Preguntas frecuentes (`lista-preguntas`)
  - [ ] Modal "Agregar pregunta"
  - [ ] Modal "Editar pregunta"
  - [ ] Modal "¿Eliminar esta pregunta?"

### Usuarios

- [ ] `/panel/usuarios` — Lista
- [ ] `/panel/usuarios/nuevo` — Nuevo usuario (`formulario-usuario`, `campos-permisos`)
- [ ] `/panel/usuarios/[id]` — Ficha del usuario (`ficha-usuario`)
  - [ ] Modal "Datos"
  - [ ] Modal "Cambiar mi contraseña"
  - [ ] Modal "Nueva contraseña para {nombre}"
  - [ ] Modal "¿Desactivar a {nombre}?"

### Configuración

- [ ] `/panel/configuracion` — Portada de la sección
- [ ] `/panel/configuracion/negocio` — Datos del negocio y logo (`formulario-negocio`, `logo-documentos`)
- [ ] `/panel/configuracion/taller` — Horarios, espacios y tamaños (`editor-horarios`, `lista-editable` de configuración)
  - [ ] Modales "Nuevo / Editar" de espacios y tamaños, y su orden
- [ ] `/panel/configuracion/parametros` — Montos, días e intervalos (`formulario-parametros`)
- [ ] `/panel/configuracion/mensajes` — Mensajes de WhatsApp (`editor-plantilla`, `burbuja-mensaje`)
  - [ ] Modal "¿Volver al texto original?"

### Del sistema

- [ ] `/panel/sin-acceso` — Sin permiso
- [ ] `/panel/[...resto]` y `not-found` — Página que no existe
- [ ] `error.tsx` — Error inesperado
- [ ] `/panel/manual` — Manual del panel (enlace y capturas)

## Fase 6 — Cierre

- [ ] `recorrido-panel.spec.ts`: capturas de todas las pantallas a 390 y 1366 px con los tres roles, revisadas
- [ ] Toda la suite E2E y el CI en verde
- [ ] Manual del panel regenerado (`npm run manual:capturas`, `manual:armar`, `manual:pdf`)
- [ ] `sistema-del-panel.md`, la skill `pantallas-panel` y `identidad-visual.md` al día con el diseño nuevo
- [ ] `CLAUDE.md` (identidad visual del panel) y `plan-de-desarrollo.md` al día
- [ ] Prueba a mano en Android e iPhone, también instalada como app (`09-pruebas/prueba-en-celulares.md`)
