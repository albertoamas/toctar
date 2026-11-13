# Sistema del panel: reglas de estructura

- **Fecha:** 8 de noviembre de 2026 (al día el 13/11: los anchos de las listas y las portadas, y cómo se ve cada forma)
- **Alcance:** todas las pantallas de `/panel/**`. El sitio público y el ingreso siguen `identidad-visual.md`.
- **Base:** pedido 26 (`08-desarrollo/etapas/P26-rediseno-panel.md`), que define el estilo: colores, tipografía, tarjetas e insignias.
- **Cómo se llegó aquí:** con `08-desarrollo/etapas/C6-consistencia-del-panel.md`, terminado el 08/11/2026. Todas las pantallas cumplen estas reglas; lo que se aparta tiene su motivo escrito en `tests/unit/consistencia-panel.test.ts`, y `tests/e2e/recorrido-panel.spec.ts` recorre el panel en 4 tamaños con 3 roles.

Este documento dice **qué forma tiene cada pantalla**. Si una regla no alcanza, se cambia aquí primero y después en el código: una pantalla no inventa su propia forma.

## 1. Tipos de pantalla

Toda pantalla del panel es de uno de estos tipos. El tipo decide su ancho.

| Tipo | Para qué | Ancho máximo | Ejemplos |
|---|---|---|---|
| `lista` | Una tabla con columnas, o un tablero | `7xl` (1280 px) | Clientes, Órdenes, Cotizaciones, Agenda |
| `ficha` | Ver y editar una cosa, o una lista de filas sin columnas | `5xl` (1024 px) | Cliente, Orden, Negocio, Preguntas frecuentes |
| `formulario` | Crear algo, o un paso que se hace de arriba abajo | `3xl` (768 px) | Nueva reserva, Recibir, Entregar, Nuevo cliente |
| `portada` | Elegir a dónde ir o ver el día | `7xl` (1280 px) | Inicio, Sitio web, Configuración |

- El ancho sale del tipo, en `PaginaPanel`. Las páginas no escriben `max-w-*`.
- Dentro de una ficha, un campo puede ser más angosto que su tarjeta (`max-w-32` para un número). Esa medida es del campo, no de la pantalla.
- En el celular todo va en una columna.
- Hasta una laptop de 1280 px (con el menú, el área de trabajo mide unos 970 px) todas ocupan el ancho que hay: la
  diferencia se ve en monitores grandes. Hasta el 10/11 las listas y las portadas se estiraban a todo el monitor.

**Cómo se ve cada forma** (revisión de las 40 pantallas del 10/11, `08-desarrollo/inventario-pantallas.md`):

| Forma | Computadora | Celular |
|---|---|---|
| **Lista** | Tabla con columnas (`TablaLista`); la fila abre su ficha | Filas: lo que identifica arriba, el estado a la derecha, el resto abajo |
| **Lista de acciones** (cobrar, avisar) | Tabla con una columna de acciones (`TablaAcciones`) | Tarjetas con los botones abajo |
| **Ficha de un trabajo** (cotización, reserva, orden) | Pasos del trabajo, el paso siguiente grande, secciones y "Más" | Lo mismo, apilado |
| **Ficha editable** | Secciones en tarjetas, de a dos (`PartesIguales`); "Editar" abre un modal | Una columna; el modal sube desde abajo |
| **Crear o un paso del taller** | Formulario angosto, en pasos si hace falta, botón al pie (`PieFormulario`) | Igual, con el botón fijo abajo |
| **Portada** | Tarjetas para elegir a dónde ir | Una debajo de la otra |

Una pantalla nueva o cambiada toma una de estas formas; si ninguna sirve, se discute antes de inventar otra.

## 2. Forma de una ficha

- **Título arriba de la tarjeta**, con su acción en la misma fila. La lectura va dentro de la tarjeta. El título va adentro solo si la tarjeta es un bloque aparte que no sigue la lectura de la página: un panel lateral de una portada ("Para atender") o un formulario que se abre en la misma pantalla ("Subir fotos").
- **Se lee y se edita aparte:** cada parte tiene su "Editar", que abre un modal y guarda solo esa parte. No hay un "Guardar" general.
- **Qué va en la ficha:** primero lo que decide (estado, montos, lo que falta), después lo que se consulta (datos, fotos) y al final la historia.
- **Dos disposiciones en computadora.** Se elige una por ficha:

| Disposición | Columnas | Cuándo |
|---|---|---|
| Principal y datos | Una ancha y una de `22rem` | Hay un trabajo principal y datos de apoyo: Orden, Reserva, Cotización, Reclamo |
| Partes iguales | Dos iguales, o una si la parte es larga | Secciones cortas y parecidas: Cliente, Catálogo, Negocio, Parámetros |

## 3. Acciones

| Dónde | Qué va | Cómo se ve |
|---|---|---|
| Encabezado de la página | La acción principal | Roja, **una sola**, que cambia según el estado si hace falta |
| Debajo del encabezado, en una ficha de trabajo (Reserva, Orden) | El paso siguiente que avanza el trabajo: recibir, empezar, marcar listo, avisar, entregar. Va aquí y no en el encabezado | Rojo y grande (56 px, a todo el ancho en el celular), con `PasoSiguiente`; lo que lo acompaña, al lado con borde. Se toca de pie en el taller. Si falla, el motivo queda debajo del botón |
| Encabezado de la página | Otras acciones ("Escribir por WhatsApp", "Cambiar orden") | Con borde |
| Encabezado de la página | Lo poco usado | En "Más" (`MenuMas`) |
| Cabecera de una sección | "Editar", "Agregar", "Registrar pago" | Sin borde, con ícono |
| Fila de una lista | Toda la fila abre su ficha o su modal | Sin botones, con la flecha ›. Excepción: la acción de todos los días en Saldos y Mantenimientos (`FilaConAcciones`) |
| Fila de una tarjeta que se lee (un pago) | Lo poco usado que no se deshace (anular) | En su "⋯" (`MenuMas icono`), a la derecha, con su confirmación en un modal |
| Pie de un modal | Guardar y "Cancelar"; aparte, a la derecha, lo que se usa poco | Rojo y con borde; lo de la derecha, sin borde |

- En una pantalla con varias listas iguales (Taller), "Agregar" va con borde: varias acciones rojas competirían.
- Lo que no se deshace pide confirmación, con el foco en "Cancelar".

## 4. Editar y guardar

- Todo modal de edición usa `ModalFormulario`, con sus botones en `PieModal`.
- El botón dice qué guarda: "Guardar horario", "Guardar pregunta".
- **Ningún modal pierde lo escrito por un cierre sin querer** (pulido 13.48): con cambios, tocar afuera, Escape o el "atrás" de Android (Chrome se lo avisa al diálogo) no cierran; el **pie del mismo modal** pasa a "Tienes cambios sin guardar." con "Seguir editando" (con el foco) y "Descartar cambios". **Nunca otro modal encima.** "Cancelar" y la X cierran sin preguntar: son una decisión. Sin cambios, todo cierra directo. Al salir de una pantalla con cambios (un formulario de crear, Recibir, Entregar), la pregunta es un diálogo chico y centrado (`alertdialog`) con "Seguir editando" y "Salir sin guardar".
- Al guardar, el modal se cierra y la ficha muestra el dato nuevo.
- Las fotos se guardan al momento y van en la fila compacta de su sección.

## 5. Listas

| Caso | Componente |
|---|---|
| Tabla con columnas | `TablaLista` |
| Filas que abren otra pantalla | `ListaFilas` |
| Filas que abren un modal, y se agregan y ordenan | `ListaEditable` |
| Filas con su acción de todos los días | `ListaEnTarjeta` y `FilaConAcciones` |
| Cambiar el orden | `OrdenarLista`, en un modal |
| Lista vacía | `EstadoVacio` |

## 6. Datos en lectura

La etiqueta a la izquierda y el valor a la derecha, con `ListaDatos`, para que los valores queden en columna. Un dato vacío dice "Sin cargar" o no se muestra.

## 7. Componentes

| Componente | Para qué | Estado |
|---|---|---|
| `PaginaPanel` | El tipo de pantalla, su ancho y su separación | Existe desde C6 |
| `PartesIguales` | Las partes de a dos (o de a tres) de una ficha | Existe desde C6 |
| `Seccion` | Título arriba de la tarjeta, con su acción | Existe desde C6, sobre `CabeceraSeccion` |
| `CabeceraSeccion` | Solo el título y su acción, si lo de abajo no es una tarjeta (una lista, un texto) | Existe |
| `SeccionConEditar` | Sección que se lee, con su modal | Existe |
| `EncabezadoPagina` | Volver, título, estado y acciones | Existe |
| `ModalFormulario`, `PieModal`, `CancelarModal` | Modales | Existen; la pregunta al cerrar se agrega en C6 |
| `ListaDatos`, `ListaFilas`, `TablaLista`, `ListaEditable`, `OrdenarLista` | Datos y listas | Existen |
| `ListaEnTarjeta`, `FilaConAcciones` | Filas con su acción de todos los días | Existen desde C6 |
| `MenuMas`, `Insignia`, `EstadoVacio` | Acciones poco usadas, estados y vacíos | Existen |

## 8. Cómo se hace cumplir

Una prueba en el CI (`tests/unit/consistencia-panel.test.ts`, de C6) revisa el código de `src/app/panel` y de los módulos. Sus listas de excepciones cuentan las apariciones por archivo y solo pueden achicarse: lo nuevo no puede entrar en ellas.

## 9. Lo que no cambia

Colores, tipografía, tamaños de botón (36 px con mouse, 44 con el dedo), accesibilidad y textos siguen en los estándares de `08-desarrollo/pulido-visual.md` y en `P26-rediseno-panel.md`.
