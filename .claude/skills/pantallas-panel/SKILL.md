---
name: pantallas-panel
description: Criterios de UI/UX y lista de QA para diseñar, ordenar o pulir cualquier pantalla del panel interno de TocTar (src/app/panel, src/modulos/*/componentes) — listas, fichas, formularios de crear, configuración, flujos como recibir o entregar, botones de guardar y acciones. Úsala siempre que se cree o modifique una pantalla, un formulario o una acción del panel, en el pulido visual o en una historia nueva, aunque el pedido no hable de diseño (por ejemplo "agrega un campo a la ficha del cliente" o "pon un botón para…"), y también para revisar si una pantalla tiene demasiadas cosas.
---

# Pantallas del panel

El panel lo usa el dueño de un taller de detailing, casi siempre desde el celular, de pie, con las manos ocupadas y poco tiempo; a veces un encargado y, para sus órdenes, el técnico. Abre una pantalla para hacer **una cosa**: ver quién debe, recibir un auto, cambiar un precio. Cada botón, texto o bloque de más le cuesta tiempo y le hace dudar. Por eso la regla de fondo es **menos es más**: lo que no ayuda a la tarea de esa pantalla se quita, se esconde o se lleva a otra pantalla.

Esta skill complementa a `frontend-design` (el criterio visual) y a los estándares de `docs/08-desarrollo/pulido-visual.md` (identidad, tamaños, botones, accesibilidad). Aquí está **cómo se ordena una pantalla** y **cómo se prueba**.

## 1. Antes de tocar nada: el inventario

Para cada pantalla, una tabla corta en su registro de `pulido-visual.md`:

| Qué hay | Para qué tarea | Quién y cada cuánto | Decisión |
|---|---|---|---|
| "Extender entrega" | Mover la fecha de una orden | Dueño, rara vez | Al menú "Más" |

Las decisiones posibles son cuatro: **queda arriba** (es la tarea de la pantalla), **queda abajo** (se consulta), **se esconde** (detrás de "Editar", "Más" o "Ver más") o **se va** (no ayuda o ya está en otra pantalla). Lo que se usa todos los días gana el lugar; lo que se usa una vez al mes no puede costarle espacio al resto.

**Una pantalla a la vez, y propuesta antes de programar.** Con el inventario y las capturas de antes se arma la propuesta para el desarrollador: qué se encontró, qué se ordena, **qué se mejora visualmente** (con `frontend-design`: jerarquía, espacios, tipografía, la marca con medida) y **qué componentes se reutilizan o se crean** para que la pantalla se vea igual que el resto del panel. Se programa recién con su visto bueno; nunca un grupo entero de golpe. Ordenar no alcanza: pulir también es que se vea mejor y coherente.

**La prueba de los 5 segundos:** al abrir la pantalla en el celular, ¿se entiende qué es y qué hacer, sin leer párrafos ni desplazarse? Si no, sobra algo.

## 1b. El estilo del panel (pedido 26)

El panel es un panel administrativo estándar: la marca queda en el sitio y el ingreso. Una pantalla nueva no inventa su
estilo: se arma con estas piezas (`src/componentes/panel/`), y si alguna no alcanza, se extiende.

| Para | Pieza |
|---|---|
| El título, el estado, la acción y "‹ Volver" | `EncabezadoPagina` (con `estado`, `accion` y `volver`) |
| Una lista que abre fichas | `TablaLista` (tabla en la computadora, filas en el celular; `movil` dice dónde va cada celda) y `CeldaDoble` |
| Una lista simple de un toque | `ListaFilas` |
| Filtros dentro de una lista | `Filtros` (píldoras con su cuenta, por la dirección) |
| Las vistas de un módulo | `Pestanas` |
| Un número del día | `TarjetaNumero` |
| La portada de una sección con partes | `TarjetasSeccion` ("¿Qué quieres cambiar?") |
| Una sección de ficha con "Editar" | `SeccionConEditar` (el formulario en `ModalFormulario`) |
| Una parte de un formulario largo | `SeccionFormulario` (o `tt-seccion-formulario` en el fieldset) |
| Un estado | `Insignia` con su tono; los del trabajo, de `TONO_ESTADO_TRABAJO` |
| Un bloque suelto | `tt-tarjeta-panel` |

Colores: los tokens de `globals.css` (`bg-fondo-panel`, `text-info`, `bg-aviso-fondo`…), nunca un `#hex`. Títulos con
`tt-titulo-pagina`, `tt-titulo-seccion` y `tt-titulo-sub`; placas y números con `tt-placa`. El rojo, solo en el botón
principal y en el módulo activo del menú.

## 2. Qué tipo de pantalla es

Toda pantalla del panel es uno de estos tipos. Identificarlo decide su forma; no se inventa una forma nueva por pantalla.

### Lista (Clientes, Órdenes, Cotizaciones, Saldos…)
- Arriba: título, **una** acción principal si la hay ("Agregar cliente") y, si hace falta, buscar y filtros (pestañas, cuatro como mucho).
- Cada fila es **un toque** que abre su ficha. Lo que identifica (placa, nombre) grande; lo que decide (estado, monto, fecha) a la vista, con palabras y no solo color; el resto, fuera de la fila.
- Las filas no llevan formularios ni varios botones: las acciones viven en la ficha. Excepción: una acción que se hace desde la lista todos los días (como "Escribir por WhatsApp" en Saldos), una sola.
- Vacía: una línea que dice qué falta y, si corresponde, cómo agregarlo.

### Ficha (cliente, servicio del catálogo, consulta, reserva, orden)
- **Encabezado:** quién o qué es (placa, nombre), su estado y **el paso siguiente** como única acción principal (recibir, marcar lista, avisar, entregar). Las acciones que se usan poco (extender, cancelar, anular, desactivar) van en un menú **"Más"**.
- **Secciones en lectura, y la edición en un modal.** Cada sección es un recuadro con sus datos como texto (no como campos) y su título con **"Editar"** (sin borde) en la misma fila. "Editar" abre el formulario en un **modal** ("Guardar {lo que es}" y "Cancelar" al pie); en el celular, una hoja desde abajo con los botones fijos. La página no salta ni cambia mientras se edita, el modal ya es "una edición a la vez" y el foco va al primer campo para escribir y vuelve a "Editar" al cerrar. Todas las secciones con el mismo sistema (título fuera del recuadro, o dentro en su cabecera si es una parte de otra sección) y alineadas entre sí. El componente es `SeccionConEditar` (`src/componentes/panel/seccion-con-editar.tsx`, desde el pulido 7.3), con el modal común `ModalFormulario` (`modal-formulario.tsx`). Editar dentro de la página queda para lo que se edita fila por fila (las listas de Configuración).
- **Orden de las secciones:** lo que decide primero (estado, montos, lo que falta), lo que se consulta después (datos, fotos), la historia al final y plegada si es larga ("Ver toda la historia").
- Un dato vacío no ocupa una fila con un guion: no se muestra, o se ofrece cargarlo desde "Editar".

### Crear (nuevo cliente, nueva reserva, nueva consulta)
- **¿Modal o pantalla?** Crear algo de **pocos campos (uno a tres)** va en un **modal** desde la lista ("Agregar servicio": solo el nombre), con `ModalFormulario`: no se pierde la lista de vista y no hay una página casi vacía. Un formulario largo (un cliente con su vehículo, una reserva) va en **su propia pantalla**. En los dos casos, al crear se llega a la ficha.
- **Un formulario y un botón principal**, al final, que dice lo que crea ("Crear cliente"). En el celular el botón queda fijo abajo: `PieFormulario` (`src/componentes/panel/pie-formulario.tsx`).
- Primero lo obligatorio; lo opcional al final o plegado detrás de "＋ Agregar …" ("Agregar correo, NIT y notas"): `MasDatos` (`mas-datos.tsx`), que empieza abierto si trae un valor o un error. Valores por defecto que acierten (hoy, el primer espacio libre, el servicio más pedido) para que el caso común sea llenar poco.
- Al terminar, lleva a la ficha de lo creado con un aviso corto.

### Configuración (Negocio, Taller, Parámetros, Mensajes)
- Una pestaña es un formulario con **un** botón al final. Si la pestaña tiene partes que se guardan por separado (el logo, cada mensaje), cada una es una sección con su título y su botón al pie, nombrado por lo que guarda ("Guardar mensaje"), nunca dos botones iguales a la vista sin decir qué guardan.

### Flujo de un paso (recibir, entregar, cotizar, publicar)
- Pantalla propia, con el objeto en el título ("Entregar 1234ABC"). Los pasos en el orden en que se hacen, sin desvíos. Un botón grande al final con el verbo del paso. Lo que no se deshace pide confirmación, con el detalle de lo que pasa.

## 3. Acciones y botones

Los tipos de botón (rojo para guardar o crear, contorno para lo secundario, rosado para lo que no se deshace, sin fondo en las filas) y sus tamaños ya están en `pulido-visual.md`. Además:

- **Una acción principal (roja) a la vista por pantalla**, o por sección abierta. Si hay dos rojos compitiendo, uno no es principal.
- **Cada botón dice qué hace y sobre qué:** "Guardar precios", "Registrar pago", "Entregar vehículo". Un "Guardar" solo vale si en ese momento hay un solo formulario abierto.
- **Siempre en el mismo lugar:** al pie de su formulario o sección, alineado a la izquierda, el principal primero y "Cancelar" al lado. El paso siguiente de una ficha, en su encabezado.
- **Menú "Más"** para lo poco frecuente: un solo componente, `MenuMas` (`src/componentes/panel/menu-mas.tsx`, sobre el `dropdown-menu` de shadcn; desde el pulido 8.3, en la ficha del cliente). No es `menu-desplegable.tsx`, que es la navegación del celular. Lo destructivo dentro de "Más" sigue pidiendo confirmación: un `ModalFormulario` con "Sí, {verbo}" y `CancelarModal focoInicial` (el foco en "Cancelar", así un Enter no lo confirma).
- **Un componente, no copias:** el patrón "sección con Editar" es `SeccionConEditar` y lo usan todas las fichas; todo modal con formulario es `ModalFormulario`; su formulario se cierra al guardar con `useCerrarModal` y pone sus botones en `PieModal`, con `CancelarModal` ("Cancelar", o "Listo" si cada cambio ya se guardó al momento). Lo que se consulta (como un historial) va arriba en el modal, no en el pie. Si una pantalla necesita una variante, se extiende el componente.
- **Alineación:** listas de datos con la etiqueta a la izquierda y el valor a la derecha (también los campos de un formulario de montos: una fila por campo, de ancho fijo), así los números quedan en columna aunque una etiqueta ocupe dos líneas. En una grilla, las etiquetas largas desalinean los valores.

## 4. Textos: lo justo

- **Sin párrafos de introducción.** El título y las etiquetas tienen que alcanzar. Una ayuda bajo un campo solo si el campo es ambiguo, en una línea ("Se le da al cliente como aproximada.").
- Etiquetas cortas y con la unidad ("Adelanto (Bs)"). Los números con `tabular-nums`.
- No repetir: si el título dice "Saldos pendientes", la lista no necesita "Estas son las órdenes con saldo".
- Errores que dicen qué pasó y cómo seguir, junto al campo. Avisos de éxito cortos, con el mismo verbo del botón ("Precios guardados.").
- Los estados de un trabajo escritos siempre igual (`NOMBRE_ESTADO_TRABAJO`).

## 5. Cómo se programa (lo que ya es regla del proyecto, junto)

- Server Components por defecto; la sesión dentro de `<Suspense>`; cada página y acción verifica permiso (`exigirModulo`, `exigirAccion`).
- El mismo esquema Zod en el formulario y en el servidor. `useActionState` con `conAviso`, el error junto al campo (`Campo`, `MensajeError`) y `useFocoEnError`.
- Lo que necesita JavaScript (subir una foto, tocar un campo para insertarlo, abrir "Más") se habilita al hidratar (`useHidratado`), así un toque temprano no se pierde.
- El teclado que corresponde (`inputMode`, `type`), `autoComplete` y botones que el teclado del celular no tape.

## 6. QA: antes de dar una pantalla por terminada

**Con cada rol:** dueño; encargado con el permiso y sin él; técnico donde aplique (nunca ve precios, pagos ni teléfonos del cliente, RN-12). Se entra con cada uno y se mira qué ve y qué no.

**Con cada estado:** vacío, uno, muchos (50 filas), textos largos (un nombre de 60 letras, una placa larga), sin foto, con error del servidor, sin conexión, doble toque en el botón principal, volver atrás después de guardar.

**En cada tamaño:** 360, 390, 768 y 1280 px, con capturas de antes y después. Nada se sale de la pantalla (`scrollWidth` igual al ancho) y nada importante queda debajo del teclado o del pulgar.

**Con teclado y lector de pantalla:** todo se alcanza con Tab, el foco se ve, cada botón de ícono tiene nombre, los títulos van en orden (un `h1`).

**En las E2E:** después de guardar, se espera lo que ve la persona (el formulario cerrado, el aviso, el dato nuevo), no la dirección: las acciones navegan por dentro y `waitForURL` puede no terminar. Lo que muestra el sitio público se renueva en segundo plano en unos segundos: se visita hasta verlo (`toPass`). Antes de escribir en un formulario, la pantalla ya cargó (`waitForLoadState("networkidle")` o esperar a que un botón que depende de JavaScript esté habilitado), y se comprueba el valor (`toHaveValue`) antes de guardar: si no, el valor se pierde y la prueba falla a veces. Se busca por rol y nombre accesible, que es lo mismo que oye el lector de pantalla.

**La prueba final:** abrir la pantalla en el celular, hacer su tarea principal y contar los toques y lo que hubo que leer. Si algo se puede quitar sin que la tarea cueste más, se quita.

## 7. Registro

Cada pantalla deja en `pulido-visual.md` su inventario (§1), qué se cambió y por qué, y las capturas. Lo que aparezca y no sea pulido (una función nueva) va a `03-cierre-comercial/registro-de-cambios.md`, no se programa.
