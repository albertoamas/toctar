# B5 Reclamos y Google — especificación

- **Fase y semana:** B. Entrega 1 · semana 1 (se adelanta desde el 15 de octubre; plan v5)
- **Estado:** programada (15 de octubre de 2026); falta validar el JSON-LD en Google con https (A3) y la revisión manual
- **Historias:** HU-16 Formulario de reclamo · HU-17 Atender reclamos · HU-18 Sitio preparado para Google
- **Base:**
  - Requisitos: RF-07, RF-09, RF-13; RNF-05, RNF-07, RNF-08, RNF-12.
  - Supuesto S-4 ajustado: los reclamos se ven en el inicio del panel, para el dueño y el encargado con el módulo de reclamos.
  - Casos de uso: CU-03 Enviar reclamo y CU-05 Atender reclamos.
  - Modelo: `reclamo` y `reclamo_archivo`.

## 1. Objetivo

Un cliente deja un reclamo o pedido de garantía desde el sitio, con fotos, sin llamar. El dueño, o el encargado con el módulo, lo ve en el panel, le escribe por WhatsApp y lo marca como atendido con una nota. Además, el sitio queda listo para que Google lo encuentre al buscar en Tarija.

## 2. Alcance

**Incluye:**
- **Formulario público "Garantía y reclamos"** en `/garantia` (HU-16):
  - nombre, WhatsApp, placa, servicio, fecha aproximada, descripción y hasta 3 fotos;
  - confirmación al enviar y protección contra spam.
- **Módulo "Reclamos" en el panel** (HU-17):
  - lista con los pendientes primero, y detalle con sus fotos;
  - botón para escribirle al cliente por WhatsApp;
  - "Marcar como atendido" con una nota.
- **Inicio del panel (S-4):** cuántos reclamos están pendientes, con enlace al módulo, para quien puede verlo.
- **Para Google (HU-18):**
  - `sitemap.xml` con las páginas y los servicios visibles;
  - `robots.txt` que deja fuera el panel, el ingreso y la API;
  - datos de negocio local (schema.org) con lo que cargó el dueño;
  - direcciones absolutas para compartir (Open Graph).
- **Guía para el dueño:** dar de alta el Perfil de Empresa en Google Maps (`docs/10-lanzamiento/perfil-de-google.md`).

**No incluye:**
- **Avisos automáticos** de reclamo nuevo, por correo o por la API de WhatsApp: fuera del acuerdo. El aviso es el contador del inicio del panel.
- **Responder desde el sistema:** la respuesta va por WhatsApp; el sistema solo abre el chat.
- **Alta del Perfil de Empresa en Google:** la hace el dueño con su cuenta; YankoSoft lo guía.

## 3. Reglas que se cumplen

| Regla | Qué dice | Dónde se garantiza |
|---|---|---|
| RF-07 | El visitante envía un reclamo; queda registrado en el panel | Acción pública `enviarReclamo`, validada con Zod en el servidor; estado inicial `pendiente` |
| HU-16 | Protección contra spam | Tres capas: campo trampa invisible (si viene lleno, se descarta sin avisar); envío en menos de 3 segundos desde que se abrió el formulario = rechazado; como máximo 5 reclamos por hora desde la misma IP (se guarda un código derivado de la IP, no la IP). Los campos se validan antes que el tiempo mínimo, para que una persona apurada vea sus errores. La IP sale de `x-real-ip` (o del último valor de `x-forwarded-for`), que pone el proxy, no el visitante |
| RF-13, S-4 | El dueño ve los reclamos y los marca atendidos con nota; también el encargado con el módulo | Módulo `reclamos` (matriz de B1): dueño siempre; encargado con el permiso `reclamos`; técnico nunca |
| RNF-05 | Permisos en el servidor | `exigirModulo("reclamos")` en cada página y acción del panel |
| RNF-07 | Fotos comprimidas al subir | Se achican en el navegador y se guardan en WebP de 1600 px, más una miniatura de 640 (`src/lib/fotos.ts`) |
| RNF-08 | Fechas en hora de Bolivia | Se guarda en UTC; se muestra con `src/lib/fechas.ts` (dd/mm/aaaa, America/La_Paz) |
| RF-09 | Mapa del sitio y datos de negocio local | `app/sitemap.ts`, `app/robots.ts` y JSON-LD `AutomotiveBusiness` |
| RNF-12 | El panel no se indexa | Ya cumplido (`noindex` en el panel y el ingreso); además, `robots.txt` lo excluye |

## 4. Datos

Migración `0011_reclamos`.

### `reclamo`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `nombre` | `text` | no | 2 a 80 caracteres |
| `telefono` | `text` | no | WhatsApp normalizado: `591` y 8 dígitos (`src/lib/whatsapp.ts`) |
| `placa` | `text` | no | En mayúsculas, sin espacios ni guiones: `2849XKT` |
| `servicio_id` | `integer` | sí | FK `servicio`. Vacío = "No sé o es otro" |
| `fecha_aproximada` | `date` | sí | Cuándo se hizo el trabajo |
| `descripcion` | `text` | no | 10 a 2000 caracteres |
| `estado` | `text` | no | `pendiente` o `atendido` (CHECK) |
| `nota_atencion` | `text` | sí | Obligatoria al marcar como atendido |
| `atendido_por` | `integer` | sí | FK `usuario` |
| `atendido_at` | `timestamptz` | sí | |
| `ip_hash` | `text` | no | SHA-256 de la IP con `BETTER_AUTH_SECRET`: solo para el límite por hora |
| `created_at` | `timestamptz` | no | |

Índices: `(estado, created_at)` para la lista y `(ip_hash, created_at)` para el límite.

### `reclamo_archivo`
`id`, `reclamo_id` (FK), `archivo_id` (FK), `orden`. Hasta 3 por reclamo.

**Variables nuevas:**
- `SITIO_URL`, la dirección pública del sitio (`http://localhost:3000` en desarrollo, el dominio en producción). Se usa para el sitemap, el `robots.txt`, los datos de negocio local y `metadataBase` (imágenes de Open Graph).
- `SITIO_INDEXABLE`: `true` solo en producción. Con otro valor, `robots.txt` bloquea todo y las páginas llevan `noindex` (el entorno de pruebas no se indexa).
- Las dos se marcan en Coolify también como variables de build: `metadataBase` y el `noindex` se fijan al compilar. El sitemap y el `robots.txt` las leen al atender el pedido.

## 5. Pantallas y rutas

| Ruta | Quién | Contenido |
|---|---|---|
| `/garantia` | Visitante | **"Garantía y reclamos":** un texto corto ("Si algo no quedó como esperabas, cuéntanos y te respondemos por WhatsApp"), el formulario y el botón "Enviar reclamo". Al enviar, el formulario se reemplaza por la confirmación: "Recibimos tu reclamo. Te escribiremos al WhatsApp que dejaste." Va en tema oscuro, con los mismos componentes que el resto del sitio |
| `/panel` | Dueño, encargado con el módulo | Tarjeta "Reclamos pendientes: N" con enlace. Si no hay pendientes: "No hay reclamos pendientes." |
| `/panel/reclamos` | Dueño, encargado con el módulo | Lista con los pendientes primero y los más nuevos arriba: fecha, nombre, placa, servicio, estado y si trae fotos. Filtro: pendientes o todos |
| `/panel/reclamos/[id]` | Ídem | Datos del cliente, servicio, fecha aproximada, descripción y fotos (se amplían al tocarlas). Botones "Escribir por WhatsApp" y "Marcar como atendido" (pide la nota). Si ya está atendido: la nota, quién y cuándo |

**Enlaces al formulario:** el pie del sitio ("Garantía y reclamos"), la página de contacto, y la respuesta "¿Qué cubre la garantía?" de las preguntas frecuentes (la edita el dueño; se sugiere el enlace en la demo).

**Formulario en el celular:**
- Campos uno debajo del otro. El WhatsApp con el teclado de teléfono, y la fecha con el selector del teléfono.
- Las fotos se eligen de la galería o se sacan en el momento, con su vista previa; se pueden quitar antes de enviar.

## 6. Acciones del servidor

En `src/modulos/reclamos/acciones.ts`.

| Acción | Quién | Entrada | Errores |
|---|---|---|---|
| `enviarReclamo` | Público | Los campos, `abierto_en` (milisegundos en que se abrió el formulario), `sitio_web` (trampa) y hasta 3 fotos | "Escribe tu nombre." · "Escribe los 8 dígitos de tu celular." · "Escribe la placa del vehículo." · "Cuéntanos qué pasó (al menos 10 caracteres)." · "Cada foto debe ser JPG, PNG o WebP de hasta 5 MB." · "Hasta 3 fotos." · Si pasa el límite: "Recibimos varios reclamos desde tu conexión. Escríbenos por WhatsApp." |
| `marcarAtendido` | `reclamos` | id, nota (3 a 1000 caracteres) | "Escribe qué se hizo, para el registro." |

**Mensaje de WhatsApp** al cliente desde el panel: "Hola <nombre>, te escribimos de TocTar Detailing por el reclamo que nos dejaste el <fecha>." Va escrito en el código: es un texto de la interfaz, no un valor del negocio.

## 7. Componentes y diseño

- **Sitio:** el formulario usa los campos del panel, con el estilo del tema oscuro (`Campo`, `Input`, `Textarea`, `Selector`) y el botón principal del sitio (`tt-boton tt-boton--principal`). Para las fotos, un selector de hasta 3 con vista previa: se reutiliza el achicado de `SubidaFoto` (`achicarFoto`).
- **Panel:** lista y detalle con el mismo patrón de Usuarios. Insignias `tt-insignia--aviso` (Pendiente) y `tt-insignia--exito` (Atendido); el color siempre va con la palabra.
- **JSON-LD:** un `<script type="application/ld+json">` en el pie del sitio, con los datos del negocio en caché (etiqueta `negocio`).

## 8. Textos de la interfaz

| Lugar | Texto |
|---|---|
| Título del formulario | Garantía y reclamos |
| Bajada | Si algo no quedó como esperabas, cuéntanos y te respondemos por WhatsApp. |
| Botón | Enviar reclamo |
| Confirmación | Recibimos tu reclamo. Te escribiremos al WhatsApp que dejaste. |
| Servicio vacío | No sé o es otro |
| Panel, inicio | Reclamos pendientes: N · No hay reclamos pendientes. |
| Marcar atendido | Marcar como atendido · Qué se hizo |
| Aviso | Reclamo marcado como atendido. |

## 9. Pruebas

**Unitarias:**
- Placa: normalización (`2849 xkt` a `2849XKT`) y rechazo de formatos imposibles.
- Esquema del reclamo: obligatorios y largos.
- Reglas del spam: la trampa llena se descarta; el envío demasiado rápido se rechaza; el límite por hora.
- Mensaje de WhatsApp al cliente.
- Datos de negocio local: horarios a `openingHoursSpecification` y redes a `sameAs`.

**De punta a punta:**
1. Un visitante envía un reclamo con 2 fotos y ve la confirmación. El reclamo aparece pendiente en el inicio y en la lista del panel.
2. Los campos obligatorios vacíos muestran el error junto a cada uno.
3. Un envío con la trampa llena no crea ningún reclamo (y el visitante ve la misma confirmación, para no darle pistas al robot).
4. El dueño abre el reclamo, ve las fotos, el botón de WhatsApp lleva el teléfono del cliente, y lo marca atendido con nota.
5. Un encargado sin el permiso no entra a `/panel/reclamos`; con el permiso, sí. El técnico nunca.
6. `/sitemap.xml` lista las páginas y los servicios visibles, y no los ocultos. `/robots.txt` excluye `/panel`.
7. La portada tiene el JSON-LD con el nombre y la dirección del negocio.

## 10. Orden de trabajo

| Rama | Contenido |
|---|---|
| `docs/especificacion-b5` | Esta especificación |
| `hu-16-formulario-reclamo` | Tablas, migración, reglas, `/garantia` y su acción, enlaces desde el pie y contacto |
| `hu-17-atender-reclamos` | Módulo `reclamos` del panel (lista, detalle, atender) y tarjeta del inicio |
| `hu-18-google` | `SITIO_URL`, `sitemap.ts`, `robots.ts`, JSON-LD y guía del Perfil de Empresa |

## 11. Criterio de salida

- [x] Las pruebas pasan, en celular y en escritorio (15/10: 192 unitarias y 108 E2E).
- [x] El reclamo de prueba aparece en el inicio del panel (S-4) (E2E `hu-17`, 15/10).
- [ ] La herramienta de prueba de resultados enriquecidos de Google valida el JSON-LD (en el entorno de pruebas, con https).
- [ ] Revisión manual de YankoSoft.

## 12. Decisiones abiertas

| Decisión | Propuesta | Quién decide |
|---|---|---|
| ¿Placa obligatoria? | Sí: identifica el vehículo; si el cliente no la sabe, puede escribir "no sé" en la descripción | Dueño (demo) |
| Tipo de negocio en Google | `AutomotiveBusiness` (taller automotriz); en el Perfil de Empresa, la categoría "Servicio de detallado de automóviles" | YankoSoft, con el dueño al crear el perfil |
| Aviso de reclamo nuevo | El contador del inicio del panel. Un aviso por WhatsApp o por correo sería un cambio (registro de cambios) | Dueño |
