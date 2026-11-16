# Hallazgos de la prueba en celulares (15/11/2026)

Lo que salió de la prueba a mano en un iPhone 14 Pro Max y una tablet Redmi Pad 2 Pro (`09-pruebas/prueba-en-celulares.md`, puntos 0 a 6). No son fallas propias del celular: son de la app, y se ven usándola de verdad.

**Estado:** ⏳ sin empezar · 🔵 en curso · ✅ unido a `develop` · 📝 va al registro de cambios

## Cómo se trabaja cada punto

Uno por uno, en este orden. Cada punto pasa por los mismos pasos:

1. **Preguntar.** Antes de tocar el código, las preguntas para saber dónde está el error: en qué equipo, en qué pantalla, qué se tocó y qué se esperaba.
2. **Reproducir.** Hacer que falle aquí, con una prueba automática (E2E en Chrome y, si es del celular, en WebKit, el motor de Safari). Sin reproducirlo no se arregla: se arreglaría a ciegas.
3. **Proponer.** La causa y el arreglo en pocas líneas. Si cambia una pantalla, con captura y la skill `pantallas-panel`. Se programa con el visto bueno.
4. **Arreglar** en una rama propia (`arreglo-…` o `pulido-…`), con la prueba del paso 2 ahora en verde.
5. **Revisar:** lint, tipos, unitarias, E2E del módulo y `code-review`; `security-review` si toca contraseñas o permisos.
6. **PR** con el tipo en el título, CI en verde y merge con el visto bueno.
7. **Probarlo otra vez en el celular**, en pruebas, y marcarlo ✅ aquí.

## Errores (primero)

| Orden | # | Qué pasa | Causa (lo que se sabe) | Arreglo propuesto | Estado |
|---|---|---|---|---|---|
| 1 | 9 | Al reservar un mantenimiento, salir sin guardar y entrar a reservar otro, el formulario aparece lleno con los datos del anterior. Se arregla recargando | Los tres caminos usan la misma pantalla (Nueva reserva) y solo cambia la dirección: la app reutiliza el formulario que ya estaba en pantalla, con lo que se había llenado | El formulario empieza de cero cada vez que cambia lo que se reserva (mantenimiento, cotización o directa) | ✅ PR #242. La misma causa estaba en Nuevo cliente, Crear usuario, Nueva cotización y los modales abiertos de las fichas: `PaginaPanel` rearma todas las fichas y los formularios al volver a entrar |
| 2 | 7 | Al editar un vehículo con cambios, Cancelar o la X muestran "Tienes cambios sin guardar" y el modal se cierra al mismo tiempo | Hasta ahora, tocar afuera, Escape o Atrás preguntaban, y Cancelar y la X cerraban sin preguntar. En el iPhone, con el teclado abierto, un mismo toque llega dos veces (Cancelar y "tocar afuera", porque el modal baja al cerrarse el teclado) | Pasó una vez, en el iPhone, con el teclado abierto. Se decidió seguir la práctica de iOS y Android: con cambios, "Cancelar" y la X también preguntan ("Seguir editando" o "Descartar cambios") y el modal queda abierto hasta elegir; sin cambios, cierran directo | ✅ PR #243 |
| 3 | 2 | La duración estimada no se guarda al crear el servicio | Confirmado con el desarrollador: "Nuevo servicio" pedía solo el nombre (la duración nacía en 1 día) y abría "Precios de Única", con "Duración propia". Los días quedaban en la variante y la ficha mostraba los del servicio: dos duraciones que se pisan | "Nuevo servicio" pide nombre y duración; con una sola variante, los precios se llaman "Precios de {servicio}" y no hay "Duración propia"; con varias, sigue, con una ayuda clara; la ficha avisa si alguna tarda distinto; la migración 0049 pasa a su servicio la duración de las variantes únicas. Con esto, la regla de crear y sus nombres (`sistema-del-panel.md` §3b): "Nuevo …" para un registro principal y "Agregar …" para algo dentro de otra cosa | ✅ PR #244 |
| 4 | 4 | El reclamo se queda en "Recibimos tu reclamo"; en el panel, Reclamos no lo muestra hasta recargar | El sitio muestra la confirmación a propósito. El panel no se entera de lo que cambia otra persona | Decidido con el desarrollador: lo del sitio es una molestia de la prueba (un cliente casi nunca manda dos reclamos) y no se hace. El panel sí: al volver a la app después de más de un minuto (desde la última vez que trajo sus datos), la pantalla se pone al día sola (`ActualizarAlVolver`); nunca con cambios sin guardar ni con un modal, un menú o una lista abierta; sin conexión, espera a que vuelva | ✅ PR #245 |

## Mejoras chicas (pulido, dentro de lo contratado)

| Orden | # | Qué pasa | Propuesta | Estado |
|---|---|---|---|---|
| 5 | 1 | "Activo en el catálogo" (Catálogo) y "Mostrar u ocultar del sitio" (Sitio web) se pisan: un servicio inactivo tampoco sale en el sitio, y no se entiende | "Desactivar servicio" pasa al menú Más del Catálogo, con su confirmación ("Ya no se ofrece: no se cotiza, no se reserva y no sale en el sitio"). En Sitio web, si está inactivo, se dice y no se ofrece "Mostrar" | 🔵 "Desactivar servicio" pasó a "Más" de la ficha, con confirmación; inactivo, "Reactivar servicio" es la acción principal. Los datos ya no tienen la casilla |
| 6 | 3 | El servicio de mantenimiento puede ser el mismo servicio, pero no se reconoce en la lista ("Este mismo servicio") y no se explica cómo funciona | La opción dice su nombre ("Este mismo servicio (Cerámico)") y una línea explica: al entregar un vehículo con este servicio, en N meses le toca el elegido, y aparece en Mantenimientos | 🔵 La opción dice "Este mismo servicio ({nombre})" y la casilla explica: al entregar un vehículo con este servicio, se anota cuándo le toca y aparece en Mantenimientos |
| 7 | 5 | Al crear un usuario, al restablecer una contraseña y en "Cambiar mi contraseña", la contraseña nueva se escribe una sola vez | "Repite la contraseña" en los tres, con "No coinciden" junto al campo (el mismo esquema Zod en el formulario y el servidor) | 🔵 "Repite la contraseña" al crear un usuario, al restablecerla y en "Cambiar mi contraseña"; si no coinciden, el error va en la repetida y lo escrito no se pierde |
| 8 | 8 | En la cotización, el adelanto y la validez están plegados detrás de "Cambiar adelanto o validez" | Los dos campos siempre a la vista | 🔵 El adelanto y la validez, siempre a la vista en la cotización |
| 9 | 10 | Las tres formas de reservar (desde una cotización, directa y desde un mantenimiento) muestran las tarjetas en distinto orden | Un solo orden: Cliente y vehículo, Servicios, Fecha y espacio, Adelanto y nota. Lo que ya viene elegido, arriba como resumen, en el mismo lugar. Con capturas de las tres antes de programar | ⏳ |

## Función nueva (registro de cambios)

| # | Qué | Qué se hace | Estado |
|---|---|---|---|
| 6 | Una ficha de cada vehículo, con su historial (órdenes, cotizaciones, fotos y mantenimientos). Hoy los vehículos viven dentro de la ficha del cliente | Pedido 51 en `03-cierre-comercial/registro-de-cambios.md` y una cotización corta para el dueño. No se programa sin su aprobación | 📝 |

## Después

- **Separar clientes y vehículos** (pedido del desarrollador, 15/11): que los vehículos tengan su propia lista y su ficha, aparte de los clientes. Se analiza junto con el pedido 51 (la ficha del vehículo), al terminar estos hallazgos.

- La prueba en celulares sigue con el punto 7 de la lista (cada perfil de encargado) cuando estos estén unidos.
- Lo que no se pudo probar en Android de tamaño celular (solo hubo tablet) se prueba en la capacitación, con el celular del dueño.
