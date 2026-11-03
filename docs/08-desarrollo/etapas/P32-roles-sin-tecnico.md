# P32 Dos roles, sin técnico asignado — especificación

- **Fase y semana:** C. Entrega 2 · 2 de noviembre de 2026, después del recorrido manual de la Entrega 2
- **Estado:** aprobada (02/11/2026, enfoque A) y en curso en la rama `pedido-32-roles-sin-tecnico`
- **Pedido:** 32 de `03-cierre-comercial/registro-de-cambios.md`
- **Historias que cambian:** HU-02 (roles), HU-03 (permisos del encargado), HU-30 (agendar), HU-33 (recibir), HU-34 (órdenes del técnico, pasa a "Trabajar una orden"), HU-39 (inicio)
- **Base:**
  - Requisitos: RN-12 (cambia), RNF-05; supuesto S-1 (cambia).
  - Lo que dejó B1 (`B1-acceso.md`): los tres roles y la matriz de permisos (`src/lib/permisos.ts`).
  - Lo que dejó C4 (`C4-taller-entrega.md`): el técnico asignado a la orden (`trabajo.tecnico_id`) y que solo ve las suyas.

## 1. Objetivo
Que el sistema refleje cómo trabaja TocTar: cuatro personas (el dueño, el encargado y dos chicos) que hacen de todo, sin un técnico por auto. Nadie asigna un técnico a una reserva ni a una orden; todos los que tienen el permiso de Órdenes ven y trabajan todas, y cada orden guarda quién hizo cada paso. Quedan dos roles, **Dueño** y **Encargado**, y lo que hace cada encargado sale de sus permisos, con **perfiles** que los marcan de un toque.

## 2. Alcance
- **Incluye:**
  - **Sin asignación:** se quitan el campo "Técnico" de la reserva y de recibir, la fila "Técnico" de la orden y de la reserva, la columna de las listas y el nombre del técnico en los bloques de la agenda.
  - **Dos roles:** se quita el rol Técnico. Lo que cuidaba (no ver precios, pagos ni teléfonos) ya lo cuidan los permisos del encargado: sin "Pagos" ni "Cotizaciones" no se ven montos.
  - **Perfiles en Usuarios:** al crear o editar un encargado, tres botones marcan sus casillas: **Taller** (Agenda y Órdenes), **Atención** (Taller más Clientes, Cotizaciones, Pagos y Mantenimientos) y **Todo**. Después se puede ajustar cada casilla. Un encargado nuevo empieza con "Taller" marcado.
  - **Migración:** cada técnico pasa a encargado con el perfil Taller, y la columna `trabajo.tecnico_id` se borra.
  - El inicio y las órdenes son los mismos para todos los encargados (ya no hay "Mis órdenes").
- **No incluye** (y dónde queda):
  - Un registro de "quién trabajó en el auto" aparte: ya lo dice el historial de cada orden (quién la recibió, la empezó, la marcó lista, subió cada foto y la entregó).
  - Ocultar el teléfono del cliente a un encargado: el dueño dijo que no tiene relevancia (02/11). Lo ve quien tiene Clientes u Órdenes, como hoy.

## 3. Reglas que se cumplen

| Regla | Qué dice | Cómo se garantiza |
|---|---|---|
| RN-12 (cambia) | Antes: el técnico no ve precios, pagos ni teléfonos; solo sus órdenes. Ahora: **quien no tiene "Pagos" ni "Cotizaciones" no ve precios, montos ni saldos**; las órdenes las ve todo el que tiene "Órdenes" | `puedeVerModulo(sujeto, "pagos")` y `puede(sujeto, "cotizar")` en `src/lib/permisos.ts`, como ya hacen la orden, la reserva y el aviso de WhatsApp |
| S-1 (cambia) | Antes: el técnico ve solo las órdenes asignadas. Ahora: no hay asignación | Sin `trabajo.tecnico_id` en la base |
| RNF-05 | Permisos en el servidor | Cada página y acción sigue con `exigirModulo` y `puede`; desaparece `puedeVerOrden` porque ya no hay órdenes ajenas |
| RNF-10 | Quién hizo qué | Sin cambios: `trabajo_avance.usuario_id` (cada cambio de estado y cada avance), `trabajo.recibido_por`, `trabajo.entregado_por` y `trabajo_foto.subido_por` |
| RN-14 | Los usuarios se desactivan, no se borran | Sin cambios: la migración cambia el rol, no borra a nadie |

## 4. Datos

**Decisión (D-13):** el rol del usuario es `dueno` o `encargado`; un encargado sin permisos solo ve el inicio. Las órdenes no tienen técnico: lo que importa de quién hizo cada paso ya está en el historial de la orden.

**Migración `0042_dos_roles`:**
1. Cada `usuario` con rol `tecnico` pasa a `encargado`, y recibe en `usuario_permiso` los permisos del perfil Taller (`agenda`, `ordenes`).
2. `usuario.rol`: la restricción `usuario_rol_valido` pasa a `('dueno', 'encargado')` y el valor por defecto a `encargado` (también el `defaultRole` de Better Auth).
3. `trabajo`: se borran el índice `trabajo_por_tecnico` y la columna `tecnico_id`.

Los perfiles no se guardan: son atajos de la pantalla que marcan casillas (`PERFILES` en `src/lib/permisos.ts`). Lo que se guarda son los permisos, como hoy.

## 5. Pantallas y rutas

| Ruta | Qué cambia |
|---|---|
| `/panel/usuarios/nuevo` y `/panel/usuarios/[id]` | Rol: Dueño o Encargado. Con Encargado, "Perfil" con tres botones (Taller, Atención, Todo) sobre las casillas; el que coincide con lo marcado se ve presionado. Un encargado nuevo empieza con Taller |
| `/panel/usuarios` | La columna del rol dice Dueño o Encargado |
| `/panel/agenda/nueva` | Sin el campo "Técnico" |
| `/panel/agenda/[id]` | Sin la fila "Técnico" |
| `/panel/agenda` | Los bloques dicen placa, servicio y estado |
| `/panel/ordenes/[id]/recibir` | Sin el campo "Técnico": el checklist, las observaciones y "Recibir vehículo" |
| `/panel/ordenes/[id]` | Sin la fila "Técnico" |
| `/panel/ordenes` | "Órdenes" para todos, sin la columna del técnico |
| `/panel` | El inicio del encargado, según sus permisos (ya no hay inicio de técnico) |

## 6. Acciones del servidor
- `crearUsuario` y `actualizarUsuario`: el esquema acepta `dueno` o `encargado`; los permisos se guardan solo para el encargado (sin cambios).
- `agendarReserva` y `recibirVehiculo`: sin `tecnicoId` en el esquema ni en lo que escriben.
- `cambiarEstadoOrden`, `subirFotoOrden`, `quitarFotoOrden` y `agregarAvance`: con el módulo Órdenes alcanza (ya no comparan el técnico de la orden).

## 7. Componentes y diseño
Sin componentes nuevos: los perfiles son botones `outline` con `aria-pressed`, en una fila sobre las casillas (`formulario-usuario.tsx`).

## 8. Textos de la interfaz
- Rol Encargado: "Lo que marques en sus permisos. Nunca cambia la configuración, el catálogo ni los usuarios."
- Perfil: título "Perfil"; ayuda "Marca sus casillas de un toque; después puedes ajustarlas."; botones "Taller", "Atención" y "Todo", cada uno con su descripción para el lector de pantalla ("Taller: agenda y órdenes").
- Lo demás pierde textos: "Técnico", "Sin técnico", "Sin asignar", "Mis órdenes", "No tienes órdenes asignadas".

## 9. Pruebas
- **Unitarias:** la matriz de permisos con dos roles (`permisos`); los perfiles (Taller dentro de Atención, Todo con todos, y ninguno con un permiso que no exista); el esquema de usuarios rechaza `tecnico`.
- **E2E:**
  - `hu-02`: crear un encargado con el perfil Taller (empieza marcado) y cambiarlo a Atención.
  - `hu-34-ordenes-tecnico` pasa a `hu-34-trabajar-orden`: un encargado con el perfil Taller ve todas las órdenes, empieza una, sube la foto de inicio y la marca lista, y no ve montos.
  - Las pruebas que usaban un técnico para probar "sin acceso" usan un encargado sin ese permiso.
  - `flujo-taller-completo` sigue pasando con un encargado del perfil Taller.

## 10. Orden de trabajo
Una rama, `pedido-32-roles-sin-tecnico`, con un commit por parte: la especificación; la migración y los roles; permisos y usuarios; la asignación fuera de agenda, recibir y órdenes; las pruebas; los documentos.

## 11. Criterio de salida
El dueño crea a los chicos como encargados con el perfil Taller, y ellos reciben, trabajan y entregan cualquier auto sin que nadie les asigne nada. En la orden se ve quién hizo cada paso.

## 12. Decisiones abiertas
Ninguna. El dueño respondió el 02/11 que los chicos pueden ver precios, saldos y el teléfono del cliente si se les marca el permiso.
