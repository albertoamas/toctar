# Acta de aceptación — Entrega 2 (Gestión)

- **Proyecto:** sitio web y sistema de gestión de TocTar Detailing (Tarija)
- **Proveedor:** YankoSoft
- **Acuerdo:** `03-cierre-comercial/acuerdo.md` (9 de octubre de 2026), opción **Web + Gestión — Bs 3.900**
- **Estado:** **borrador** (11/11/2026). Se confirma junto con la Entrega 1 (`entrega-1.md`); con las dos aceptadas, todo pasa a producción (`main`, versiones `v1.0.0` y `v2.0.0`).
- **Criterios:** `09-pruebas/criterios-entrega-2.md` (HU-19 a HU-41)

> Este documento no lleva datos personales del dueño (nombre completo, carnet, NIT). Se completan en la copia impresa o en el mensaje de WhatsApp con el que se confirma, que se guarda fuera del repositorio.

## 1. Qué se entrega

El sistema de gestión del taller, dentro del mismo panel, en el orden en que se trabaja:

- **Clientes y vehículos:** el registro, la búsqueda y la ficha de cada cliente, con su historia. Cambiar el dueño de un vehículo.
- **Catálogo y precios:** servicios con variantes, un precio por tamaño de vehículo y su historial, y cada cuánto se hace su mantenimiento.
- **Cotizaciones:** en pasos, con su PDF para compartir por WhatsApp. Versiones sin cambiar lo ya enviado, "Aceptó" y "Rechazar".
- **Agenda:** el tablero por espacios del taller y Nueva reserva en pasos, desde una cotización o directa. Reprogramar y cancelar sin cruces entre reservas.
- **Órdenes:**
  - recibir con el checklist parte por parte y sus fotos;
  - trabajar con fotos del inicio y del final;
  - avisar que está listo por WhatsApp;
  - entregar con la firma del cliente.
- **Pagos:** adelantos con comprobante, el saldo de cada trabajo, anular con motivo y la lista de saldos pendientes.
- **Mantenimientos:** los próximos por avisar, reservarlos o cerrarlos.
- **La pantalla del día** (Inicio), los **mensajes de WhatsApp** con el tono del negocio y **publicar en la galería** las fotos de una orden.
- **Dos roles:** el dueño y el encargado, con perfiles Taller, Atención y Todo. Sin los permisos de Pagos o de Cotizaciones no se ven los precios.
- **El manual del panel,** dentro del sistema (el libro junto a "Cerrar sesión"), con su PDF.

Los cambios que pidió el dueño durante el desarrollo y que quedaron hechos están en `03-cierre-comercial/registro-de-cambios.md` (entre otros, los pedidos 12, 13, 20, 21, 23, 24, 26 a 28, 30 a 32 y 37 a 44).

## 2. Cómo se comprobó

- **Pruebas automáticas** en un celular (Pixel 7) y en una computadora, en cada cambio, con los flujos críticos de punta a punta: más de 430 pruebas, y ningún cambio entra si alguna falla.
- **Revisión manual de YankoSoft** del ciclo completo con cada rol, a 390 y 1280 px (`criterios-entrega-2.md`).
- **Reunión de revisión con el dueño** (01/11/2026): sus ajustes están hechos (pedidos 12, 13, 21, 23, 24, 26, 27, 28 y 30 de `03-cierre-comercial/registro-de-cambios.md`).
- **Revisiones de seguridad y la auditoría de calidad** del 03/11/2026 (`09-pruebas/auditoria-qa-2026-11-03.md`).

## 3. Lo que queda pendiente al firmar

Nada de esto impide aceptar la entrega:

| Qué | Quién |
|---|---|
| La prueba completa en `pruebas.toctardetailing.com` desde celulares reales (Android y iPhone) con cada perfil: compartir el PDF, la foto del comprobante, la firma | YankoSoft, con el dueño |
| La lista de precios real y las condiciones, garantía y formas de pago del PDF | El dueño |
| La capacitación del dueño y de los encargados (`10-lanzamiento/capacitacion.md`) | YankoSoft |

**Pedidos que quedan fuera de esta entrega,** con su tratamiento en el registro de cambios:
- **14:** cotizado aparte.
- **15 y 16:** planilla y reportes, que son el Sistema completo.
- **17, 19 y 22:** por confirmar con el dueño.
- **29 y 31, parte 2:** vehículos sin placa y cotizar sin registrar al cliente, por definir.

## 4. Condiciones

- **Garantía:** 30 días desde la aceptación. Corregir errores nunca se descuenta de la bolsa de horas.
- **Pago al aceptar esta entrega:** **Bs 2.000** (transferencia, QR o efectivo). Con él, TocTar recibe una copia del código.
- **Sistema completo** (inventario, asistencia, planilla, caja y reportes): se puede sumar dentro de los 90 días posteriores a la entrega por Bs 2.000.
- Si en 5 días hábiles desde la entrega no hay observaciones por escrito, se considera aceptada (`acuerdo.md`).

## 5. Aceptación

TocTar Detailing recibe la Entrega 2 (Gestión) descrita arriba y la acepta.

- **Observaciones del dueño:** ______________________________________________
- **Fecha:** ____ / ____ / 2026
- **Por TocTar Detailing (nombre y firma, o confirmación por WhatsApp):** ______________________________
- **Por YankoSoft:** ______________________________
