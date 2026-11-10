# Inventario de pantallas del panel

Revisión del 10/11/2026, a pedido del desarrollador: las 40 pantallas del panel, con su formato en la computadora y en el celular, si se mantienen o cambian y si son consistentes con el resto. El objetivo es que todo el panel hable el mismo idioma y el usuario no se pierda. Es el documento de trabajo del pulido final: **mientras queden cambios abiertos aquí, las prioridades 4 y 5 de `plan-de-desarrollo.md` (punto 0) quedan en pausa**.

El formato sale del código (las piezas que usa cada página) y del recorrido E2E (`recorrido-panel.spec.ts`: 37 pantallas en 4 anchos y 3 roles, sin desplazamiento horizontal). Las pantallas sin ✓ no se miraron en pantalla en esta ronda.

## El idioma del panel

| Tipo | Computadora | Celular |
|---|---|---|
| **Lista** | Tabla con columnas (`TablaLista`); la fila abre su ficha | Filas: lo que identifica arriba, el estado a la derecha, el resto abajo |
| **Lista de acciones** (cobrar, avisar) | Tabla con una columna de acciones | Tarjetas con los botones abajo |
| **Ficha de un trabajo** (cotización, reserva, orden) | Pasos del trabajo, el paso siguiente grande, secciones y "Más" | Lo mismo, apilado |
| **Ficha editable** | Secciones en tarjetas, de a dos (`PartesIguales`); "Editar" abre un modal | Una columna; el modal sube desde abajo |
| **Crear o un paso del taller** | Formulario angosto, en pasos si hace falta, botón al pie (`PieFormulario`) | Igual, con el botón fijo abajo |
| **Portada** | Tarjetas para elegir a dónde ir | Una debajo de la otra |

Regla: una pantalla nueva o cambiada toma uno de estos formatos; si ninguno sirve, se discute antes de inventar otro.

## Los anchos

El ancho lo pone el tipo de la página (`PaginaPanel`, `src/componentes/panel/pagina-panel.tsx`); ninguna página escribe el suyo. Tres anchos máximos (10/11: antes las listas y las portadas se estiraban a todo el monitor y Saldos y Mantenimientos, ya tablas, tenían el de una ficha):

| Tipo | Ancho máximo | Qué va |
|---|---|---|
| `lista` | 1280 px (`max-w-7xl`) | Tablas y el tablero de la Agenda |
| `portada` | 1280 px (`max-w-7xl`) | Inicio y las portadas de Configuración y Sitio web |
| `ficha` | 1024 px (`max-w-5xl`) | Ver y editar una cosa, o una lista de filas sin columnas |
| `formulario` | 768 px (`max-w-3xl`) | Crear, los pasos del taller y los mensajes (sin acceso, no encontrado, error) |

Hasta una laptop de 1280 px (con el menú, el área de trabajo mide unos 970 px) todas ocupan el ancho que hay: la diferencia se ve en monitores grandes.

## Las pantallas

✓ = pasó por el pulido final (09 y 10/11).

| # | Pantalla | Computadora | Celular | Sugerencia | Por qué | Consistente | Estado |
|---|---|---|---|---|---|---|---|
| 1 | Inicio ✓ | 5 tarjetas de números, "Para hoy" en tabla, "Para atender" al costado | Tarjetas compactas, filas | Mantener | — | Sí | — |
| 2 | Configuración | Portada con tarjetas | Tarjetas apiladas | Mantener | — | Sí | — |
| 3 | Sitio web | Portada con tarjetas | Tarjetas apiladas | Mantener | — | Sí | — |
| 4 | Órdenes | Tabla, pestañas y búsqueda | Filas | Mantener; mirarla en la prioridad 5 | — | Sí | — |
| 5 | Clientes | Tabla y búsqueda | Filas | Mantener; prioridad 5 | — | Sí | — |
| 6 | Cotizaciones | Tabla y pestañas | Filas | Mantener; prioridad 5 | — | Sí | — |
| 7 | Reclamos | Tabla y pestañas | Filas | Mantener; prioridad 5 | — | Sí | — |
| 8 | Catálogo y precios | Tabla; "Agregar servicio" en un modal | Filas | Mantener; prioridad 5 | — | Sí | — |
| 9 | Usuarios | Tabla | Filas | Mantener; prioridad 5 | — | Sí | — |
| 10 | Agenda ✓ | Tablero de la semana y "Por reservar" | Un día a la vez, con pestañas | Mantener | El único calendario del panel, a propósito | Sí | — |
| 11 | **Saldos pendientes** ✓ | Filas con botones a la derecha | Tarjetas con los botones lado a lado | **Cambiar en la computadora: tabla con columna de acciones** | Con Mantenimientos, las únicas listas que no son tabla en la computadora | Sí | ✅ 10/11 (cambio 1) |
| 12 | **Mantenimientos** | Tarjetas | Tarjetas | **Cambiar en la computadora: tabla con acciones, como Saldos; sin calendario** (la Agenda ya lo es, y sus fechas son aproximadas). Además: sin "Vencidos (0)" vacío y "Cerrados" con la fila como enlace | La misma | Sí | ✅ 10/11 (cambio 1) |
| 13 | Cotización (ficha) | Pasos, paso siguiente, secciones, "Más" | Apilado | Mantener | — | Sí | — |
| 14 | Reserva (ficha) | Igual que la cotización | Apilado | Mantener | — | Sí | — |
| 15 | Orden (ficha) | Igual que la cotización | Apilado | Mantener | — | Sí | — |
| 16 | Reclamo (ficha) | Datos y responder | Apilado | Mantener | — | Sí | — |
| 17 | Ficha del cliente | Vehículos y Datos de a dos; Reservas y Cotizaciones en tabla; "Editar" en modal | Una columna | Revisada (cambio 4a) | — | Sí | — |
| 18 | Servicio del catálogo | Datos y precios por tamaño; "Editar" en modal | Una columna | Revisar en la prioridad 4 | No revisada en esta ronda | Sí | — |
| 19 | Usuario (ficha) | Datos, y Rol y permisos; "Editar" en modal | Una columna | Mantener | — | Sí | — |
| 20 | Servicio del sitio | Secciones con "Editar" | Una columna | Mantener | — | Sí | — |
| 21 | Configuración > Negocio | Secciones con "Editar" | Una columna | Mantener | — | Sí | — |
| 22 | Configuración > Taller | Listas editables, cada fila con su modal | Igual | Mantener | — | Sí | — |
| 23 | Configuración > Mensajes | Tres mensajes con "Editar" | Igual | Mantener | — | Sí | — |
| 24 | Configuración > Parámetros | Secciones con "Editar" | Una columna | Mantener | — | Sí | — |
| 25 | Sitio > Textos | Una sección por página, con "Editar" | Una columna | Mantener | — | Sí | — |
| 26 | Sitio > Servicios (lista) | Filas sin columnas | Filas | Mantener | Pocas filas que se ordenan a mano; en Catálogo van en tabla porque se comparan precios | Casi | — |
| 27 | Sitio > Preguntas frecuentes | Lista editable, cada fila con su modal | Igual | Mantener | — | Sí (como Taller) | — |
| 28 | Galería del panel | Grilla de fotos, cada una con "Más" | Grilla más angosta | Mantener | Son fotos | Sí | — |
| 29 | Nueva reserva ✓ | 4 pasos, pie con el botón | Igual, pie fijo | Mantener | — | Sí | — |
| 30 | Nueva cotización ✓ | 3 pasos, pie con el total | Igual, pie fijo | Mantener | — | Sí | — |
| 31 | Nueva versión ✓ | Formulario, pie con el total | Igual, pie fijo | Mantener | — | Sí | — |
| 32 | Nuevo cliente | Formulario, lo opcional plegado, pie | Igual, pie fijo | Mantener | — | Sí | — |
| 33 | **Nuevo usuario** | Formulario con una barra de guardar propia (`BarraGuardar`) | La barra se fija recién al escribir | **Cambiar: el pie común (`PieFormulario`)** | La única pantalla de crear con otro pie: el botón no está donde el usuario lo busca | No | ⏳ Cambio 2 |
| 34 | Recibir vehículo ✓ | Un paso del taller con el botón grande | Igual, pie fijo | Mantener | — | Sí | — |
| 35 | Entregar vehículo ✓ | Un paso del taller con el botón grande | Igual, pie fijo | Mantener | — | Sí | — |
| 36 | **Publicar en la galería** | Elegir las fotos y un botón grande propio al final | El botón no queda fijo abajo | **Cambiar: el pie común, como Recibir y Entregar** | El único paso del taller sin pie fijo | A medias | ⏳ Cambio 3 |
| 37 | Cambiar de dueño | Un paso de tres filas y el pie | Igual, pie fijo | Revisar en la prioridad 4 | No revisada en esta ronda | Sí | — |
| 38 | Sin acceso | Un mensaje y volver | Igual | Mantener | — | Sí | — |
| 39 | No encontrado (panel) | Un mensaje y volver | Igual | Mantener | — | Sí | — |
| 40 | Error inesperado (panel) | Un mensaje y reintentar | Igual | Mantener | — | Sí | — |

## Los cambios, en orden

| # | Cambio | Pantallas | Estado |
|---|---|---|---|
| 1 | Listas de acciones como tabla en la computadora: una variante de `TablaLista` con columna de acciones (las filas de hoy no admiten botones adentro). En el celular, las tarjetas de siempre | Saldos, Mantenimientos | ✅ 10/11 |
| 1b | **La barra de las listas** (ver abajo): las mismas piezas y en el mismo orden en toda lista | Clientes, Cotizaciones, Órdenes, Saldos, Reclamos, Mantenimientos, Usuarios, Catálogo, Galería | ✅ 10/11 |
| 2 | Nuevo usuario con `PieFormulario` | Nuevo usuario | ⏳ |
| 3 | Publicar en la galería con `PieFormulario` | Publicar en la galería | ⏳ |
| 4 | Revisar en pantalla las de la prioridad 4 (Ficha del cliente, Servicio del catálogo, Cambiar de dueño) y las listas de la prioridad 5 | 17, 18, 37 y 4 a 9 | ⏳ Sigue |
| 4a | Ficha del cliente: Reservas en tabla como Cotizaciones; la placa en cada fila solo con más de un vehículo; el número arriba en el celular; "Editar" con texto en cada vehículo | Ficha del cliente | ✅ 10/11 |
| 4b | Servicio del catálogo: sin la tarjeta Variantes ("Editar variantes" en el título de Precios); "Catálogo" solo si está inactivo | Servicio del catálogo | ⏳ |
| 4c | Cambiar de dueño: la tarjeta "Vehículo" (`ResumenClienteVehiculo`), sin el dueño repetido; los bloqueos como aviso con su botón para resolverlos; la línea de contexto de `EncabezadoPagina` alineada con el título | Cambiar de dueño | ⏳ |

Al cerrar cada cambio: su entrada en `pulido-visual.md`, el estado aquí y en el plan.

## La barra de las listas (10/11)

Antes cada lista armaba su buscador, sus filtros y su orden a su manera. Prototipo aprobado: https://claude.ai/artifact/BuaNKqHYZpoavPxjE5SDNU. Ahora, en toda lista y en este orden:

1. **Encabezado** (`EncabezadoPagina`): el título y el botón principal a su derecha, también en el celular (el título se parte en dos renglones antes que mover el botón).
2. **Pestañas** (`Pestanas`): solo para ver otra parte de la lista, nunca para ordenar; la cuenta en gris después del nombre ("Pendientes 1"), y lo buscado se conserva al cambiar.
3. **Barra** (`BarraLista`): el buscador (`Buscador`, 320 px; a todo el ancho en el celular), los filtros al lado (`Filtros`, píldoras con su cuenta; en el celular, una fila que se desliza) y a la derecha `Ordenar` o la píldora de los desactivados (`PildoraVista`).
4. **Resumen** (`ResumenLista`): "980 Bs por cobrar en 2 órdenes"; buscando, cuántas se ven.
5. **Tabla o filas.**

| Pantalla | Pestañas | Buscador | Filtros | A la derecha | Resumen |
|---|---|---|---|---|---|
| Clientes | — | ✓ | — | Desactivados | — |
| Cotizaciones | Pendientes, Aceptadas, Rechazadas (con cuenta) | ✓ | — | — | — |
| Órdenes | En el taller, Entregadas | ✓ en las dos (en el taller, nuevo) | Por estado, en el taller | — | — |
| Saldos | — | ✓ | — | Ordenar | El total y cuántas |
| Reclamos | Todos, Pendientes (con cuenta) | — | — | — | — |
| Mantenimientos | Por avisar, Más adelante, Cerrados (con cuenta) | — | — | — | — |
| Usuarios | — | — | — | Desactivados | — |
| Catálogo | — | — | — | Inactivos | — |
| Galería del panel | — | — | Por servicio (antes, un menú) | — | — |
