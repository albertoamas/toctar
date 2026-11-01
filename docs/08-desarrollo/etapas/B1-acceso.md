# B1 Acceso — especificación

- **Fase y semana:** B. Entrega 1 · semana 1 (14 al 20 de octubre)
- **Estado:** ✅ cerrada el 14 de octubre de 2026. HU-01, HU-02 y HU-03 en `develop`. Las casillas de los módulos del encargado se suman en la etapa de cada módulo (Sitio web en B3, Reclamos en B5)
- **Historias:** HU-01 Iniciar sesión · HU-02 Gestionar usuarios y roles · HU-03 Permisos del encargado
- **Base:**
  - Requisitos: RF-14, RF-15, RF-16, RNF-04 y RNF-05.
  - Reglas: RN-01, RN-12, RN-13 y RN-14; supuestos S-2 y S-4.
  - Casos de uso: CU-00 y CU-06.
  - Modelo: tablas `usuario` y `usuario_permiso`.

## 1. Objetivo

El dueño da acceso al panel a cada persona del taller, con el rol que le corresponde, y decide qué módulos ve el encargado. Nadie llega a lo que no le toca: ni por el menú ni escribiendo la dirección.

## 2. Alcance

**Incluye:**
- Ingreso y cierre de sesión (HU-01, hecho).
- Lista de usuarios; crear, editar nombre y rol; restablecer contraseña; desactivar y reactivar (HU-02).
- Casillas de módulos y el permiso "Autorizar entrega con saldo" para el encargado (HU-03).
- El módulo central de permisos (`src/lib/permisos.ts`), la pantalla "Sin acceso" y el menú del panel filtrado según el rol.

**No incluye:**
- Que cada persona cambie su propia contraseña. Hoy lo hace el dueño desde "Restablecer contraseña". Si lo piden, va al registro de cambios (unas 2 h de la bolsa).
- Recuperar la contraseña por correo: los usuarios no tienen correo.
- Borrar usuarios. Nunca se borran (RN-14).
- Las pantallas de los módulos. Esta etapa solo controla quién entra a cada una.

## 3. Reglas que se cumplen

| Regla | Qué dice | Dónde se garantiza |
|---|---|---|
| RF-14, RNF-04 | Ingreso con usuario y contraseña, cierre de sesión, vence a los 7 días sin uso | Better Auth (`src/lib/auth.ts`), usado solo desde el servidor: no hay ruta `/api/auth`. Límite propio de intentos de ingreso (`src/modulos/acceso/`), agregado en la revisión de seguridad del 16/10. Hecho en HU-01 |
| RF-15 | El dueño crea usuarios, asigna rol, restablece la contraseña y desactiva | Acciones de `src/modulos/usuarios/`, solo para el rol `dueno` |
| RF-16, S-2, S-4 | El dueño define los módulos del encargado y si puede autorizar entregas con saldo | Tabla `usuario_permiso`, leída por `src/lib/permisos.ts` |
| RNF-05 | Los permisos se validan en el servidor | Toda página y acción llama a `exigirModulo` **antes** de leer o escribir. Ocultar el menú no cuenta como control |
| RN-01 | Cotiza el dueño o el encargado con "Cotizaciones" (pedido 24, 01/11/2026) | Cotizar es una acción (`puede(usuario, "cotizar")`): el dueño siempre; el encargado, con el permiso `cotizaciones` (antes, solo el dueño) |
| RN-12 | El técnico no ve precios ni pagos; solo sus órdenes | El técnico tiene únicamente el módulo `ordenes` (el filtro "solo las suyas" se aplica en C4) |
| RN-13 | Entrega con saldo: el dueño o un encargado autorizado | Permiso `entrega_con_saldo` (se usa en C4; aquí solo se asigna) |
| RN-14 | Los usuarios se desactivan, no se borran | No hay acción de borrar. Desactivar usa el bloqueo de Better Auth: impide ingresar y **cierra sus sesiones al instante** |
| **Regla nueva (HU-02)** | Siempre queda al menos un dueño activo | Nadie puede desactivarse a sí mismo (lo impone Better Auth), así que quien desactiva siempre es otro dueño activo. Al cambiar el rol, el servidor cuenta los dueños activos y rechaza si es el último (`cambioDeRolDejaSinDueno`) |
| Seguridad (Better Auth) | Las funciones de administración no verifican permisos sin la sesión | Toda llamada a `auth.api.*` desde el panel pasa `headers: await headers()` |

## 4. Datos

### Tabla nueva: `usuario_permiso`

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | Clave primaria |
| `usuario_id` | `integer` | no | FK a `usuario.id`, `on delete cascade` (los usuarios no se borran, pero la base queda coherente) |
| `permiso` | `text` | no | CHECK: uno de `sitio`, `reclamos`, `clientes`, `cotizaciones` (antes `consultas`, migración 0038), `agenda`, `ordenes`, `pagos`, `mantenimientos`, `entrega_con_saldo` |
| `created_at` | `timestamptz` | no | `now()` |
| `created_by` | `integer` | sí | FK a `usuario.id`: el dueño que lo asignó |

- **Índice único** `(usuario_id, permiso)`: el mismo permiso no se guarda dos veces.
- **Solo para encargados.** Al cambiar el rol de un encargado a otro rol, sus permisos se borran en la misma transacción. Dueño y técnico no usan esta tabla.
- **Migración:** `0001_permisos` (`npm run db:generate -- --name permisos`).
- **Datos iniciales:** ninguno. Un encargado nuevo empieza sin módulos, y el dueño los marca al crearlo.

### Tabla existente: `usuario` (HU-01)
Sin cambios. Rol en `rol` (CHECK `dueno` | `encargado` | `tecnico`) y estado en `desactivado`.

## 5. Permisos: el módulo central

`src/lib/permisos.ts` es la **única** fuente de verdad sobre qué puede hacer cada usuario. Ninguna otra parte del código compara roles a mano.

### Matriz

| Módulo (ruta) | Dueño | Encargado | Técnico | Entrega |
|---|---|---|---|---|
| Inicio (`/panel`) | ✅ | ✅ | ✅ | 1 |
| Sitio web (`/panel/sitio`) | ✅ | con permiso `sitio` | — | 1 |
| Reclamos (`/panel/reclamos`) | ✅ | con permiso `reclamos` | — | 1 |
| Usuarios (`/panel/usuarios`) | ✅ | — | — | 1 |
| Configuración (`/panel/configuracion`) | ✅ | — | — | 1 |
| Catálogo y precios (`/panel/catalogo`) | ✅ | — | — | 2 |
| Cotizar (acción, dentro de Cotizaciones) | ✅ | con "Cotizaciones" (pedido 24) | — | 2 |
| Clientes · Cotizaciones · Agenda · Pagos · Mantenimientos | ✅ | con su permiso | — | 2 |
| Órdenes (`/panel/ordenes`) | ✅ | con permiso `ordenes` | ✅ solo las suyas, sin precios | 2 |
| Autorizar entrega con saldo (acción) | ✅ | con permiso `entrega_con_saldo` | — | 2 |
| Recibir, extender, avisar y entregar (acciones de la orden) | ✅ | con permiso `ordenes` | — | 2 |
| Sumar un adicional a la orden (acción) | ✅ | — (RN-01) | — | 2 |

### Funciones

```ts
type Modulo = "inicio" | "agenda" | "ordenes" | "clientes" | "cotizaciones" | "pagos" | "mantenimientos" | "reclamos"
  | "sitio" | "catalogo" | "usuarios" | "configuracion";   // en el orden del menú, con su grupo (C5 §0)
type Permiso = Exclude<Modulo, "inicio" | "usuarios" | "configuracion" | "catalogo"> | "entrega_con_saldo";
type Accion = "cotizar" | "entrega_con_saldo" | "recibir_vehiculo" | "extender_entrega" | "avisar_cliente"
  | "entregar_vehiculo" | "agregar_adicional";

puedeVerModulo(usuario, modulo): boolean           // función pura: rol + permisos → sí/no (probada con la matriz)
puede(usuario, accion): boolean                     // lo que no es un módulo entero
modulosDelMenu(usuario): Modulo[]                   // los que ve, en orden; menuAgrupado los arma en grupos
exigirModulo(modulo): Promise<UsuarioActual>        // páginas y acciones: sin sesión → /ingresar; sin permiso → /panel/sin-acceso
exigirAccion(accion): Promise<UsuarioActual>        // igual, para una acción (cotizar)
```

- `UsuarioActual` (de `src/lib/sesion.ts`) suma sus `permisos`, leídos de la base una sola vez por pedido.
- Un módulo de la entrega 2 todavía no construido no aparecía en el menú ni en las casillas del encargado (marca `construido`). Desde C5 §0 todos tienen pantalla y la marca se quitó.

## 6. Pantallas y rutas

Todas están dentro del panel (tema claro) y en cada una la primera línea es `exigirModulo("usuarios")`, salvo "Sin acceso".

### `/panel/usuarios`: lista
- **Computadora:** tabla con Nombre, Usuario, Rol y Estado, más el botón "Crear usuario" arriba a la derecha.
- **Celular:** una tarjeta por usuario con el nombre en `titulo-3`, el usuario y el rol abajo, y la insignia de estado.
- Orden: activos primero, después por nombre. Los desactivados se ven con la insignia "Desactivado".
- Tocar una fila o una tarjeta abre `/panel/usuarios/[id]`.

### `/panel/usuarios/nuevo`: crear usuario
- Campos: Nombre, Usuario, Contraseña inicial (con "Mostrar") y Rol, con tres opciones y una línea que explica cada una:
  - **Dueño:** todo el sistema.
  - **Encargado:** solo los módulos que marques.
  - **Técnico:** solo sus órdenes, sin precios.
- Si el rol es Encargado, aparecen las casillas de módulos y la de "Autorizar entrega con saldo".
- Al guardar se vuelve a la lista con el aviso "Usuario creado. Pásale su usuario y contraseña."

### `/panel/usuarios/[id]`: detalle
- **Datos:** nombre y rol, editables, con "Guardar cambios". El usuario no se cambia, porque es con lo que la persona ingresa.
- **Módulos:** solo si es encargado.
- **Contraseña:** "Restablecer contraseña" abre un diálogo con la contraseña nueva y "Guardar". El aviso dice "Contraseña cambiada. Avísale a <nombre>."
- **Acceso:**
  - Si el usuario está activo, el botón es "Desactivar usuario", con una confirmación dentro de la página: "<Nombre> no podrá ingresar y se cerrarán sus sesiones abiertas. Su historial se conserva."
  - Si está desactivado, el botón es "Reactivar usuario".
  - **El propio usuario del dueño:** en lugar del botón dice "No puedes desactivar tu propio usuario. Si hace falta, pídeselo a otro dueño." El servidor también lo rechaza.

### `/panel/sin-acceso`
- Título "Sin acceso" y el texto "Tu usuario no tiene habilitado este módulo. Si lo necesitas, pídeselo al dueño.", con el botón "Volver al inicio".
- Es una página propia a la que redirige `exigirModulo`. `forbidden()` de Next.js sigue experimental en la versión 16.

### Menú del panel
`NavegacionPanel` recibe los módulos de `modulosDelMenu(usuario)`. Como depende de la sesión, se arma dentro de `<Suspense>`.

## 7. Acciones del servidor

Van en `src/modulos/usuarios/acciones.ts`, con sus esquemas en `esquemas.ts`. Todas empiezan con `exigirModulo("usuarios")` (solo el dueño tiene ese módulo) y validan con Zod. `exigirRol` se quitó en la revisión de seguridad del 16/10: nadie la usaba.

| Acción | Entrada | Qué hace | Errores |
|---|---|---|---|
| `crearUsuario` | nombre (2–60), usuario (`esquemaNombreUsuario`), contraseña (`esquemaContrasena`), rol, permisos[] | `auth.api.createUser` con headers, correo interno y `data.username`; después guarda los permisos si es encargado | "Ese usuario ya existe. Elige otro." |
| `actualizarUsuario` | id, nombre, rol | `auth.api.adminUpdateUser` (nombre) y `auth.api.setRole` (rol), con headers. Si deja de ser encargado, borra sus permisos | Regla del último dueño: "Es el único dueño activo: crea otro dueño antes de cambiarle el rol." |
| `guardarPermisos` | id, permisos[] | Reemplaza los permisos del encargado en una transacción | "Solo los encargados tienen módulos." |
| `restablecerContrasena` | id, contraseña | `auth.api.setUserPassword` con headers | — |
| `desactivarUsuario` | id | `auth.api.banUser` con headers (sin vencimiento): bloquea el ingreso y cierra sus sesiones | "No puedes desactivar tu propio usuario. Pídeselo a otro dueño." |
| `reactivarUsuario` | id | `auth.api.unbanUser` con headers | — |

Después de cada acción: `revalidatePath("/panel/usuarios")` y la respuesta para el aviso (Sonner).

**Regla del último dueño** como función pura y probada, en `src/modulos/usuarios/reglas.ts`:
`quedaOtroDuenoActivo(usuarios, idAfectado): boolean`.

## 8. Componentes y diseño

- **shadcn/ui a agregar:** `table`, `dialog`, `select`, `checkbox`, `radio-group` (los roles) y `badge` (con las clases de Insignia del Design System).
- **Design System:** Campo (formularios con error en `rojo-texto` e ícono), Insignia (Activo en `exito`, Desactivado neutro) y botones del panel (`radio-1`).
- **Nuevo:** `EstadoUsuario` (insignia) y `SelectorPermisos` (casillas con la descripción de cada módulo).
- Formularios con `useActionState`; el botón muestra "Guardando…" mientras espera.

## 9. Textos de la interfaz

| Lugar | Texto |
|---|---|
| Título de la lista | Usuarios |
| Lista vacía | Todavía no hay otros usuarios. Crea uno para cada persona del taller. |
| Botón | Crear usuario |
| Ayuda del usuario | Con esto ingresa. En minúsculas, sin espacios ni tildes. |
| Ayuda de la contraseña | Al menos 8 caracteres. Pásasela a la persona en mano o por WhatsApp. |
| Módulos del encargado | Elige qué puede ver y hacer. Nunca puede cotizar ni cambiar la configuración. |
| Casilla especial | Autorizar entrega con saldo: puede entregar un vehículo aunque falte pagar. |
| Insignias | Activo · Desactivado |

## 10. Pruebas

**Unitarias:**
- La **matriz de permisos completa**: cada rol por cada módulo, con y sin permiso. Debe coincidir con la tabla de la sección 5.
- El encargado con el permiso `cotizaciones` guardado a la fuerza en la base igual no puede cotizar (RN-01).
- `quedaOtroDuenoActivo`: un dueño, dos dueños, un dueño activo y uno desactivado.
- Los esquemas: usuario repetido en mayúsculas, contraseña corta, rol inválido.

**De punta a punta (celular y escritorio):**
1. El dueño crea un técnico; el técnico ingresa, no ve "Usuarios" en el menú y, si entra a `/panel/usuarios` por URL, ve "Sin acceso".
2. El dueño crea un encargado con el módulo Reclamos: ve Reclamos y no ve Sitio web; `/panel/sitio` por URL muestra "Sin acceso".
3. El dueño restablece una contraseña: la anterior deja de servir y la nueva funciona.
4. El dueño desactiva a un usuario que tiene la sesión abierta en otro navegador: en su siguiente navegación queda en `/ingresar`.
5. El único dueño no puede desactivarse: el botón está deshabilitado y la acción llamada a mano devuelve el error.
6. El usuario repetido muestra "Ese usuario ya existe. Elige otro."

## 11. Orden de trabajo

| Rama | Contenido | PR |
|---|---|---|
| `hu-01-iniciar-sesion` | Hecha | En revisión |
| `hu-02-gestionar-usuarios` | `permisos.ts` con la matriz y sus pruebas, `/panel/sin-acceso`, menú filtrado, tabla `usuario_permiso`, pantallas y acciones de usuarios, regla del último dueño | 1 PR |
| `hu-03-permisos-encargado` | `SelectorPermisos`, `guardarPermisos`, pruebas E2E 2 | 1 PR |

HU-02 lleva la tabla y el módulo central porque sin ellos no puede negar el acceso. HU-03 solo agrega la interfaz para asignar permisos.

## 12. Criterio de salida

- [x] Las pruebas unitarias de la matriz y las pruebas E2E pasan: 73 unitarias y 38 E2E (celular y escritorio), estables en 3 corridas seguidas.
- [x] Ninguna página ni acción del panel sale sin `exigirModulo` o `exigirSesion`: revisadas las 5 páginas y las 5 acciones (14/10). Revisado de nuevo el 16/10 con toda la Entrega 1: 16 páginas y 30 acciones del panel; las 3 públicas (ingresar, salir y enviar un reclamo) lo son a propósito.
- [x] Toda llamada a `auth.api.*` del panel lleva `headers`: revisadas las 12. La única sin sesión es la del primer dueño en `src/lib/arranque.ts`, a propósito.
- [ ] Demo del viernes 23 (guion abajo).

### Guion de la demo (10 minutos, desde el celular del dueño)

1. Entrar al panel con su usuario. Mostrar que un error de contraseña no dice qué falló.
2. **Usuarios → Crear usuario:** crear a su técnico real. Mostrar la descripción de cada rol.
3. Crear un encargado y marcarle "Autorizar entrega con saldo". Contarle que Sitio web y Reclamos aparecerán como casillas cuando existan esos módulos.
4. En otro celular, entrar como el técnico: solo ve Inicio, y si escribe `/panel/usuarios` ve "Sin acceso".
5. Restablecerle la contraseña al técnico y desactivarlo: su sesión se cierra en el acto.
6. **Confirmar con el dueño:**
   - Nadie puede desactivarse a sí mismo.
   - Los usuarios no cambian su propia contraseña (lo hace el dueño).
   - "La persona a cargo del taller" (S-2) es el rol encargado.

## 13. Lo que cambió al programar

| Qué | Por qué |
|---|---|
| Nadie se desactiva a sí mismo (antes: solo el último dueño) | Better Auth no permite bloquearse a uno mismo. Es más seguro y garantiza igual que quede un dueño activo |
| "Sin acceso" es una página propia, no `forbidden()` | `forbidden()` sigue experimental en Next.js 16 |
| Las casillas del encargado muestran solo módulos ya construidos | Así no se habilita un módulo que todavía no existe. Hoy solo aparece "Autorizar entrega con saldo"; la prueba E2E 2 (encargado con Reclamos) pasa a B3 o B5, cuando exista el primer módulo asignable |
| Al restablecer la contraseña también se cierran las sesiones de esa persona | Si alguien conocía la contraseña anterior, queda afuera |
| Un patrón único para los nombres de usuario (`PATRON_NOMBRE_USUARIO`) | Error encontrado: los usuarios con guion no podían ingresar (`09-pruebas/criterios-entrega-1.md`) |

## 14. Decisiones abiertas

| Decisión | Propuesta | Quién decide |
|---|---|---|
| ¿Que cada usuario cambie su propia contraseña? | No en esta etapa (sección 2). Si el dueño lo pide en la demo, va al registro de cambios | Dueño |
| ¿"La persona a cargo del taller" (S-2) es siempre el encargado? | Sí. Se confirma en la demo del 23 | Dueño |
