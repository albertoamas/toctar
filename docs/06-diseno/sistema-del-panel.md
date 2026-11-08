# Sistema del panel: reglas de estructura

- **Fecha:** 8 de noviembre de 2026
- **Alcance:** todas las pantallas de `/panel/**`. El sitio público y el ingreso siguen `identidad-visual.md`.
- **Base:** pedido 26 (`08-desarrollo/etapas/P26-rediseno-panel.md`), que define el estilo: colores, tipografía, tarjetas e insignias.
- **Cómo se llega aquí:** el plan para aplicar estas reglas está en `08-desarrollo/etapas/C6-consistencia-del-panel.md`. Hasta que termine, lo que todavía no cumple figura en su inventario.

Este documento dice **qué forma tiene cada pantalla**. Si una regla no alcanza, se cambia aquí primero y después en el código: una pantalla no inventa su propia forma.

## 1. Tipos de pantalla

Toda pantalla del panel es de uno de estos tipos. El tipo decide su ancho.

| Tipo | Para qué | Ancho máximo | Ejemplos |
|---|---|---|---|
| `lista` | Una tabla con columnas, o un tablero | Todo el ancho | Clientes, Órdenes, Cotizaciones, Agenda |
| `ficha` | Ver y editar una cosa, o una lista de filas sin columnas | `5xl` (1024 px) | Cliente, Orden, Negocio, Preguntas frecuentes |
| `formulario` | Crear algo, o un paso que se hace de arriba abajo | `3xl` (768 px) | Nueva reserva, Recibir, Entregar, Nuevo cliente |
| `portada` | Elegir a dónde ir o ver el día | La propia de la portada | Inicio, Sitio web, Configuración |

- El ancho sale del tipo, en `PaginaPanel`. Las páginas no escriben `max-w-*`.
- Dentro de una ficha, un campo puede ser más angosto que su tarjeta (`max-w-32` para un número). Esa medida es del campo, no de la pantalla.
- En el celular todo va en una columna.

## 2. Forma de una ficha

- **Título arriba de la tarjeta**, con su acción en la misma fila. La lectura va dentro de la tarjeta.
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
| Encabezado de la página | Otras acciones ("Escribir por WhatsApp", "Cambiar orden") | Con borde |
| Encabezado de la página | Lo poco usado | En "Más" (`MenuMas`) |
| Cabecera de una sección | "Editar", "Agregar", "Registrar pago" | Sin borde, con ícono |
| Fila de una lista | Toda la fila abre su ficha o su modal | Sin botones, con la flecha ›. Excepción: la acción de todos los días en Saldos y Mantenimientos (`FilaConAcciones`) |
| Pie de un modal | Guardar y "Cancelar"; aparte, a la derecha, lo que se usa poco | Rojo y con borde; lo de la derecha, sin borde |

- En una pantalla con varias listas iguales (Taller), "Agregar" va con borde: varias acciones rojas competirían.
- Lo que no se deshace pide confirmación, con el foco en "Cancelar".

## 4. Editar y guardar

- Todo modal de edición usa `ModalFormulario`, con sus botones en `PieModal`.
- El botón dice qué guarda: "Guardar horario", "Guardar pregunta".
- **Ningún modal pierde lo escrito sin preguntar:** si hay cambios, cerrarlo con "Cancelar", Escape o tocando afuera pregunta "¿Salir sin guardar?". Sin cambios, se cierra directo.
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
