# Auditoría QA, seguridad y rendimiento — TocTar

- Fecha de referencia: 03/11/2026, Bolivia.
- Versión revisada: `develop`, commit `3ed8e1c28722e9868ef1a0c6c26ab91c58dbcec5`.
- Modalidad: revisión estática por módulos, herramientas locales y reproducciones aisladas en memoria.
- Cambios realizados: únicamente este informe. No se corrigió código, configuración ni documentación existente; no se instalaron paquetes ni se modificaron datos. Las verificaciones generaron artefactos locales ignorados de Next/TypeScript.

## Resumen ejecutivo

La base técnica supera lint, tipos, build, Knip y las 352 pruebas unitarias. Esto no basta para aprobar la entrega: se encontraron fallos fuera de esa cobertura y quedan pruebas de navegador, integración, concurrencia y producción por ejecutar.

Se registran **14 hallazgos: 2 altos, 10 medios y 2 bajos**. Nueve tienen evidencia mediante reproducción aislada, análisis estático o consulta de dependencias; cinco son riesgos que requieren reproducción con base de datos o mediciones de carga. Un alto es la dependencia Zod afectada por un aviso conocido; el otro es una posible carrera en la protección del último dueño. No se confirmó explotación remota ni un hallazgo crítico.

Las prioridades son revisar la dependencia afectada, corregir la validación de fechas y asegurar la limpieza de archivos y la invalidación de caché ante fallos. No se asigna una velocidad ni un porcentaje de seguridad sin medición del entorno real.

## Alcance y método

1. Contrastar `AGENTS.md`, `CLAUDE.md`, requisitos, criterios y especificaciones posteriores, especialmente P23 y P32.
2. Revisar autenticación, permisos, validación de entradas, almacenamiento, privacidad y límites de recursos.
3. Seguir fechas y horas desde su entrada hasta base, pantalla, PDF y filtros; distinguir instantes UTC de fechas calendario.
4. Revisar estructura modular, código duplicado y muerto, errores, transacciones e invalidación de caché.
5. Revisar consultas, límites de listas, procesamiento de imágenes y recursos del cliente.
6. Ejecutar verificaciones sin modificar datos; reproducir casos puros y fallos simulados de almacenamiento.
7. Separar hechos, riesgos y requisitos todavía no decididos.

Se consultaron las skills de seguridad y React/Next.js y las guías locales de Next sobre seguridad de datos. Las convenciones de la versión instalada y las decisiones del proyecto prevalecen sobre recomendaciones genéricas incompatibles.

### Seguridad: puntos examinados

- Controles en Server Actions y rutas de PDF; no confiar en el menú o proxy.
- Better Auth, headers de sesión en operaciones administrativas y limitación de ingreso.
- Entradas Zod, SQL parametrizado, HTML/JSON-LD y URLs.
- Fotos privadas, enlaces firmados, copias públicas y fallos parciales de almacenamiento.
- Dependencias con avisos conocidos, configuración Docker y cabeceras.
- Concurrencia en cambios sensibles y controles cuya eficacia depende del proxy.

### Rendimiento: puntos examinados

- Consultas paralelas, agrupación de datos y ausencia de límites/paginación.
- Caché pública, etiquetas y orden de invalidación.
- Crecimiento del HTML, componentes interactivos y recursos de galería.
- Conversión de fotos, miniaturas, carga diferida y trabajo duplicado.
- Build de producción. Lighthouse, métricas web y EXPLAIN quedan pendientes: no se sustituyen por intuiciones de código.

## Verificaciones ejecutadas

| Verificación | Resultado | Alcance real |
|---|---|---|
| `npm.cmd test` | 352/352; 27 archivos | Unitarias en Node |
| Unitarias con `TZ=UTC` | 352/352 | Misma suite, distinta zona del proceso |
| Unitarias con `TZ=Asia/Tokyo` | 352/352 | No detecta el caso de Año Nuevo de QA-03 |
| `npm.cmd run lint` | Pasa | ESLint |
| `npm.cmd run typecheck` | Pasa | Tipos de rutas y TypeScript |
| `npm.cmd exec -- knip` | Sin hallazgos | Con exclusiones de `knip.json` |
| `npm.cmd run build` | Pasa; 55 páginas generadas | Compilación y prerender, no navegación ni disponibilidad de R2/PostgreSQL |
| `npm.cmd audit --omit=dev --json` | 1 alto y 4 moderados en el árbol reportado | Dos avisos raíz; las cuatro entradas moderadas pertenecen a una cadena de herramientas |
| Fecha inexistente en esquema real de reclamo | Aceptada incorrectamente | Reproducción sin base |
| `anioMaximo` en tres zonas | Resultado inconsistente | Mismo instante; UTC, Bolivia y Tokio |
| Fallo de segunda subida en `guardarFoto` | Original sin limpiar | Función real con dependencias simuladas |
| Fallo de S3 en `eliminarFoto` y reintento | Referencia perdida | Función real con dependencias simuladas |

Inventario: 311 archivos TS/TSX de aplicación, 27 archivos unitarios y 43 archivos `*.spec.ts` de E2E. Un barrido AST de las 76 funciones exportadas de `acciones.ts` encuentra guardas explícitas en 73; las tres restantes son ingreso, salida y reclamo público. La salida delega el control de sesión a Better Auth. Este barrido confirma presencia de llamadas, no demuestra autorización correcta en todos los estados.

## Hallazgos

### QA-01 — Zod instalado tiene un aviso de seguridad alto

- **Severidad:** alta. **Estado:** dependencia afectada confirmada; explotación en TocTar no demostrada.
- **Ubicación:** `package-lock.json:15070`, `package.json:41`; colecciones de entrada en `src/modulos/cotizaciones/esquemas.ts:39`, `src/modulos/agenda/esquemas.ts:32` y permisos sin máximo de elementos en `src/modulos/usuarios/esquemas.ts:10`.
- **Evidencia:** lockfile e instalación usan Zod `4.6.5`. npm audit identifica `GHSA-mrhx-c7xc-m3w5`; la versión corregida indicada es `4.6.6`.
- **Impacto:** el aviso describe consumo excesivo de memoria al validar colecciones grandes. Hay acciones que deserializan listas y luego las validan. Existen límites de cuerpo y permisos, por lo que no se afirma una caída pública reproducida. Los formularios públicos examinados usan objetos de campos, no estas listas comerciales.
- **Recomendación:** actualizar a una versión corregida compatible, revisar límites antes de parsear/validar colecciones y repetir verificaciones. No usar `audit fix --force` indiscriminadamente.
- **Validación pendiente:** probar tamaño de entrada y memoria en un proceso aislado con límites, sin atacar servicios existentes.
- **Fuente:** [aviso de Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

### QA-02 — Reclamos acepta fechas que no existen

- **Severidad:** media. **Estado:** reproducido con el esquema real.
- **Ubicación:** `src/modulos/reclamos/esquemas.ts:43`; persistencia en `src/modulos/reclamos/acciones.ts:70`.
- **Evidencia:** la fecha usa regex y `Date.parse`. `esquemaReclamo.safeParse` acepta `fechaAproximada: "2026-02-31"` y la devuelve sin normalizar. PostgreSQL la rechazará al escribir un campo `date`; no se ejecutó esa escritura.
- **Reproducción:** nombre `Prueba QA`, teléfono `71234567`, placa `1234ABC`, servicio vacío, descripción de al menos 10 caracteres y la fecha anterior: resultado `success: true`.
- **Impacto:** una petición alterada puede terminar como error inesperado. Con fotos puede combinarse con QA-06.
- **Recomendación:** usar `fechaExiste`, ya disponible, y probar 31/02, 31/04, 29/02 válido e inválido. La validación del navegador no reemplaza la del servidor.

### QA-03 — El año máximo de vehículos depende de la zona del proceso

- **Severidad:** baja. **Estado:** reproducido.
- **Ubicación:** `src/modulos/clientes/reglas.ts:13`; consumidor en `src/modulos/clientes/esquemas.ts`.
- **Evidencia:** `hoy.getFullYear() + 1` usa la zona local, a diferencia de `anioCotizacion` y `fechaEnBolivia`.
- **Reproducción:** para `2027-01-01T01:00:00Z`, en Bolivia todavía es `2026-12-31 21:00`. El máximo debe ser 2027: la función devuelve 2028 con TZ UTC/Tokio y 2027 con TZ Bolivia.
- **Impacto:** validación distinta entre navegador y servidor cerca del cambio de año. No se encontró un desplazamiento generalizado de las horas mostradas.
- **Recomendación:** derivar el año del calendario de Bolivia y agregar el límite de Año Nuevo a las pruebas.

### QA-04 — Si falla la miniatura, queda la foto original huérfana

- **Severidad:** media. **Estado:** reproducido con la función real y S3 simulado.
- **Ubicación:** `src/lib/fotos.ts:46`, `src/lib/fotos.ts:48`.
- **Evidencia:** original y miniatura se suben antes del `try` que limpia cuando falla el insert. La segunda subida puede fallar después de guardar el original.
- **Resultado observado:** dos intentos de subida, cero de borrado, rechazo de la función y ninguna fila `archivo` creada.
- **Impacto:** objetos sin referencia, costos y retención accidental de imágenes privadas o públicas.
- **Recomendación:** incluir todas las subidas en la compensación y conservar/reintentar la limpieza fallida. `copiarFotoAlPublico` ya tiene un patrón de seguimiento de subidas más completo.

### QA-05 — Borrar primero el registro impide reintentar la limpieza de S3

- **Severidad:** media. **Estado:** reproducido con dependencias simuladas.
- **Ubicación:** `src/lib/fotos.ts:100`.
- **Evidencia:** `db.delete(archivo).returning()` precede a `borrarArchivo`. Si S3 falla, el id ya no permite recuperar las claves.
- **Resultado observado:** primer borrado falla en S3; el segundo no llega al almacenamiento porque la fila ya desapareció.
- **Impacto:** archivos que permanecen después de quitarlos del sistema, sin mecanismo de reintento basado en su registro. Es también un problema de retención de datos.
- **Recomendación:** registro durable de borrados pendientes, reintentos idempotentes y trazabilidad del resultado; no basta con ocultar la excepción.

### QA-06 — Reclamos y alta de galería tienen compensación incompleta

- **Severidad:** media. **Estado:** comprobado por análisis de caminos de excepción; sin inyección de fallo en servicios reales.
- **Ubicación:** `src/modulos/reclamos/acciones.ts:60` y `:70`; `src/modulos/sitio/acciones.ts:331`.
- **Evidencia:** Reclamos limpia si una foto devuelve `ok: false` o el límite final devuelve false, pero no si `guardarFoto` lanza tras subir una foto previa ni si la transacción lanza. Galería tampoco compensa la foto de después si la de antes lanza, o las fotos si `agregarAGaleria` falla.
- **Impacto:** filas `archivo` y objetos que no pertenecen a un reclamo/ítem, aunque falle la operación principal.
- **Recomendación:** compensación de todo el flujo, con resultado de limpieza registrado. Añadir pruebas de segunda subida e insert fallidos. Es distinto del fallo interno de miniatura de QA-04.

### QA-07 — El fallo de un borrado puede impedir invalidar la caché

- **Severidad:** media. **Estado:** orden de operaciones confirmado estáticamente; efecto visible pendiente de integración.
- **Ubicación:** `src/modulos/sitio/acciones.ts:84`, `:99`, `:452`; `src/modulos/configuracion/acciones.ts:105`.
- **Evidencia:** se actualiza/elimina el registro, luego se espera `eliminarFoto`, y recién después se llama a `servicioCambiado`, `galeriaCambiada` o `updateTag`. Si el almacenamiento rechaza el borrado, no se ejecuta la invalidación.
- **Impacto:** la base confirma el cambio, la interfaz informa error y una caché pública puede seguir mostrando contenido viejo o enlaces rotos. Reintentar quitar una foto ya nula puede retornar antes de invalidar.
- **Recomendación:** invalidar el cambio confirmado independientemente de la limpieza; tratar el borrado pendiente por separado. Las fotos de sección ya invalidan antes del borrado y capturan su fallo.

### QA-08 — La foto principal del servicio no serializa reemplazo y eliminación

- **Severidad:** media. **Estado:** posible problema de concurrencia; no reproducido con PostgreSQL.
- **Ubicación:** `src/modulos/sitio/acciones.ts:73` y `:91`.
- **Evidencia:** leer la foto actual, subir, actualizar y borrar son pasos independientes. Las fotos de sección, en cambio, bloquean el servicio dentro de una transacción.
- **Escenario:** dos pestañas leen A y suben B/C; ambas actualizan y borran A, dejando una imagen nueva sin usar. Otra secuencia de subir/quitar puede eliminar un cambio recién guardado.
- **Impacto:** pérdida de una actualización y archivos sin uso.
- **Recomendación:** serializar el intercambio de referencia y determinar la foto anterior bajo el mismo bloqueo. Probar subir/subir y subir/quitar simultáneos.

### QA-09 — La protección del último dueño tiene una ventana de concurrencia

- **Severidad:** alta por impacto administrativo. **Estado:** riesgo estático, requiere reproducción de integración.
- **Ubicación:** `src/modulos/usuarios/acciones.ts:97`, `:100`, `:106`.
- **Evidencia:** contar dueños, validar y cambiar el rol mediante Better Auth no forman una operación serializada. La regla pura protege llamadas secuenciales, no dos decisiones sobre la misma lista anterior.
- **Contraste de dependencia:** el endpoint `setRole` instalado (`node_modules/better-auth/dist/plugins/admin/routes.mjs:44`) comprueba permiso y existencia, y actualiza el rol; en ese camino no agrega una comprobación del último dueño.
- **Escenario:** A y B son dueños activos; ambos leen la lista con dos dueños y solicitan degradarse antes de finalizar el cambio del otro. Si ambas autorizaciones pasan, puede no quedar dueño activo.
- **Impacto:** pérdida del acceso administrativo hasta intervención técnica. No constituye elevación de privilegios de un visitante.
- **Recomendación:** serializar el invariante global, coordinar el cambio con Better Auth y probar además cambios de rol cruzados y desactivaciones concurrentes.

### QA-10 — Cotización y agenda adquieren bloqueos en orden inverso

- **Severidad:** media. **Estado:** posible deadlock; sin reproducción en base.
- **Ubicación:** `src/modulos/cotizaciones/acciones.ts:206` y `:214`; `src/modulos/agenda/acciones.ts:144` y `:149`.
- **Evidencia:** una nueva versión bloquea primero `consulta` y después actualiza `cotizacion`; agendar actualiza primero `cotizacion` y después `consulta`.
- **Escenario:** crear versión y agendar la vigente a la vez puede formar una espera circular.
- **Impacto:** PostgreSQL abortaría una transacción; se conserva atomicidad, pero el usuario puede recibir un error inesperado. No se afirma corrupción de datos.
- **Recomendación:** orden de bloqueos común y manejo de conflictos/reintentos cuando corresponda; prueba concurrente específica.

### QA-11 — La galería pública crece sin un límite de renderizado

- **Severidad:** media, riesgo de rendimiento. **Estado:** estructura confirmada; degradación no medida.
- **Ubicación:** `src/modulos/sitio/publico.ts:44`; `src/app/(sitio)/galeria/page.tsx:45`, `:111` y `:127`.
- **Evidencia:** se consultan todas las fotos visibles; el filtro se aplica después, y se renderizan todos los pares/fotos. Cada par monta un comparador cliente. La caché evita repetir SQL, pero no limita HTML, propiedades serializadas ni componentes interactivos.
- **Impacto:** crecimiento del tiempo de respuesta/render e hidratación al acumular trabajos. Carga diferida de imágenes ayuda a la red, no elimina el resto.
- **Recomendación:** medir con 50/200/1000 trabajos, limitar lo renderizado y evaluar paginación o carga incremental y filtrado en consulta. No se exige reescribir sin comprobar el volumen real.

### QA-12 — Algunas listas e historiales internos no tienen límite

- **Severidad:** media, riesgo de rendimiento. **Estado:** riesgo de crecimiento; sin benchmark ni EXPLAIN.
- **Ubicación:** `src/modulos/reclamos/consultas.ts:22`, `src/modulos/mantenimientos/consultas.ts:99` y `src/modulos/catalogo/consultas.ts:165`.
- **Evidencia:** Reclamos (incluido el histórico), listas de mantenimiento abiertas y el historial de precios no incorporan un límite/paginación en estas lecturas. El número de SQL no es necesariamente N+1; el problema es el volumen sin acotar.
- **Impacto:** más filas, trabajo de base y elementos de interfaz conforme crece la historia del negocio.
- **Recomendación:** medir cardinalidad, planes e índices; priorizar históricos y pantallas más usadas. Clientes ya limita resultados y Órdenes entregadas ya pagina: sirven de referencias.

### QA-13 — Aviso moderado de esbuild en la cadena de herramientas

- **Severidad:** media del aviso; prioridad de aplicación menor que QA-01. **Estado:** versión afectada confirmada, exposición no demostrada.
- **Ubicación:** `package-lock.json:1671`; dependencia de herramientas `drizzle-kit` en `package.json`.
- **Evidencia:** esbuild `0.18.20` bajo `@esbuild-kit/core-utils`; npm reporta cuatro entradas moderadas de la misma cadena, no cuatro vulnerabilidades independientes.
- **Impacto condicionado:** el aviso afecta el servidor de desarrollo de esbuild y lectura entre orígenes. No se observó uso de ese servidor en TocTar. `drizzle-kit` no apareció en `.next/standalone/node_modules` tras el build.
- **Recomendación:** revisar la cadena y actualizar de manera compatible; no asumir exposición productiva ni aceptar el downgrade de Drizzle que sugiere automáticamente npm.
- **Fuente:** [aviso de esbuild](https://github.com/advisories/GHSA-67mh-4wv8-2f99).

### QA-14 — Los documentos de aceptación contienen contradicciones vigentes

- **Severidad:** baja. **Estado:** confirmado.
- **Ubicación:** `docs/09-pruebas/criterios-entrega-1.md:74`, `docs/09-pruebas/criterios-entrega-2.md:314` y `:360`, `docs/flujo-de-trabajo.md:124`, `docs/07-preparacion/servidor.md:171`.
- **Evidencia:** el criterio 3.2 sigue afirmando que un encargado nunca cotiza; el cierre pide tres roles aunque P32 los redujo a dos; el flujo mantiene el rediseño como pendiente pese a estar hecho. Servidor propone restaurar después de publicar, mientras RNF-06 exige probar antes.
- **Impacto:** una aceptación puede comprobar reglas equivocadas o posponer una condición de lanzamiento.
- **Recomendación:** conciliar los criterios actuales con P23/P32, marcar explícitamente el material histórico y fijar la restauración previa. No borrar el registro histórico de decisiones.

## Revisión por módulo

La tabla refleja lo leído y contrastado. No equivale a aprobar cada pantalla ni cada transición en ejecución.

| Módulo | Evidencia favorable | Hallazgos y siguiente validación |
|---|---|---|
| Acceso | Registro de intentos previo a verificar contraseña, errores genéricos, API de auth no expuesta como ruta | Confirmar headers de IP reales del proxy y cookies HTTPS; no se hizo prueba de fuerza bruta |
| Usuarios | Guardas, headers en API admin, validación de roles/permisos y bloqueo de autodesactivación | QA-09; fallos entre cambio de rol y guardado separado de permisos también deben inyectarse |
| Configuración | Valores validados, etiquetas para renovar caché y parámetros copiados en documentos | QA-07 para logo; QA-14 para estados documentales |
| Sitio y galería | Consultas públicas filtran visibilidad y servicio activo; JSON-LD escapa `<`; fotos responsivas | QA-06, QA-07, QA-08 y QA-11 |
| Reclamos | Trampa y límites por conexión, bloqueo final en transacción, nuevas fotos privadas | QA-02, QA-06 y QA-12; revisar retención de fotos antiguas públicas |
| Catálogo | Precios versionados, lectura de vigentes con DISTINCT ON y consultas agrupadas | QA-12; validar concurrencia de edición y carga histórica |
| Clientes/vehículos | Unicidad en base, consultas limitadas y transacción para cliente con vehículo | QA-03; placa obligatoria corresponde al pedido 29 aún pendiente, no es un bug contra el alcance vigente |
| Cotizaciones/PDF | Montos calculados en centavos, snapshots, correlativo atómico, bloqueo de versiones y PDF privado | QA-01 y QA-10; generación usa el logo actual si el PDF estaba pendiente: contrastar con la regla de snapshot visual |
| Agenda | Exclusión de cruces en SQL, copia de líneas y aceptación dentro de transacción | QA-10; probar dos reservas, versión/agendado y cambios concurrentes de cliente/vehículo |
| Órdenes | Guardas, control de estado, bloqueo en entrega y comprobación de saldo dentro de transacción | QA-04/05 afectan fotos y firmas; falta cámara/firma en dispositivo real |
| Pagos | Bloqueo del trabajo, tope de saldo, anulación con motivo y auditoría | QA-04/05 en comprobantes; fórmula SQL de saldos duplica deliberadamente el cálculo puro y requiere mantener la comparación E2E |
| Mantenimientos | Reglas puras, índice de plan abierto y actualización dentro de entrega | QA-12; `DIAS_PROXIMOS=15` es el pedido 19 pendiente de decisión |
| Inicio y mensajes | Lecturas condicionadas por permisos y plantillas con campos permitidos | Verificar datos del día al cruzar medianoche, mensajes por permiso y navegación real |
| PWA/operación | Service worker no guarda datos de clientes; Docker usa usuario sin privilegios; pool tiene timeouts | Instalación, monitoreo, restauración y configuración remota no comprobados |

## Código duplicado, muerto y estructura

- **Knip no reportó código muerto en su alcance.** Excluye `src/componentes/ui/**`, `src/lib/utils.ts` y `public/sw.js`; no certifica ausencia total de código muerto ni de duplicación.
- **Duplicación con divergencia comprobada:** Reclamos valida fechas con un criterio distinto al helper `fechaExiste`; dio lugar a QA-02. Cotizaciones también implementa parte de esa validación por separado.
- **Duplicación de parseo:** Cotizaciones y Agenda repiten la lectura JSON de líneas con mensajes/validación similares, aunque comparten `lineaServicio`. Oportunidad de mantenimiento, sin un fallo adicional demostrado.
- **Placas:** Reclamos admite 4–8 caracteres y Clientes 2–10. Comparten normalización con implementaciones separadas. Se requiere decisión del negocio sobre uniformidad; no se declara un bug automáticamente.
- **Reglas monetarias SQL/TypeScript:** la duplicación en saldos está documentada y existe E2E comparativa; no se recomienda eliminarla sin considerar rendimiento.
- **Legado deliberado:** la tabla `consulta` agrupa cotizaciones por D-12. Las tablas/fotos históricas preservadas por P23 no deben eliminarse solo porque parezcan restos. Revisar su política de retención antes de retirarlas.
- **Estructura general:** la separación por módulos, consultas server-only, esquemas y reglas puras es coherente. No se justifica una reescritura arquitectónica general a partir de estos hallazgos.

## Fechas y horas: resultado específico

- `fechaEnBolivia`, `formatearFechaHora` y `diaYHora` fijan `America/La_Paz`.
- Fechas de agenda se conservan como calendario; `sumarDias` opera en UTC para evitar desplazamientos y `sumarMeses` ajusta fin de mes. Usar UTC para esas operaciones no es un fallo de zona.
- PDF deriva fecha de creación en Bolivia; el correlativo anual usa el año boliviano.
- Búsqueda de órdenes entregadas convierte `entregadoAt` con `at time zone 'America/La_Paz'`.
- Dependabot y Playwright declaran Bolivia; pasar las unitarias en UTC y Tokio no cubre todos los límites temporales.
- Excepción reproducida: QA-03. Validación de calendario incorrecta: QA-02.
- Pendiente: comprobar zona del servidor/PostgreSQL, formularios abiertos durante medianoche, pantallas que conservan un `hoy` anterior y cálculos bajo una transacción que cruza el cambio de día.

## Seguridad: controles favorables y comprobaciones pendientes

No se encontró en las rutas leídas una falta evidente de guarda equivalente a publicar el panel o el PDF sin sesión. Esto no es una certificación de ausencia de IDOR o de fugas en todos los payloads RSC.

Controles favorables: autorización central, llamadas admin con headers, schemas de entradas, SQL parametrizado, restricciones de base, límite de cuerpo de acciones, validación real de imágenes con sharp, originales de órdenes privados y PDF compartido con `Cache-Control: private, no-store`.

Pendientes que no se convierten en vulnerabilidades confirmadas:

1. **Proxy/IP:** `codigoDeConexion` confía en `x-real-ip`. Verificar que Traefik lo sobrescribe y el puerto de app no sea accesible directamente; no se comprobó la infraestructura.
2. **Fotos históricas:** `0013_archivo_privado.sql:1` agrega `privado=false` y `reclamos/consultas.ts:104` admite fotos antiguas públicas. Verificar si existen datos anteriores y migrarlos al privado si corresponde. No se afirma que haya fotos reales expuestas.
3. **Recursos antes del límite final:** Reclamos procesa imágenes antes de adquirir el candado de cuota. Verificar limitación concurrente en proxy/servicio; el límite de registros no limita por sí solo toda la CPU de conversiones paralelas.
4. **CSP:** la política de scripts es deliberadamente parcial según `next.config.ts`. Es defensa incompleta frente a un XSS hipotético, no evidencia de XSS. No cambiar a nonce sin evaluar Cache Components y prerender.
5. **Secretos:** no se abrieron `.env` ni credenciales. Gitleaks no estaba disponible en PATH y no se ejecutó un escaneo completo del historial; que exista un job CI no prueba que pasó para este commit.
6. **Cookies, expiración y revocación:** revisar atributos y efecto real de cambiar permisos/cerrar sesiones en HTTPS. No se exportaron tokens ni se hicieron intentos contra usuarios reales.

## Rendimiento: límites de las conclusiones

El build completó correctamente. No se midieron LCP, INP, CLS, TTFB, tiempo de SQL, consumo de memoria ni concurrencia de usuarios. No se reutilizan resultados Lighthouse antiguos como si correspondieran a esta revisión.

Se observaron mejoras existentes: `Promise.all` en lecturas independientes, agrupación de precios, límite de búsqueda de clientes, paginación de órdenes entregadas, miniaturas y caché etiquetada. QA-11/12 son riesgos de crecimiento, no afirmaciones de lentitud actual.

Protocolo de medición posterior:

- Build productivo y datos aislados con volúmenes de uso, histórico y crecimiento.
- Portada, servicio y galería: Lighthouse móvil en varias corridas; registrar medianas, dispositivo y red.
- Panel: tiempos de Inicio, búsqueda, historial de órdenes, guardar cotización y generar/compartir PDF.
- EXPLAIN (ANALYZE, BUFFERS) sobre copias de datos, con planes e índices documentados.
- Verificar memoria de conversiones/PDF bajo concurrencia controlada.
- Comparar antes/después solo cuando haya una corrección autorizada.

## Orden recomendado para resolver y validar

1. **Antes de aprobar lanzamiento:** tratar QA-01 y reproducir QA-09 en entorno aislado. Verificar restauración, privacidad histórica y controles reales del proxy.
2. **Correcciones funcionales y resiliencia:** QA-02 a QA-08 y QA-10, con pruebas de errores parciales y concurrencia.
3. **Ajustes basados en medición:** QA-11/12, considerando el volumen esperado. Gestionar QA-13 en las herramientas.
4. **Cierre documental:** QA-14, decisiones abiertas y matriz actual de dos roles.
5. **Regresión final:** unitarias, lint, tipos, Knip, build, E2E completas, pruebas manuales y criterios de aceptación actuales.

## Lo que esta auditoría todavía no verifica

- No se ejecutó `test:e2e`: su configuración recrea `toctar_e2e`, migra datos y levanta el servidor; no se lanzó automáticamente sobre servicios existentes durante esta revisión.
- No se inició la app en producción local: el arranque aplica migraciones y puede crear el dueño inicial.
- No se navegó la aplicación ni se comprobaron capturas, accesibilidad, cámara, firma o compartir en dispositivos reales.
- No se accedió a producción/pruebas, Coolify, Cloudflare ni Hetzner; no se hicieron ataques ni pruebas de carga remotas.
- No se comprobó una restauración ni el estado de los respaldos.
- No se demostró un fallo de aislamiento de precios mediante inspección de respuestas de navegador; requiere revisar payloads con usuarios de prueba.
- No se ejecutaron carreras reales de PostgreSQL, ni se validó la compatibilidad de una actualización de dependencias.

**Dictamen:** revisión estática y automatizada inicial completada con hallazgos accionables. La aprobación integral de funcionamiento, seguridad y velocidad queda pendiente de las pruebas de integración, navegador, carga y entorno indicadas. Ninguna corrección está aplicada.


## Verificación de YankoSoft (04/11/2026)

Cada hallazgo se contrastó con el código de `develop` (commit `4b70a0a`). Las correcciones van en la rama `arreglos-auditoria-qa`, con un commit por hallazgo o grupo.

| Hallazgo | ¿Es real? | Qué se hizo |
|---|---|---|
| QA-01 Zod con aviso alto | Sí: 4.6.5 instalada, el aviso se corrige en 4.6.6 | Actualizado a 4.6.7. `npm audit --omit=dev` ya no muestra el aviso alto |
| QA-02 Fechas que no existen en reclamos | Sí: "2026-02-31" pasaba la validación | Usa `fechaExiste`. Unitaria con 31/02, 31/04, 29/02 de un año no bisiesto, mes 13 y 29/02/2024 válido |
| QA-03 Año máximo según la zona del proceso | Sí, solo entre las 20:00 del 31/12 y la medianoche en Bolivia | Sale del año de Bolivia (`fechaEnBolivia`). Unitaria del límite de Año Nuevo; pasa con TZ UTC y Tokio |
| QA-04 Original suelta si falla la miniatura | Sí | `guardarFoto` anota cada subida y borra todas si algo falla. Unitarias con el almacenamiento simulado (fallan con el código anterior) |
| QA-05 Borrar el registro antes del archivo | Sí, pero el efecto es menor: el archivo sobra en el bucket y ya no se muestra | Sin cambio. Borrar primero el archivo dejaría una foto rota si después falla el registro, que es peor. Un archivo privado que sobra sigue en el bucket privado. Si hace falta, se suma después una limpieza de los archivos del bucket sin registro |
| QA-06 Reclamos y galería sin limpiar en todos los caminos | Sí | Las dos acciones borran las fotos subidas también si se lanza un error a mitad |
| QA-07 Un fallo al borrar impedía renovar el sitio | Sí, en la foto principal del servicio, el logo y borrar de la galería | Primero se renueva el sitio y después se borra la foto anterior (`eliminarFotosSinFallar`, que no corta la acción y deja el fallo anotado). Las fotos de sección y de página ya lo hacían así |
| QA-08 Foto principal del servicio sin bloqueo | Sí, aunque necesita dos cambios en el mismo instante | Se cambia con el servicio bloqueado y la anterior se lee con el bloqueo tomado. Lo mismo para el logo |
| QA-09 Carrera del último dueño | Sí, aunque necesita dos dueños actuando en el mismo instante. Severidad real: media | Cambiar un rol y desactivar van de a uno, con un candado de la base. Dentro se vuelve a leer la lista y se confirma que quien lo pide sigue siendo un dueño activo |
| QA-10 Bloqueos en orden inverso | Sí. El efecto era un error al usuario, sin datos dañados | Agendar bloquea primero la consulta y después la cotización, como una versión nueva y como cancelar |
| QA-11 Galería sin límite | No es un problema hoy. El dueño la arma a mano (decenas de trabajos) y la lista está en caché | Sin cambio. Se revisa si pasa de unos 100 trabajos |
| QA-12 Listas internas sin límite | No es un problema hoy. Pocos reclamos, mantenimientos abiertos acotados por los vehículos activos y el historial de precios es por servicio | Sin cambio. Se revisa con datos reales después del lanzamiento |
| QA-13 esbuild con aviso moderado | El aviso es real, pero sin exposición: viene de `drizzle-kit`, una herramienta de desarrollo, y no entra en la imagen de producción. La última versión (0.31.11) lo sigue trayendo | Sin cambio. No se acepta el `audit fix --force`, que bajaría Drizzle. Se actualiza cuando `drizzle-kit` lo cambie |
| QA-14 Documentos contradictorios | Sí | Corregidos: criterio 3.2 (cotiza con el permiso, pedido 24), dos roles en la Entrega 2, estado del flujo y la restauración antes de publicar (RNF-06) |

**Pendientes del informe que no son fallos del código:**
- `x-real-ip`: debe ponerlo Traefik (Coolify) y el puerto de la app no debe quedar abierto a internet. Se confirma en el servidor (lo hace YankoSoft, que tiene el acceso).
- Fotos antiguas de reclamos en el bucket público: producción no tiene datos reales todavía y pruebas solo tiene datos de demostración, así que no hay fotos reales expuestas.
- La restauración de prueba antes de publicar queda en `07-preparacion/servidor.md` (RNF-06).
