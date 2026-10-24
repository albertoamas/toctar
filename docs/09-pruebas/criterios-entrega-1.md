# Criterios de aceptación — Entrega 1 (Web)

- **Fuente:** `05-analisis/historias-de-usuario/historias.md` y las especificaciones de etapa en `08-desarrollo/etapas/`.
- **Uso:**
  - Es la lista con la que el dueño revisa y firma el acta de la entrega 1 (`actas-de-aceptacion/entrega-1.md`).
  - Se actualiza al cerrar cada historia.
  - En la demo del viernes 23 el dueño valida que los criterios son los correctos.
- **Estados:**
  - ✅ cumple y tiene prueba automática.
  - 🟢 cumple, revisado a mano.
  - ⏳ pendiente.
  - ⚠️ ajustado respecto de la historia original (el motivo está en la nota).

## Resumen

| Historia | Etapa | Estado |
|---|---|---|
| HU-01 Iniciar sesión | B1 | ✅ Terminada |
| HU-02 Gestionar usuarios y roles | B1 | ✅ Terminada (un criterio ajustado) |
| HU-03 Permisos del encargado | B1 | ✅ Terminada con los módulos que existen hoy; cada módulo nuevo suma su casilla (se verifica en su etapa) |
| HU-04 Datos del negocio | B2 | ✅ Terminada |
| HU-05 Parámetros del sistema | B2 | ✅ Terminada |
| HU-06 App instalable | B2 | ✅ Terminada (falta probar la instalación real con https, en A3) |
| HU-07 Servicios del sitio | B3 | ✅ Panel terminado; la página pública de cada servicio se hace en B4 (HU-11) |
| HU-08 Textos del sitio | B3 | ✅ Panel terminado; las páginas públicas se hacen en B4 (HU-10, HU-13, HU-14) |
| HU-09 Galería en el panel | B3 | ✅ Panel terminado; la galería pública se hace en B4 (HU-12) |
| HU-10 Portada | B4 | ✅ Terminada |
| HU-15 Botón de WhatsApp | B4 | ✅ Terminada |
| HU-11 Página de cada servicio | B4 | ✅ Terminada |
| HU-12 Galería pública | B4 | ✅ Terminada |
| HU-13 Nosotros y preguntas frecuentes | B4 | ✅ Terminada |
| HU-14 Contacto y mapa | B4 | ✅ Terminada |
| HU-16 Formulario de reclamo | B5 | ✅ Terminada |
| HU-17 Atender reclamos | B5 | ✅ Terminada |
| HU-18 Sitio preparado para Google | B5 | ✅ Terminada en el software; falta validar en Google con https (A3) y el Perfil de Empresa del dueño |

**Revisión manual de YankoSoft (14/10/2026):** B1 y B2 probadas a mano en el entorno local, con todos los roles, en escritorio y en vista de celular. Sin observaciones. Lo que falta revisar a mano es instalar la app en celulares reales, que necesita https (A3).

---

## HU-01 Iniciar sesión

> Como usuario del panel, quiero entrar con mi usuario y contraseña, para usar solo lo que me corresponde.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 1.1 | Con datos correctos, entro al panel y veo solo los módulos de mi rol | E2E `hu-01` "con datos correctos entra al panel…" y `hu-02` "el dueño crea un técnico…" (el técnico no ve Usuarios) | ✅ |
| 1.2 | Con datos incorrectos, veo un mensaje que no dice cuál de los dos falló | E2E `hu-01` "con contraseña incorrecta…" y "un usuario que no existe ve el mismo mensaje" | ✅ |
| 1.3 | Un usuario desactivado no puede entrar | E2E `hu-01` "un usuario desactivado no puede entrar…" | ✅ |
| 1.4 | La sesión vence tras un tiempo sin uso y puedo cerrarla cuando quiera | Vence a los **7 días sin uso** (configuración en `src/lib/auth.ts`, revisada). Cierre: E2E `hu-01` "cerrar sesión vuelve al ingreso…" | ✅ |
| 1.5 | El usuario se acepta sin importar mayúsculas | E2E `hu-01` "el usuario se acepta sin importar mayúsculas" | ✅ (agregado) |
| 1.6 | Quien prueba contraseñas queda frenado | 5 fallos en 15 minutos desde una conexión bloquean ese usuario en esa conexión (también 20 por conexión y 50 por usuario). E2E `seguridad` "tras 5 contraseñas incorrectas se bloquea el ingreso…" (desde otra conexión, el usuario sí entra). Unitarias `ingreso`. Prueba manual con 12 intentos simultáneos: nunca pasan más de 5 | ✅ (agregado en la revisión de seguridad) |

## HU-02 Gestionar usuarios y roles

> Como dueño, quiero crear usuarios con su rol, para que cada persona tenga su acceso.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 2.1 | Creo un usuario con nombre, usuario, contraseña inicial y rol (dueño, encargado o técnico) | E2E `hu-02` "el dueño crea un técnico (usuario con guion)…" (el creado ingresa); "un usuario repetido muestra un error claro"; "los errores del formulario se muestran junto a cada campo" | ✅ |
| 2.2 | Restablezco la contraseña de cualquier usuario | E2E `hu-02` "restablecer la contraseña: la anterior deja de servir y la nueva funciona". Además se cierran las sesiones abiertas con la contraseña anterior | ✅ |
| 2.3 | Desactivo un usuario sin borrar lo que registró | E2E `hu-02` "desactivar a alguien con la sesión abierta lo saca del panel". No existe ninguna acción de borrar (RN-14) | ✅ |
| 2.4 | ⚠️ **Ajustado:** nadie puede desactivarse a sí mismo, y el único dueño activo no puede quitarse el rol | E2E `hu-02` "el único dueño no puede desactivarse ni quitarse el rol"; unitarias `usuarios-reglas` | ✅ |

**Nota sobre 2.4.** La historia decía "no puedo desactivarme a mí mismo si soy el único dueño activo". La librería de autenticación no permite que nadie se desactive a sí mismo, en ningún caso. Es más seguro: siempre hay otra persona que lo hace. La regla del último dueño se mantiene para el cambio de rol. **El dueño confirma este ajuste en la demo.**

## HU-03 Permisos del encargado

> Como dueño, quiero elegir qué módulos ve el encargado, para darle acceso sin mostrarle todo.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 3.1 | Marco o desmarco módulos (clientes, consultas, agenda, órdenes, pagos, mantenimientos, sitio, reclamos) y el permiso "autorizar entrega con saldo" | E2E `hu-03` "el permiso del encargado se guarda y se borra al cambiarle el rol". Las casillas aparecen solo para el encargado. **Hoy existe "Autorizar entrega con saldo"**; cada módulo suma su casilla cuando existe su pantalla (Sitio web en B3, Reclamos en B5, el resto en la entrega 2), y su etapa lo prueba | ✅ con lo existente |
| 3.2 | El encargado nunca puede cotizar ni cambiar la configuración | Unitarias `permisos` "nunca ve cotizaciones, usuarios, configuración, catálogo, aunque tenga todos los permisos" | ✅ |
| 3.3 | El permiso se valida en el servidor: entrar por la URL de un módulo no habilitado muestra "sin acceso" | E2E `hu-03` "el encargado sin módulos solo ve el inicio y no entra a Usuarios" y `hu-02` (el técnico). Unitarias: matriz completa. Revisión del código: las 5 páginas y 5 acciones del panel verifican el acceso, y las 12 llamadas a la autenticación llevan la sesión (14/10) | ✅ |

## HU-04 Datos del negocio

> Como dueño, quiero editar los datos del negocio, para que el sitio y el PDF estén siempre al día.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 4.1 | Edito nombre, WhatsApp, correo, dirección, ubicación en el mapa, horarios, redes, NIT y razón social | E2E `hu-04` "el dueño cambia los datos y el pie del sitio los muestra al guardar" (vuelve a abrir la pantalla y los datos siguen ahí) | ✅ |
| 4.2 | Los cambios se ven en el sitio sin intervención de YankoSoft ni volver a desplegar | Mismo E2E: el pie del sitio muestra la dirección, el horario, el WhatsApp, "Cómo llegar" y la red cargada; las redes vacías no aparecen | ✅ |
| 4.3 | El WhatsApp se escribe como lo escribe la gente (con o sin +591, espacios o guiones) y se guarda en un solo formato | Unitarias `configuracion-negocio` "WhatsApp" (formatos válidos e inválidos) | ✅ |
| 4.4 | La ubicación se carga pegando las coordenadas o el enlace de Google Maps; si no se puede leer, el error explica cómo copiarlas | Unitarias "ubicación" (6 formatos, enlace corto, rangos). E2E "los datos mal escritos muestran el error junto al campo y no se guardan" | ✅ |
| 4.5 | Los horarios admiten días cerrados y hasta dos turnos; un turno al revés se marca en el día | Unitarias "horarios" y "esquema del negocio". Mismo E2E de errores | ✅ |
| 4.6 | El logo para los documentos se sube (PNG, JPG o WebP de hasta 5 MB) y se ve; un archivo que no es imagen se rechaza | E2E "el logo para documentos se sube y se ve…" (comprueba que el archivo guardado es WebP) | ⚠️ ✅ El logo del sitio y del panel es el de la marca (`public/marca/`); el que se sube aquí es el del PDF (especificación B2 §2) |
| 4.7 | Solo el dueño entra a la configuración | E2E "el encargado y el técnico no entran a la configuración"; unitarias `permisos` | ✅ |

## HU-05 Parámetros del sistema

> Como dueño, quiero cambiar los parámetros del negocio, para no depender de un programador cuando algo cambia.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 5.1 | Configuro espacios del taller y tamaños de vehículo: agregar, renombrar, ordenar, desactivar y reactivar (nunca se borran) | E2E `hu-05` "espacios del taller: agregar, renombrar, ordenar y desactivar…". Los tamaños usan la misma pantalla y las mismas acciones. Unitarias "listas del taller" | ✅ |
| 5.2 | Configuro adelanto sugerido, validez de la cotización, intervalo de mantenimiento, condiciones y garantía del PDF | E2E "el dueño cambia el adelanto y los textos del PDF, y quedan guardados" | ✅ |
| 5.3 | Ningún parámetro puede quedar vacío o negativo | Unitarias "parámetros: ninguno vacío ni negativo" (vacío, negativo, cero, decimales, fuera de rango). E2E "los parámetros vacíos o negativos muestran el error y no se guardan" | ✅ |
| 5.4 | No puede quedar sin espacios ni sin tamaños activos, ni con nombres repetidos | Mismo E2E de espacios (el último activo no se desactiva; "espacio 1" repetido se rechaza). Unitarias. Índice único en la base | ✅ |
| 5.5 | Cambiar un parámetro no altera cotizaciones ni reservas ya guardadas | Esta etapa solo guarda el valor vigente; las cotizaciones (C2) y reservas (C3) copian el valor al crearse y lo prueban en su etapa | ⏳ se verifica en C2 y C3 |
| 5.6 | Ningún valor del negocio fijo en el código (RNF-11) | Los valores iniciales entran por migración (`0005_datos_parametros`); si falta uno, el sistema avisa en vez de inventarlo (unitaria "si falta un parámetro…") | ✅ |

## HU-06 App instalable

> Como usuario del panel, quiero instalar el sistema en mi celular, para abrirlo como una app.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 6.1 | El sistema se puede instalar: tiene nombre, ícono de TocTar y abre en el panel como app | E2E `hu-06` "el manifiesto tiene nombre, abre en el panel como app y sus íconos existen" y "las páginas enlazan el manifiesto…" (incluye el ícono para iPhone) | ✅ |
| 6.2 | Se instala de verdad en Android (Chrome) y en iPhone (Safari, "Agregar a inicio") | A mano en el entorno de pruebas: la instalación exige https | ⏳ con A3 (dominio) |
| 6.3 | Sin conexión se muestra un aviso claro | E2E "sin internet, el panel muestra el aviso y una página nueva muestra «Sin conexión»": franja en el panel y página propia con "Reintentar" | ✅ |
| 6.4 | Sin modo sin conexión (acuerdo): no se guarda nada para usar sin internet | Revisión del código: el service worker (`public/sw.js`) solo guarda la página de aviso | ✅ |

## HU-07 Servicios del sitio

> Como dueño, quiero crear y editar los servicios que muestra el sitio, para mantenerlo al día.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 7.1 | Cada servicio tiene nombre, resumen, descripción, beneficios, pasos del proceso, foto principal y orden | E2E `hu-07` "el dueño crea el servicio en el catálogo y completa su página…" (vuelve a abrirlo y todo sigue ahí). Unitarias "esquema del servicio" (límites de cada campo) | ✅ ⚠️ Desde el 24/10 el servicio se crea y se nombra en Catálogo y precios, y nace oculto; su página se completa en Sitio web (C5 §0) |
| 7.2 | La foto principal es opcional; sin foto, el sitio muestra una imagen de reemplazo | E2E "la foto principal se sube y se ve…" (sube, ve la miniatura, la quita). La imagen de reemplazo en el sitio se prueba en B4 | ✅ en el panel · ⏳ sitio (B4) |
| 7.3 | Puedo ocultar un servicio sin borrarlo | Mismo E2E de alta: queda "Oculto" en la lista y se puede volver a mostrar | ✅ |
| 7.4 | El servicio del sitio es el mismo registro que el del catálogo de la entrega 2 | Una sola tabla `servicio`, con variantes (D-2) ya creadas; C1 le suma precios y duración | ✅ (revisión del diseño) |
| 7.5 | Nombres y direcciones no se repiten; la dirección es legible para Google | E2E "una dirección repetida da error junto al campo" y el nombre repetido del E2E de alta. Unitarias "dirección de la página (slug)" | ✅ |
| 7.6 | Entra el dueño o un encargado con el permiso "Sitio web"; nadie más | E2E "el encargado con el permiso Sitio web entra; sin el permiso o como técnico, no" | ✅ ⚠️ El encargado edita las páginas; crear servicios es del dueño, porque llevan precios (C5 §0) |

## HU-08 Textos del sitio

> Como dueño, quiero editar los textos de portada, nosotros, preguntas frecuentes y contacto.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 8.1 | Edito el lema y la presentación de la portada, el texto de nosotros y el de contacto | E2E `hu-08` "el dueño edita la portada y los motivos de Nosotros, y quedan guardados". Nosotros incluye historia, cómo trabajamos y por qué elegirnos (RF-02) | ✅ |
| 8.2 | Ningún texto queda vacío | E2E "un texto vacío da error junto al campo y no se guarda". Unitarias "textos de las páginas" | ✅ |
| 8.3 | Puedo agregar, ordenar y quitar preguntas frecuentes | E2E "preguntas frecuentes: agregar, editar, ordenar, ocultar y eliminar" (eliminar pide confirmación; también se pueden ocultar sin borrar) | ✅ |
| 8.4 | Los textos iniciales están cargados para que el dueño los corrija | Migración `0009_datos_contenido`: borradores con su historia, su garantía y la entrevista, sin precios | ✅ (los valida el dueño en la demo) |
| 8.5 | Subo, cambio o quito la foto del taller de la portada; sin foto se ve el arte de la marca | E2E `hu-08` "la foto del taller va detrás del lema de la portada; sin foto vuelve el arte" | ✅ (agregado en el pulido 2.1; falta la foto propia del taller) |

## HU-09 Galería en el panel

> Como dueño, quiero subir fotos de antes y después, para mostrar el trabajo.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 9.1 | Subo un par antes y después, o una foto sola, la asocio a un servicio y le pongo una descripción corta | E2E `hu-09` "sube un par antes y después y una foto sola…" y "sin servicio ni descripción no se sube" | ✅ |
| 9.2 | Las fotos se comprimen al subirlas | Se achican en el celular antes de enviar (2400 px, JPEG) y el servidor guarda WebP de 1600 px más una miniatura de 640 px (mismo E2E: la miniatura es `-640.webp`) | ✅ |
| 9.3 | Puedo ordenar y ocultar fotos | Mismo E2E: sube una foto, la oculta y filtra por servicio. También se edita la descripción o el servicio | ✅ |
| 9.4 | Eliminar una foto la borra también del almacenamiento | Mismo E2E: después de eliminar, la dirección de la foto da 404 | ✅ |

## HU-10 Portada

> Como visitante, quiero ver de un vistazo qué hace TocTar, para decidir si escribir.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 10.1 | Muestra lema, imagen principal, servicios destacados y algunas fotos de la galería | E2E `hu-10` "la portada muestra el lema, los servicios y el botón de WhatsApp". La imagen principal es el arte de la marca hasta tener una foto propia del taller (decisión abierta de B4). Las fotos de la galería aparecen cuando hay fotos visibles | ⚠️ ✅ |
| 10.2 | El botón principal abre WhatsApp | Mismo E2E: abre `wa.me` con el número cargado en el panel | ✅ |
| 10.3 | Carga rápido en el celular (RNF-02) | Lighthouse móvil (14/10): portada 91 de rendimiento, 100 de accesibilidad y 100 de SEO | ✅ |
| 10.4 | Sin precios (RN-10) y servicios sin foto con la imagen de reemplazo | E2E "los servicios sin foto muestran la imagen de reemplazo y ninguna página pública muestra precios" | ✅ |
| 10.5 | Un cambio en el panel se ve sin volver a desplegar | E2E "ocultar un servicio en el panel lo saca del sitio sin volver a desplegar" | ✅ |

## HU-15 Botón de WhatsApp

> Como visitante, quiero escribir por WhatsApp desde cualquier página, para consultar sin buscar el número.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 15.1 | El botón se ve en todas las páginas | E2E `hu-13-14` "ninguna página pública muestra precios y todas tienen el botón de WhatsApp" (las 7 páginas) | ✅ |
| 15.2 | En la página de un servicio, el mensaje empieza con ese servicio escrito | E2E `hu-11` "la página de un servicio muestra el proceso y abre WhatsApp con ese servicio escrito" (botón del cierre y botón fijo). Unitaria "mensaje de WhatsApp del sitio" | ✅ |
| 15.3 | Usa el número configurado en los datos del negocio | E2E `hu-10`: el enlace usa el número cargado por el panel. Sin número cargado, el botón no aparece y el principal lleva a Contacto | ✅ |

## HU-11 Página de cada servicio

> Como visitante, quiero entender un servicio antes de preguntar, para saber si es lo que necesito.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 11.1 | Muestra descripción, beneficios, proceso paso a paso, variantes y fotos de ese servicio | E2E `hu-11` "la página de un servicio muestra el proceso…" y "las variantes se muestran sin precio". Las secciones vacías no se muestran; un servicio sin opciones (variante "Única") no muestra "Opciones" | ✅ |
| 11.2 | No muestra precios (RN-10) | Mismos E2E: la página no contiene "Bs" | ✅ |
| 11.3 | Termina con una invitación a escribir por WhatsApp sobre ese servicio | Mismo E2E: "Consultar por este servicio" abre el chat con el servicio escrito | ✅ |
| 11.4 | Un servicio oculto no tiene página | E2E "un servicio oculto o inexistente muestra la página no encontrada" | ✅ |
| 11.5 | Título y descripción propios para Google y WhatsApp (RF-09) | Mismo E2E: título "<servicio> · TocTar Detailing"; la descripción es el resumen | ✅ |

## HU-12 Galería pública

> Como visitante, quiero ver trabajos reales, para confiar en el resultado.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 12.1 | Muestra los pares antes y después visibles, filtrables por servicio | E2E `hu-12` "la galería muestra las fotos visibles, se filtra por servicio y se amplían". El filtro son enlaces (`?servicio=`) y funciona sin JavaScript. Unitarias "filtro de la galería" | ✅ |
| 12.2 | Las fotos se ven bien en el celular y se pueden ampliar | Mismo E2E: el visor muestra el antes y el después en grande; se cierra con Escape o con la X. Revisión visual en celular | ✅ ⚠️ Desde el 24/10, el antes y el después van en una sola foto partida por una línea que se arrastra (con el dedo, el mouse o las flechas); el E2E lo prueba |
| 12.3 | Solo se ven fotos visibles de servicios visibles | Consulta `galeriaPublica()`; las fotos ocultas del panel (HU-09) no aparecen | ✅ |

## HU-13 Nosotros y preguntas frecuentes

> Como visitante, quiero conocer al negocio y resolver dudas comunes, para no tener que preguntar todo.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 13.1 | "Nosotros" muestra el texto cargado en el panel | E2E `hu-13-14` "Nosotros muestra la historia, cómo trabajan y por qué elegirlos" | ✅ |
| 13.2 | Las preguntas frecuentes se abren y cierran una por una | E2E "las preguntas frecuentes se abren y se cierran una por una" (`<details>`, funciona sin JavaScript) | ✅ |

## HU-14 Contacto y mapa

> Como visitante, quiero saber dónde está el taller y cuándo atiende, para ir o escribir.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 14.1 | Muestra dirección, mapa de Google Maps, horarios, WhatsApp, correo y redes | E2E "Contacto muestra la dirección con el mapa, el horario y el WhatsApp". El mapa embebido aparece cuando hay ubicación cargada (HU-04) y se carga diferido | ✅ |
| 14.2 | Tocar la dirección en el celular abre la app de mapas | La dirección y "Cómo llegar" enlazan a Google Maps (mismo E2E); en el celular, el sistema abre la app | ✅ (probar en el celular en la demo) |

## HU-16 Formulario de reclamo

> Como cliente, quiero dejar un reclamo o pedido de garantía, para que TocTar lo atienda.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 16.1 | Pide nombre, WhatsApp, placa, servicio, fecha aproximada, descripción y hasta 3 fotos | E2E `hu-16` "se envía un reclamo con fotos y se ve la confirmación" (2 fotos, se guardan las 2). Las fotos se achican en el navegador antes de subir. Unitarias "placa" y "esquema del reclamo" | ✅ |
| 16.2 | Los obligatorios se validan antes de enviar | E2E "los obligatorios vacíos muestran su error" (el error queda junto a cada campo). La fecha no puede ser futura (unitaria) | ✅ |
| 16.3 | Al enviar se ve una confirmación y el reclamo queda pendiente | Mismo E2E del 16.1: "Recibimos tu reclamo" y el reclamo guardado en la base. Que aparezca pendiente en el panel: E2E `hu-17` | ✅ |
| 16.4 | Protección contra envíos automáticos | Unitarias "protección contra spam" (trampa, menos de 3 segundos, 5 por hora). E2E "con la trampa llena se ve la confirmación pero no se guarda" | ✅ |
| 16.5 | Se llega desde el pie y desde Contacto | E2E "el pie y la página de contacto llevan a garantía y reclamos" | ✅ |

## HU-17 Atender reclamos

> Como dueño o encargado con el módulo de reclamos, quiero ver los reclamos recibidos, para responderlos a tiempo.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 17.1 | Veo la lista con los pendientes primero | E2E `hu-17` "el dueño ve el reclamo pendiente…": el reclamo dejado en el sitio aparece en el inicio ("Reclamos pendientes: N") y en el filtro Pendientes. La consulta ordena pendientes primero y los más nuevos arriba | ✅ |
| 17.2 | Abro uno, veo sus datos y fotos, y lo marco como atendido con una nota | Mismo E2E: datos, 2 fotos que se amplían, la nota es obligatoria, el aviso "Reclamo marcado como atendido." y la nota con quién y cuándo. Unitaria "marcar como atendido" | ✅ |
| 17.3 | Desde el reclamo abro WhatsApp con ese cliente | Mismo E2E: el enlace va a `wa.me/591…` con el saludo y la fecha del reclamo. Unitaria "mensaje de WhatsApp al cliente" | ✅ |
| 17.4 | Solo el dueño y el encargado con el módulo | E2E "el encargado entra a reclamos solo con el permiso; el técnico nunca" (va a "sin acceso" aunque escriba la dirección). Unitarias `permisos` | ✅ |

## HU-18 Sitio preparado para Google

> Como dueño, quiero que TocTar aparezca al buscar en Tarija, para recibir clientes nuevos.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 18.1 | Cada página tiene título y descripción propios; las URL son legibles | Metadatos de cada página del sitio; los servicios usan su nombre y resumen (`/servicios/<slug>`) | ✅ |
| 18.2 | El sitio publica `sitemap.xml` y datos de negocio local | E2E `hu-18` "el sitemap lista las páginas y los servicios visibles, no los ocultos" y "la portada lleva los datos de negocio local…". Unitarias `negocio-local` (horarios, redes, datos que faltan, JSON seguro) | ✅ (falta la prueba de resultados enriquecidos de Google, con https, en A3) |
| 18.3 | El panel no se indexa (RNF-12) | E2E `base` (`noindex`) y `hu-18` "robots.txt deja fuera el panel, el ingreso y la API". El entorno de pruebas entero no se indexa (`SITIO_INDEXABLE=false`) | ✅ |
| 18.4 | Fuera del software: alta del Perfil de Empresa en Google Maps | Guía `docs/10-lanzamiento/perfil-de-google.md`; la hace el dueño con YankoSoft | ⏳ (después de publicar) |

## Requisitos no funcionales que se revisan en esta entrega

| Requisito | Cómo se comprueba | Estado |
|---|---|---|
| RNF-01 Celular desde 360 px y computadora | Todas las pruebas E2E corren en celular (Pixel 7) y en escritorio; revisión visual en cada etapa | 🟢 al día |
| RNF-02 Sitio rápido en 4G (Lighthouse ≥ 90) | Lighthouse móvil local (14/10): portada, servicio, galería, nosotros y contacto con 91 de rendimiento. Se repite en el entorno de pruebas (A3) | ✅ (local) |
| RNF-03 Instalable; aviso claro sin conexión | E2E `hu-06`; instalación real con https en A3 | ✅ (falta la prueba en el celular) |
| RNF-04 https, contraseñas con hash, sesión que vence | Hash scrypt de Better Auth; sesión de 7 días; límite de intentos de ingreso (1.6); encabezados de seguridad, incluido HSTS (E2E `seguridad`); https en el entorno de pruebas (A3) | 🟢 parcial (falta https, A3) |
| RNF-05 Permisos validados en el servidor | Unitarias `permisos` (matriz completa) y E2E de acceso por URL | ✅ |
| RNF-12 El panel no aparece en buscadores | E2E `base` "el panel y el ingreso no se indexan en Google" | ✅ |
| RNF-14 Texto alternativo y contraste legible | Contrastes de la identidad verificados (54 pares); Lighthouse móvil: 100 de accesibilidad en todas las páginas medidas (14/10) | ✅ |

## Errores encontrados y corregidos durante el desarrollo

| Fecha | Historia | Error | Corrección | Prueba que lo cubre |
|---|---|---|---|---|
| 14/10/2026 | HU-02 | Un usuario con guion en el nombre (por ejemplo, `ana-maria`) se creaba bien, pero no podía ingresar: la librería de autenticación validaba con un patrón distinto al del formulario | Un solo patrón compartido (`PATRON_NOMBRE_USUARIO`) | Unitaria `usuarios` "todo usuario que acepta el formulario también puede ingresar"; E2E con `tecnico-c` |
| 14/10/2026 | Identidad | Los logos se veían borrosos en la pantalla de ingreso y en el encabezado: a ese tamaño el lema dibujado quedaba de 2 a 5 px | Versiones sin lema para tamaños chicos y el lema como texto; vertical retrazado desde el PDF (PR #9) | Revisión visual en monitor común y celular |
| 14/10/2026 | HU-02 | Al desactivar o reactivar no aparecía el aviso de confirmación | El aviso se muestra desde la acción, no desde la pantalla que se reemplaza | E2E "desactivar a alguien…" (espera el aviso) |
| 14/10/2026 | Entorno local | El nombre del dueño de prueba salía "Due�o": el archivo `.env` estaba guardado en Latin-1 y no en UTF-8 | `.env` pasado a UTF-8 y nombre corregido en la base local. No afecta a pruebas ni a producción, que no usan ese archivo | — (aviso en `.env.example`) |
| 14/10/2026 | HU-04 | Si se elegía el logo apenas abría la pantalla (antes de que terminara de cargar), no se subía y no avisaba nada | El botón "Subir logo" se habilita recién cuando la pantalla está lista | E2E "el logo para documentos…" (espera el botón habilitado) |
| 14/10/2026 | Panel | En el celular, al tocar una opción del menú, el menú lateral quedaba abierto tapando la pantalla nueva | El menú se cierra al tocar un enlace | E2E `hu-07` en celular (navega desde el menú) |
| 14/10/2026 | Panel | En el celular, la barra fija de "Guardar cambios" al pie de los formularios tapaba botones que quedaban justo encima (por ejemplo, "Agregar beneficio") | Se quitó la barra fija: el botón queda al final del formulario | E2E `hu-07` en celular |
| 14/10/2026 | HU-07 | Al crear un servicio, la pantalla de alta queda oculta en la página y su campo "Nombre" tenía el mismo id que el de la edición | Los campos del alta tienen id propios | E2E `hu-07` (el campo se encuentra por su nombre exacto) |
| 14/10/2026 | HU-14 | La página de Contacto "saltaba" al cargar los datos (Lighthouse: CLS 0,19, rendimiento 82) | El espacio reservado mientras cargan los datos ocupa una pantalla: el pie no aparece y luego se corre | Lighthouse: CLS 0, rendimiento 91 |
| 15/10/2026 | Identidad | El botón "Escribir por WhatsApp" se veía con ruido en el corte y algo borroso, sobre todo en pantallas al 125 % | Corte a 60° con degradado en vez de `clip-path` (botón y tarjetas); interlineados en píxeles enteros en la cabecera de la portada y del servicio. El logo del encabezado se deja como estaba (ver `06-diseno/identidad-visual.md`) | Revisión visual con capturas ampliadas al 100, 125, 150 y 200 % (detalle en `06-diseno/identidad-visual.md`) |
| 15/10/2026 | HU-10 | Al cargar la portada, la línea LED se encendía antes de que llegara el lema y, a mitad del efecto, el texto la empujaba hacia abajo (40 px en computadora, 108 px en el celular) | La línea llega junto con el texto y se enciende una sola vez en su lugar; el espacio reservado mientras carga tiene el alto del texto | Medición de la posición de la línea cuadro a cuadro con red 4G simulada; Lighthouse: CLS 0, rendimiento 92 |
| 15/10/2026 | HU-16 | Quien enviaba el formulario vacío en menos de 3 segundos veía "Recibimos tu reclamo" sin que se guardara nada: el control de tiempo contra robots iba antes que la validación | Primero se validan los campos y después el tiempo mínimo; con la trampa llena no se muestran errores | E2E "los obligatorios vacíos muestran su error" (envía al instante) |
| 15/10/2026 | HU-16 | El límite de 5 reclamos por hora tomaba la IP del primer valor de `x-forwarded-for`, que el visitante puede inventar para saltarse el límite | Se usa `x-real-ip` o el último valor de esa lista, que pone el proxy del servidor | Revisión de código |
| 15/10/2026 | HU-16 | Varios envíos al mismo tiempo desde la misma conexión podían pasar juntos el límite de 5 por hora: se contaba y después se guardaba | Se vuelve a contar dentro de la transacción, con un candado de PostgreSQL por conexión; si se pasó, se borran las fotos ya subidas | Revisión de seguridad del código; prueba manual con 8 envíos simultáneos |
| 16/10/2026 | HU-01 | **El ingreso no limitaba los intentos de contraseña**: 12 contraseñas incorrectas seguidas, 12 respuestas normales. El límite de Better Auth solo cubre los pedidos por HTTP y el panel ingresa desde una acción del servidor | Límite propio en una tabla (`intento_ingreso`): se anota el intento antes de probar la contraseña y se cuenta después, sin candados ni transacciones abiertas (una primera versión con candado podía agotar las conexiones de la base: lo marcó la revisión automática) | E2E `seguridad`; unitarias `ingreso`; prueba manual con 12 intentos simultáneos y 15 ingresos a la vez |
| 16/10/2026 | HU-01, HU-02 | La API HTTP de Better Auth (`/api/auth`) dejaba averiguar qué usuarios existen y que cada usuario se cambiara el nombre de usuario | Se quitó la ruta: la app usa Better Auth solo desde el servidor | E2E `seguridad` "la API de Better Auth no está expuesta…" |
| 16/10/2026 | Todas | Faltaban encabezados de seguridad: el panel y el ingreso se podían meter dentro de otra página (clickjacking) | `X-Frame-Options`, política de contenido con `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, HSTS y `Permissions-Policy`; sin `X-Powered-By` | E2E `seguridad` "las páginas llevan los encabezados de seguridad" |
| 16/10/2026 | HU-16 | Una imagen chica en bytes podía declarar dimensiones enormes y agotar la memoria del servidor (el formulario de reclamos es público) | Límite de 70 megapíxeles; la foto se decodifica una sola vez | Unitarias `imagen` (justo por encima del límite se rechaza) |
| 16/10/2026 | HU-16, HU-17 | Las fotos de los reclamos (datos de clientes) quedaban en el bucket público | Bucket privado; el panel las muestra con enlaces firmados que vencen a los 15 minutos | E2E `hu-17` (con firma se ve; sin firma, 403) |
| 16/10/2026 | HU-04 | Al cambiar el logo, el anterior quedaba guardado para siempre en el almacenamiento | Se borra al subir el nuevo | E2E `hu-04` "el logo para documentos…" (el anterior da 404) |
| 16/10/2026 | HU-07 a HU-09 | Acciones del sitio que reciben datos sueltos (mover, mostrar u ocultar, eliminar) no los validaban: un valor raro terminaba en error 500 | Esquemas de Zod para cada una | Unitarias `sitio-servicios` "datos sueltos de las acciones" |
| 16/10/2026 | HU-07 | Un error al quitar la foto de un servicio se mostraba como aviso de éxito | Una sola regla para los avisos del panel (`src/componentes/panel/avisos.ts`) | Revisión de código |
| 16/10/2026 | HU-02 | Al crear un usuario, cualquier error de Better Auth decía "Ese usuario ya existe" | Se reconoce por el código del error | E2E `hu-02` (usuario repetido) |
| 16/10/2026 | HU-18 | Las descripciones para Google de la portada, Servicios y Galería nombraban servicios concretos: si el dueño agregaba o quitaba uno, quedaban desactualizadas | Redactadas sin nombrar servicios. Se probó generarlas con los datos del panel, pero así Next.js las saca del `<head>` (las transmite al final) y Lighthouse bajó de 100 a 92 en SEO: se descartó | Lighthouse móvil con SEO 100 en portada, Servicios y Galería |
| 16/10/2026 | HU-10 a HU-14 | En el celular, el menú del sitio quedaba abierto al elegir una página, tapando la nueva; su botón medía 32 px | Menú desplegable común que se cierra al tocar un enlace, con botones de 44 px (pulido 1.1) | E2E `base` "el menú marca la página actual y, en el celular, se cierra al elegir una página" |
| 16/10/2026 | Desarrollo | Desde el celular por la red local (`192.168.x.x`), nada interactivo del sitio funcionaba: `next dev` solo le entrega el JavaScript a `localhost` | `allowedDevOrigins` para la red local, solo en desarrollo | Prueba con un iPhone simulado entrando por la IP de la red local |
| 16/10/2026 | HU-10 a HU-14 | Los enlaces del pie medían de 18 a 20 px de alto | Áreas táctiles de 44 px (pulido 1.2) | E2E `base` "los enlaces del pie tienen 44 px para el dedo" |
| 18/10/2026 | HU-15, HU-16 | Se veían dos botones de WhatsApp a la vez, y en Garantía y reclamos el botón fijo tapaba el selector del formulario | El fijo se esconde mientras el principal está a la vista y no va en Garantía (pulido 1.3) | E2E `base` "el botón fijo de WhatsApp se esconde…" y `hu-13-14` |
| 18/10/2026 | Panel | En el celular, las pantallas con pestañas (Sitio web y Configuración) se salían por la derecha: 420 px en una pantalla de 360 | `min-w-0` en la columna del contenido del panel (pulido 1.4) | E2E `base` "el panel no se sale de la pantalla en el celular…" |
| 18/10/2026 | Panel | En el celular, los avisos aparecían abajo y tapaban "Guardar cambios"; el de error se veía igual que el de éxito | Avisos arriba; error con borde e ícono rojos y más tiempo (pulido 1.5) | E2E `base` "el aviso de guardado no tapa el botón de guardar" |
| 18/10/2026 | HU-10 | Al cargar la portada, el texto no ocupaba el alto reservado: con el texto actual lo de abajo bajaba 24 px a 360 de ancho, y con una presentación corta subía 88 | El bloque tiene el mismo alto mínimo cargando y cargado (pulido 2.1) | Medición del alto cargando y cargado a 360, 412 y 1280 px: diferencia 0 |
| 18/10/2026 | HU-10, HU-15 | En el cierre de la portada se veían dos botones de WhatsApp | El del cierre pasa a ser el principal (pulido 2.1) | E2E `hu-10` "al llegar al cierre de la portada se ve un solo botón de WhatsApp" |
| 18/10/2026 | HU-10 | Al recargar la portada, los títulos "Servicios" y el del cierre aparecían antes que su contenido, y el logo del encabezado llegaba último | Toda la portada aparece de una vez; el logo va dentro de la página (pulido 2.1) | E2E `hu-10` "al recargar, los títulos de la portada no aparecen antes que su contenido" y grabación cuadro a cuadro con red lenta |
| 18/10/2026 | HU-11 | En Servicios, con el teclado, el marco del foco rodeaba solo "Ver el servicio" y no la tarjeta, que es lo que se abre | El marco rodea toda la tarjeta (pulido 2.2) | E2E `hu-11` "con el teclado se enmarca toda la tarjeta del servicio" |
| 18/10/2026 | HU-11 | En la página de un servicio, en el celular, el enlace para volver a Servicios quedaba debajo de la foto y medía 20 px de alto | Va primero y mide 44 px (pulido 2.3) | E2E `hu-11` "en la página de un servicio, volver a Servicios es lo primero y se toca con el dedo" |
| 18/10/2026 | HU-12 | En el celular, el visor de la galería mostraba el antes a pantalla completa y había que bajar para ver el después | El antes y el después entran juntos en la pantalla (pulido 2.4) | E2E `hu-12` "la galería muestra las fotos visibles…" (las dos fotos a la vista) |
| 18/10/2026 | HU-12, panel | El botón de cerrar de los diálogos medía unos 28 px y los lectores de pantalla lo anunciaban como "Close" | 44 px y "Cerrar" en el componente común (pulido 2.4) | E2E `hu-12` (cerrar de 44 px por su nombre "Cerrar") |
| 18/10/2026 | HU-14 | En Contacto, "Cómo llegar" y "Garantía y reclamos" medían 20 px de alto y el correo 24; en el celular el mapa quedaba al final de la página | Área táctil de 44 px y el mapa debajo de la dirección (pulido 2.7) | E2E `hu-13-14` "en Contacto el mapa va junto a la dirección y los enlaces sueltos tienen 44 px para el dedo" |
| 18/10/2026 | HU-16 | En el formulario de garantía, al enviar con errores el foco no iba a ningún campo, y al enviar bien la confirmación quedaba tapada por el encabezado en el celular | El foco va al primer error; la pantalla y el foco van a la confirmación (pulido 2.8) | E2E `hu-16` "los obligatorios vacíos muestran su error" y "se envía un reclamo con fotos y se ve la confirmación" |
| 18/10/2026 | HU-16 | Los campos del formulario de garantía medían 32 px de alto y el botón para quitar una foto 28 × 28 | 44 px (pulido 2.8) | E2E `hu-16` "se envía un reclamo con fotos…" |
| 18/10/2026 | HU-16 | En Windows, la lista del campo "Servicio" se abría blanca con el texto blanco y no se leía (lo vio YankoSoft) | Las opciones con fondo y tinta del tema en el selector común (pulido 2.8) | E2E `hu-16` "las opciones de la lista de servicios se leen sobre el fondo oscuro" |
| 18/10/2026 | HU-10 | Una dirección que no existe mostraba la página no encontrada sin encabezado ni pie (sin menú ni contacto) | La misma página dentro del marco del sitio (pulido 2.9) | E2E `hu-10` "una dirección que no existe muestra la página no encontrada" |
| 19/10/2026 | HU-01 | En el ingreso, los campos y el botón medían 32 px de alto, y tras un error el foco no volvía a la contraseña | 44 px; el foco va a la contraseña y el error queda vinculado a los campos (pulido 3.1) | E2E `hu-01` "tras un error el foco va a la contraseña…" |
| 19/10/2026 | HU-07 | En Nuevo servicio, al enviar con errores el foco no iba al campo con error, y el enlace "‹ Servicios" (igual en otras 6 pantallas) medía 20 px de alto | El foco va al primer campo con error; el enlace para volver mide 44 px en todas (pulido 4.3) | E2E `base` "al enviar con errores el foco va al campo, y el enlace para volver mide 44 px" |
| 19/10/2026 | HU-07 | En Editar servicio, en el celular los campos de Beneficios y Pasos medían 160 px de ancho (el texto se cortaba), y una fila con error no recibía el foco ni se marcaba | Los botones de la fila van debajo de los campos en el celular; la fila con error se marca y recibe el foco (pulido 4.4) | E2E `base` "en Editar servicio una fila vacía recibe el foco con su error…" |
| 19/10/2026 | HU-08 | En Textos del sitio, en el celular los motivos de "Por qué elegirnos" se cortaban en un renglón, y un motivo con error no recibía el foco ni se marcaba | Los motivos (y los beneficios de un servicio) crecen hasta mostrarse enteros; el motivo con error se marca y recibe el foco (pulido 4.5) | E2E `base` "en Textos del sitio un motivo largo se lee entero…" |
| 19/10/2026 | HU-08 | En Preguntas frecuentes, tras un error el foco quedaba en la página, y "Agregar pregunta" quedaba al final de la lista, fuera de la pantalla con muchas preguntas | El foco va al primer error; "Agregar pregunta" va arriba (pulido 4.6) | E2E `base` "en Preguntas, Agregar va arriba y en rojo…" |
| 19/10/2026 | HU-09 | En la Galería del panel, en el celular editar una foto no cabía en la tarjeta ("Cancelar" quedaba fuera), los íconos iban en dos renglones, y sin la foto de "Después" el error salía recién en un segundo intento | Una foto por renglón en el celular; todos los errores juntos y el foco en el primero (pulido 4.7) | E2E `base` "en la Galería del panel, subir sin nada…" y `hu-09` |
| 19/10/2026 | HU-17 | En la lista de reclamos, en la tabla solo el nombre (18 px de alto) abría el reclamo; en las tarjetas del celular los datos se partían | Toda la fila abre el reclamo; la tarjeta muestra el servicio y no parte los datos (pulido 5.1) | E2E `hu-17` "el dueño ve el reclamo pendiente…" |
| 19/10/2026 | HU-17 | En el detalle de un reclamo, al marcarlo como atendido sin nota el foco no iba al campo | El foco va a "Qué se hizo" (pulido 5.2) | E2E `hu-17` "el dueño ve el reclamo pendiente…" |
| 19/10/2026 | HU-02 | En la lista de usuarios, en la tabla solo el nombre (18 px de alto) abría el usuario; en las tarjetas del celular el rol se partía y faltaba "(tú)" | Toda la fila abre el usuario; la tarjeta muestra "(tú)" y no parte los datos (pulido 5.3) | E2E `hu-02` "la lista de usuarios…" |
| 19/10/2026 | HU-02 | En Crear y Editar usuario, tras enviar con errores el foco quedaba en la página | El foco va al primer campo con error (pulido 5.4) | E2E `hu-02` "los errores del formulario se muestran junto a cada campo" |
| 19/10/2026 | HU-02 | En Editar usuario, el foco se perdía al abrir o cancelar la confirmación de desactivar, y en el diálogo de contraseña no iba al error | El foco va a la confirmación, vuelve al botón al cancelar y va al campo con error (pulido 5.5) | E2E `hu-02` "restablecer la contraseña…" y "desactivar a alguien…" |
| 19/10/2026 | HU-02, HU-07 | "Volver al inicio" (sin acceso), "Agregar servicio" y "Agregar usuario" llevan a otra pantalla pero el lector de pantalla los anunciaba como botones | Son enlaces con forma de botón (pulido 5.6) | E2E `hu-02`, `hu-07` y `base` (los buscan como enlaces) |
| 19/10/2026 | HU-04 | En Configuración, a 360 px el formulario se salía 15 px por la derecha y quedaba recortado (las horas del horario tenían ancho fijo); el cuadro de cada día medía 32 px con pantalla táctil | Las horas se achican; el cuadro mide 44 px; el foco va al primer error (pulido 6.1) | E2E `hu-04` "a 360 px ningún campo…" y "los datos mal escritos…" |
| 19/10/2026 | HU-05, HU-07 | En las listas de espacios, tamaños y variantes, en el celular cada fila ocupaba dos renglones aun con nombres cortos, y al agregar sin nombre el foco no volvía al campo | Cada fila en un renglón ("Desactivar" pasa a la edición); el foco va al error (pulido 6.2) | E2E `hu-05` "espacios del taller…" |
| 19/10/2026 | HU-05 | En Cotizaciones y mantenimiento, tras un error el foco quedaba en la página, y el campo del adelanto no quedaba alineado con los otros ("Bs" antes del número) | El foco va al primer error; la unidad va siempre después (pulido 6.3) | E2E `hu-05` |
