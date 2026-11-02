# P30 Saldos pendientes: buscar y ordenar: especificación

- **Fase y semana:** C. Entrega 2 · 1 de noviembre de 2026, punto 7 de los ajustes de la reunión con el dueño (`../ajustes-reunion-dueno.md`)
- **Estado:** aprobada (01/11/2026) y en curso en la rama `pedido-30-saldos`
- **Pedido:** 30 de `03-cierre-comercial/registro-de-cambios.md` ("le falta orden, buscar")
- **Historia que cambia:** HU-37 (saldos pendientes)

## Qué cambia
- **Buscar** por cliente (sin importar tildes ni mayúsculas), teléfono (3 dígitos o más) o placa, con el buscador de Clientes.
- **Ordenar** con tres pestañas: **Más antiguas** (la de siempre: la que más urge cobrar), **Mayor monto** y **Cliente** (A a Z). A igualdad, la más antigua primero.
- El **total por cobrar** sigue arriba y es el de todas, aunque se esté buscando.
- La búsqueda y el orden quedan en la dirección (`?q=` y `?orden=`): cambiar el orden conserva lo buscado.

## Reglas
La lista es chica (solo las órdenes que deben): se busca y se ordena sobre lo que trae la consulta, con dos reglas puras de `pagos/reglas.ts`, `filtrarSaldos` y `ordenarSaldos`, probadas en `tests/unit/pagos.test.ts`. Sin cambios en la base.

## Pruebas
- **Unitarias:** buscar por cliente con y sin tildes, teléfono y placa; los tres órdenes y el desempate.
- **E2E (`hu-37-saldos`):** buscar por cliente, placa y teléfono; ordenar por mayor monto y cliente conservando la búsqueda; el total no cambia al buscar; sin coincidencias, el mensaje.

## Terminado cuando
El dueño encuentra al instante el saldo de un cliente o una placa, y ve primero los más grandes cuando quiere.
