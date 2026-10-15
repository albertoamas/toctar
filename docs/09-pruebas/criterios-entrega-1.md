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
| HU-07 a HU-09 | B3 | ⏳ |
| HU-10 a HU-15 | B4 | ⏳ |
| HU-16 a HU-18 | B5 | ⏳ |

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

## HU-07 a HU-18

Se completan al cerrar cada etapa, con los criterios de `historias.md` y los de su especificación.

## Requisitos no funcionales que se revisan en esta entrega

| Requisito | Cómo se comprueba | Estado |
|---|---|---|
| RNF-01 Celular desde 360 px y computadora | Todas las pruebas E2E corren en celular (Pixel 7) y en escritorio; revisión visual en cada etapa | 🟢 al día |
| RNF-02 Sitio rápido en 4G (Lighthouse ≥ 90) | Medición en B4 | ⏳ |
| RNF-03 Instalable; aviso claro sin conexión | E2E `hu-06`; instalación real con https en A3 | ✅ (falta la prueba en el celular) |
| RNF-04 https, contraseñas con hash, sesión que vence | Hash scrypt de Better Auth; sesión de 7 días; https en el entorno de pruebas (A3) | 🟢 parcial |
| RNF-05 Permisos validados en el servidor | Unitarias `permisos` (matriz completa) y E2E de acceso por URL | ✅ |
| RNF-12 El panel no aparece en buscadores | E2E `base` "el panel y el ingreso no se indexan en Google" | ✅ |
| RNF-14 Texto alternativo y contraste legible | Contrastes de la identidad verificados (54 pares); Lighthouse en B4 | 🟢 parcial |

## Errores encontrados y corregidos durante el desarrollo

| Fecha | Historia | Error | Corrección | Prueba que lo cubre |
|---|---|---|---|---|
| 14/10/2026 | HU-02 | Un usuario con guion en el nombre (por ejemplo, `ana-maria`) se creaba bien, pero no podía ingresar: la librería de autenticación validaba con un patrón distinto al del formulario | Un solo patrón compartido (`PATRON_NOMBRE_USUARIO`) | Unitaria `usuarios` "todo usuario que acepta el formulario también puede ingresar"; E2E con `tecnico-c` |
| 14/10/2026 | Identidad | Los logos se veían borrosos en la pantalla de ingreso y en el encabezado: a ese tamaño el lema dibujado quedaba de 2 a 5 px | Versiones sin lema para tamaños chicos y el lema como texto; vertical retrazado desde el PDF (PR #9) | Revisión visual en monitor común y celular |
| 14/10/2026 | HU-02 | Al desactivar o reactivar no aparecía el aviso de confirmación | El aviso se muestra desde la acción, no desde la pantalla que se reemplaza | E2E "desactivar a alguien…" (espera el aviso) |
| 14/10/2026 | Entorno local | El nombre del dueño de prueba salía "Due�o": el archivo `.env` estaba guardado en Latin-1 y no en UTF-8 | `.env` pasado a UTF-8 y nombre corregido en la base local. No afecta a pruebas ni a producción, que no usan ese archivo | — (aviso en `.env.example`) |
| 14/10/2026 | HU-04 | Si se elegía el logo apenas abría la pantalla (antes de que terminara de cargar), no se subía y no avisaba nada | El botón "Subir logo" se habilita recién cuando la pantalla está lista | E2E "el logo para documentos…" (espera el botón habilitado) |
