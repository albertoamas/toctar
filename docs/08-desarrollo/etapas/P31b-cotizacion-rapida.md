# P31b Cotización rápida, sin registrar al interesado — especificación

- **Fase y semana:** Cierre de la Entrega 2 · desde el 21/11/2026
- **Estado:** hecho (21/11/2026)
- **Historias:** HU-25 (cotizar), HU-28 (seguimiento), HU-30 (agendar)
- **Base:** pedido 31, parte 2 (`registro-de-cambios.md`), P31 (`P31-flujo-de-un-trabajo.md`), P40 (cotización en pasos), P23 (cotización directa), D-12 (la consulta agrupa las versiones)

## 1. Objetivo
El dueño (21/11): "Hay personas que vienen a cotizar y nunca vuelven: no los quiero registrados como clientes, sería llenar
la lista de basura. Una cotización es algo rápido: no me puedo poner a anotar todos los detalles del vehículo. Algo
interesante podría ser una foto para saber qué vehículo vino a cotizar."

Cotizar a alguien nuevo pide su **nombre, su WhatsApp, la placa y el tamaño del vehículo** (lo que da el precio), y
**una foto** opcional. **No se registra nada en Clientes ni en Vehículos.** El cliente y su vehículo se registran recién
**al reservar**, con lo que la cotización ya tiene escrito.

Incluido, sin costo (decisión del 21/11). Ajuste del 22/11, a pedido del desarrollador tras hablar con el dueño: del auto,
lo que el dueño quiere es la placa (antes era "¿Qué vehículo es?", opcional), y reservar usa los pasos de siempre de la
reserva (antes, una pantalla aparte "Registrar al cliente" que se sentía fuera del flujo).

## 2. Alcance
- **Incluye:**
  - Nueva cotización con alguien nuevo: nombre y WhatsApp (sin correo, NIT ni notas); la placa, el tamaño y una foto
    (opcional). Si el WhatsApp o la placa ya son de un cliente, se ofrece cotizarle a él.
  - Con un cliente registrado, como hoy: se elige su vehículo o se registra otro.
  - Las cotizaciones de un interesado en la lista (también se buscan por su placa), la ficha, las versiones, el PDF, el
    enlace del cliente, el seguimiento por WhatsApp, "Por reservar" y los reportes.
  - Reservar la de un interesado: los pasos de siempre, **Cliente → Vehículo → Fecha → Adelanto**, ya escritos con lo de la
    cotización (sin Servicios: son los de la cotización). El cliente y el vehículo se registran **con la reserva**, en la
    misma transacción: si no se termina, no queda nadie en Clientes. Con un WhatsApp que ya es de un cliente, la reserva
    queda con él (empieza en el vehículo; si la placa ya es de un vehículo suyo, se usa ese).
- **No incluye:** borrar interesados viejos; varias fotos.

## 3. Reglas que se cumplen
- **La consulta es de un cliente con su vehículo, o de un interesado** (nombre, WhatsApp y tamaño), nunca de ninguno: lo
  exige la base (`consulta_cliente_o_interesado`). La placa la pide la pantalla (las de antes del 22/11 no la tienen).
- Un interesado **no aparece en Clientes**. Al reservar, pasa a ser cliente con su historia (la cotización queda con él).
- **Sin duplicados:** el WhatsApp y la placa son únicos entre los clientes; al cotizar y al reservar se busca por ellos.
- La foto, privada (datos del cliente), en `consulta_archivo`.
- RN-02 sin cambios: el PDF sale de la copia de los datos al cotizar (`datos_documento`).

## 4. Datos
Migraciones `0057_cotizacion_rapida`, `0058_sin_vehiculo_del_interesado` y `0059_placa_del_interesado` (D-14):
- `consulta.cliente_id` y `consulta.vehiculo_id`, opcionales.
- `consulta.interesado_nombre`, `interesado_telefono`, `interesado_placa` (normalizada como la del vehículo) e
  `interesado_tamano_id`.
- Restricción: `(cliente_id y vehiculo_id) o (interesado_nombre, interesado_telefono e interesado_tamano_id)`.
- Las cotizaciones que existen tienen cliente: no cambian.

Las lecturas toman el nombre, el WhatsApp, la placa y el tamaño del cliente y su vehículo o, si no hay, del interesado, en
un solo lugar (`cotizaciones/consultas/comun.ts`).

## 5. Pantallas
- **Nueva cotización, alguien nuevo:** paso Cliente con nombre y WhatsApp; paso Vehículo con la placa, el tamaño y "Foto
  del vehículo" (opcional); paso Servicios como hoy.
- **Lista y ficha:** el interesado con su nombre, su placa y "Sin registrar"; la ficha muestra la foto. Sin enlace a la
  ficha del cliente hasta que se registre.
- **Reservar:** Nueva reserva con los pasos Cliente y Vehículo escritos (en el del vehículo, la foto), y la fecha y el
  adelanto como siempre.

## 6. Acciones del servidor
- `crearCotizacion`: con alguien nuevo, guarda al interesado y la foto; no crea cliente ni vehículo. Revisa el WhatsApp y
  la placa repetidos.
- `agendarReserva`: desde la cotización de un interesado, crea el cliente (o usa el del WhatsApp) y el vehículo con la
  reserva, y los pone en la consulta (solo si sigue sin cliente). Es de quien tiene «Clientes».
- `guardarVersion` y `cambiarEstadoCotizacion`: con un interesado, el tamaño del interesado; aceptar sin revisar el vehículo.

## 7. Pruebas
- **Unitarias:** el paso del vehículo del interesado (placa y tamaño) y el mensaje de WhatsApp.
- **De punta a punta (`hu-25`):** cotizar a alguien nuevo no lo pone en Clientes y se ve en Cotizaciones con su placa y la
  foto; una placa registrada ofrece cotizarle a su dueño; reservarla llega con sus pasos escritos y, al reservar, queda
  en Clientes con la cotización; un WhatsApp que ya es de un cliente se usa.

## 8. Decisiones
- Opción A (21/11): la cotización guarda al interesado, en vez de un "interesado" como estado del cliente (B), porque B
  seguía pidiendo los datos del vehículo al cotizar.
- 22/11: la placa en vez de "¿Qué vehículo es?"; reservar con los pasos de siempre en vez de la pantalla "Registrar al
  cliente": todo lo que se crea dentro de otra tarea va en sus pasos (Cliente → Vehículo), y se guarda junto con ella.
