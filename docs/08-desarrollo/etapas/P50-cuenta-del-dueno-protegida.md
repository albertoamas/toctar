# P50 La cuenta del dueño, protegida — especificación

- **Fase y semana:** C. Entrega 2 · 13 de noviembre de 2026, antes de publicar
- **Estado:** aprobada por YankoSoft y hecha (13/11/2026, PR #231); falta contárselo al dueño (le quita una opción del RF-15)
- **Pedido:** 50 de `03-cierre-comercial/registro-de-cambios.md`
- **Historias que cambian:** HU-02 (gestionar usuarios), HU-03 (permisos del encargado)
- **Base:** B1 (`B1-acceso.md`): el dueño crea usuarios, les da un rol, restablece su contraseña y los desactiva (RF-15). P32 (`P32-roles-sin-tecnico.md`): dos roles, dueño y encargado.

## 1. Objetivo
El taller tiene un solo dueño. Si alguien toma su celular con la sesión abierta, hoy puede cambiarle la contraseña sin saber
la actual (Restablecer contraseña sirve también para uno mismo) y dejarlo afuera, o crearse un dueño de respaldo para
volver a entrar. Desde el panel, una cuenta de dueño ya no se crea ni se cambia: solo su dueño cambia su nombre y su
contraseña, y la contraseña pide la actual. Crear o recuperar un dueño queda para YankoSoft, en el servidor.

## 2. Alcance
- **Incluye:**
  - **Crear usuario** crea siempre un encargado: el formulario no pregunta el rol, y muestra directo el perfil y los permisos.
  - **La ficha de un encargado:** como hoy, su nombre, sus permisos, restablecer su contraseña y desactivarlo o reactivarlo.
    "Rol y permisos" pasa a llamarse **Permisos**.
  - **La ficha de un dueño:** solo se mira. Si es la propia, se cambia el nombre y, en "Más", **Cambiar mi contraseña**
    (con la actual y la nueva; se cierran las demás sesiones abiertas). Si es la de otro dueño, nada.
  - **Recuperar o crear un dueño** (YankoSoft; probado el 13/11 contra la base de E2E, con un encargado desactivado y con uno nuevo): con `DUENO_RECUPERAR_USUARIO` y `DUENO_RECUPERAR_CONTRASENA`, y
    `DUENO_RECUPERAR_NOMBRE` si hay que crearlo, en el entorno de Coolify. Al arrancar, la app le pone esa contraseña,
    lo reactiva y cierra sus sesiones; si no existe, lo crea como dueño. Se borran del entorno después de usarlas. Mientras
    estén puestas, cada arranque lo vuelve a hacer y lo dice en el registro.
- **Diseño de la ficha (pulido, con el mismo criterio que el catálogo, 13.57):** la insignia solo si pide atención
  (Desactivado); Datos en bloques (`FilaDato`): Nombre, Usuario y Rol; Permisos con el perfil en negrita y cada permiso en
  su renglón.
- **No incluye:** quitar el rol de dueño del sistema (sigue habiendo dueños, con todo el sistema), ni una pantalla para
  YankoSoft.

## 3. Reglas que se cumplen
- **RN-15 (nueva):** desde el panel no se crea un dueño ni se le cambia el rol, la contraseña o el acceso a un dueño. Su
  nombre y su contraseña los cambia él mismo; la contraseña, con la actual. En el servidor: `puedeCambiar` (reglas.ts),
  que usa cada acción; la interfaz no ofrece lo que no se puede.
- **Siempre queda un dueño activo:** ya no depende de un candado. Ningún cambio del panel le quita el rol o el acceso a un
  dueño. Desaparecen `cambioDeRolDejaSinDueno` y el candado `usuarios:duenos`.
- **Cambiar mi contraseña** usa el límite de intentos del ingreso: 5 intentos fallidos en 15 minutos desde la misma
  conexión, y se espera. Si no, un celular robado con la sesión abierta podría probar la contraseña actual sin fin.
- RF-15 cambia: "El dueño crea encargados, restablece su contraseña y los desactiva".

## 4. Datos
Sin migración. Los intentos de "Cambiar mi contraseña" se anotan en `intento_ingreso` con el usuario `cambio:<usuario>`,
aparte de los del ingreso.

## 5. Pantallas y rutas
- `/panel/usuarios/nuevo`, **Crear usuario:** Nombre, Usuario, Contraseña inicial y Permisos (perfil y casillas), sin rol.
- `/panel/usuarios/[id]`:
  - **Encargado:** Datos (Editar: el nombre), Permisos (Editar: el perfil y las casillas) y "Más" (Restablecer contraseña, Desactivar usuario).
  - **El propio dueño:** Datos (Editar: el nombre) y "Más" (Cambiar mi contraseña). Bajo el título: "Es tu usuario."
  - **Otro dueño:** Datos, sin Editar ni "Más". Bajo el título: "La cuenta de un dueño solo la cambia él mismo."

## 6. Acciones del servidor
Todas con `exigirModulo("usuarios")` y Zod.
- `crearUsuario`: sin `rol`; crea un encargado.
- `guardarDatosUsuario`: otro dueño, no ("La cuenta de un dueño solo la cambia él mismo.").
- `guardarPermisosUsuario` (antes `guardarRolUsuario`): `{ id, permisos }`; solo a un encargado.
- `restablecerContrasena`, `desactivarUsuario` y `reactivarUsuario`: solo a un encargado.
- `cambiarMiContrasena`: `{ actual, nueva }`, con `auth.api.changePassword` (con headers) y después `revokeOtherSessions`
  (la opción de changePassword también reemplaza la sesión actual y la pantalla la perdía). Solo `INVALID_PASSWORD` cuenta
  como intento: "La contraseña actual no es correcta."; con el límite: "Demasiados intentos. Espera 15 minutos y vuelve a
  probar." Sus intentos se cuentan aparte de los del ingreso, también por conexión.

## 7. Componentes y diseño
`CamposRolPermisos` pasa a `CamposPermisos`, sin el rol. Ficha con `FilaDato` (`datos-en-bloques.tsx`) y `SeccionConEditar`.

## 8. Textos de la interfaz
- Crear: el título "Crear usuario"; la leyenda "Permisos".
- Ficha: "Es tu usuario." · "La cuenta de un dueño solo la cambia él mismo." · el modal "Cambiar mi contraseña", con
  "Contraseña actual", "Contraseña nueva" y "Guardar contraseña"; al guardar: "Contraseña cambiada. Se cerraron tus otras
  sesiones."

## 9. Pruebas
- **Unitarias:** `puedeCambiar` (cada cambio, para un encargado, el propio dueño y otro dueño); el esquema de crear sin rol.
- **E2E** (`hu-02`): crear no ofrece el rol y crea un encargado; la ficha del propio dueño solo ofrece el nombre y
  Cambiar mi contraseña (con la actual equivocada da el error; bien, cambia y la vieja deja de servir); la ficha de otro
  dueño no tiene Editar ni "Más"; las acciones rechazan un dueño aunque se llamen a mano.

## 10. Orden de trabajo
Una rama, `p50-usuarios-dueno-protegido`, un PR.

## 11. Criterio de salida
Ninguna acción del panel crea un dueño ni le cambia el rol, la contraseña o el acceso a otro dueño. La guía de despliegue
dice cómo recuperar o crear un dueño.

## 12. Decisiones abiertas
- Contárselo al dueño: si quiere sumar un socio como dueño, se lo pide a YankoSoft.
