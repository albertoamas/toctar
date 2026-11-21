# P31b Cotización rápida, sin registrar al interesado — especificación

- **Fase y semana:** Cierre de la Entrega 2 · desde el 21/11/2026
- **Estado:** hecho (21/11/2026)
- **Historias:** HU-25 (cotizar), HU-28 (seguimiento), HU-30 (agendar)
- **Base:** pedido 31, parte 2 (`registro-de-cambios.md`), P31 (`P31-flujo-de-un-trabajo.md`), P40 (cotización en pasos), P23 (cotización directa), D-12 (la consulta agrupa las versiones)

## 1. Objetivo
El dueño (21/11): "Hay personas que vienen a cotizar y nunca vuelven: no los quiero registrados como clientes, sería llenar
la lista de basura. Una cotización es algo rápido: no me puedo poner a anotar todos los detalles del vehículo. Algo
interesante podría ser una foto para saber qué vehículo vino a cotizar."

Cotizar a alguien nuevo pide su **nombre, su WhatsApp y el tamaño del vehículo** (lo que da el precio); qué vehículo es,
en una línea, y **una foto**, opcionales. **No se registra nada en Clientes ni en Vehículos.** El cliente y su vehículo se
registran recién **al reservar**, con lo que la cotización ya tiene escrito.

Incluido, sin costo (decisión del 21/11).

## 2. Alcance
- **Incluye:**
  - Nueva cotización con alguien nuevo: nombre y WhatsApp (sin correo, NIT ni notas); el tamaño, "¿Qué vehículo es?"
    (opcional) y una foto (opcional). Si el WhatsApp ya es de un cliente, se ofrece usarlo (como hoy).
  - Con un cliente registrado, como hoy: se elige su vehículo o se registra otro.
  - Las cotizaciones de un interesado en la lista, la ficha, las versiones, el PDF, el enlace del cliente, el seguimiento
    por WhatsApp, "Por reservar" y los reportes.
  - Reservar la de un interesado: antes, "Registrar al cliente", con lo de la cotización ya escrito (nombre, WhatsApp,
    tamaño; la placa y los datos del vehículo se completan ahí). Con un WhatsApp que ya es de un cliente, se usa ese.
    Registrado, la cotización queda con él y la reserva sigue como siempre.
- **No incluye:** la placa opcional (pedido 29: ya no hace falta, la placa se pide al reservar); borrar interesados
  viejos; varias fotos.

## 3. Reglas que se cumplen
- **La consulta es de un cliente con su vehículo, o de un interesado** (nombre, WhatsApp y tamaño), nunca de ninguno: lo
  exige la base (`consulta_cliente_o_interesado`).
- Un interesado **no aparece en Clientes**. Al registrarse, pasa a ser cliente con su historia (la cotización queda con él).
- **Sin duplicados:** el WhatsApp es único entre los clientes; al cotizar y al registrar se busca por él.
- La foto, privada (datos del cliente), en `consulta_archivo`.
- RN-02 sin cambios: el PDF sale de la copia de los datos al cotizar (`datos_documento`).

## 4. Datos
Migración `0057_cotizacion_rapida`:
- `consulta.cliente_id` y `consulta.vehiculo_id`, opcionales.
- `consulta.interesado_nombre`, `interesado_telefono`, `interesado_vehiculo` (texto, opcional) y `interesado_tamano_id`.
- Restricción: `(cliente_id y vehiculo_id) o (interesado_nombre, interesado_telefono e interesado_tamano_id)`.
- Las cotizaciones que existen tienen cliente: no cambian.

Las lecturas toman el nombre, el WhatsApp y el tamaño del cliente y su vehículo o, si no hay, del interesado, en un solo
lugar (`cotizaciones/consultas/comun.ts`).

## 5. Pantallas
- **Nueva cotización, alguien nuevo:** paso Cliente con nombre y WhatsApp; paso Vehículo con el tamaño, "¿Qué vehículo
  es?" (opcional, "Hilux blanca") y "Foto del vehículo" (opcional); paso Servicios como hoy.
- **Lista y ficha:** el interesado con su nombre y, en vez de la placa, lo que se escribió del vehículo ("Sin registrar");
  la ficha muestra la foto. Sin enlace a la ficha del cliente hasta que se registre.
- **Reservar:** "Registrar al cliente" (nombre y WhatsApp; el vehículo con su placa y tamaño) y después la reserva.

## 6. Acciones del servidor
- `crearCotizacion`: con alguien nuevo, guarda al interesado y la foto; no crea cliente ni vehículo.
- `registrarInteresado` (nueva): crea el cliente (o usa el del WhatsApp) y el vehículo, y los pone en la consulta.
- `guardarVersion`, `cambiarEstadoCotizacion` y `agendarReserva`: con un interesado (sin cliente), lo que corresponde
  (el tamaño del interesado; aceptar sin revisar el vehículo; reservar pide registrarlo antes).

## 7. Pruebas
- **Unitarias:** la restricción de la consulta y el esquema del interesado.
- **De punta a punta:** cotizar a alguien nuevo no lo pone en Clientes y se ve en Cotizaciones con lo que se escribió y la
  foto; reservarla pide registrarlo y, registrado, queda en Clientes con la cotización; un WhatsApp que ya es de un cliente
  se usa.

## 8. Decisiones
Opción A (21/11): la cotización guarda al interesado, en vez de un "interesado" como estado del cliente (B), porque B
seguía pidiendo los datos del vehículo al cotizar.
