# Recorrido visual del panel

Para revisar pantalla por pantalla antes de cerrar. Marca cada una al revisarla y anota debajo si necesita un cambio.
Todos los cambios del recorrido van en la rama `recorrido-visual` y salen en un solo Pull Request al final.

## General

- [x] Ingreso (pantalla de inicio de sesión)
- [x] Menú lateral de la computadora
  - Cambio: "Cerrar sesión" en rojo en el menú de la cuenta (rama `recorrido-visual`).
  - [x] Abierto
  - [x] Comprimido (solo íconos)
- [x] Menú del celular (el que se abre desde la barra negra)
- [x] Avisos (al guardar, al haber un error, versión nueva)
- [x] Sin acceso (cuando falta un permiso)
- [x] Página que no existe

## Inicio

- [x] Inicio
  - Cambio: la misma estructura con "menos es más" (prototipo 4): una sola marca por fila sin píldoras, fechas "7 nov.", tarjetas que no se salen en el iPhone.

## Operaciones

- [x] Agenda
  - Cambio: sin la hora aproximada (pedido 54; en el celular decía "a las a las 8:30"), sin la guía de colores, estados con punto sin píldora, días pasados apagados.
  - [x] Semana en la computadora
  - [x] Lista por día en la tablet
    - Cambio: empieza en hoy (los anteriores, plegados) y una reserva de varios días va una vez ("Siguen en el taller").
  - [x] Día a día en el celular
  - [ ] Cotizaciones por reservar (el desplegable de arriba)
- [x] Nueva reserva
  - Cambio: el indicador de pasos sin azul (también en Nueva cotización).
  - Cambio: "Atrás" en todos los pasos y "‹ Vehículo" en el celular. Solo el paso que se hace, con "Para …" en una línea; los pasos hechos se tocan en el indicador para volver; el resumen completo en el último paso (también en Nueva cotización).
  - [x] Paso 1: Cliente
    - Cambio: "Cliente nuevo" (se registra y la reserva sigue con él).
    - Cambio: en tarjetas como el vehículo, solo el nombre (sin placas ni WhatsApp); si se buscó por placa o teléfono, dice con qué coincidió. También en Nueva cotización.
  - [x] Paso 2: Vehículo
    - Cambio: se ve siempre (también con un solo vehículo), en tarjetas, con "Otro vehículo" para registrarlo ahí mismo.
  - [x] Paso 3: Servicios
    - Cambio: en pantalla ancha una fila por servicio con basurero; en el celular, un bloque con su título y el precio con su etiqueta. El total del pie a la derecha (también en Nueva cotización).
    - Cambio: con cotizaciones, al elegir "Reserva sin cotización" la lista de cotizaciones se va ("Usar una de sus cotizaciones" para volver).
  - [x] Paso 4: Fecha
    - Cambio: la fecha y el adelanto, en pasos separados; la fecha llega vacía (salvo desde un día libre de la Agenda). El monto del resumen en un renglón.
  - [x] Paso 5: Adelanto
    - Cambio: "¿Dejó adelanto?" sin respuesta elegida; con "Sí", el monto, cómo pagó y el comprobante. "Reservar" solo aquí.
- [x] Ficha de una reserva
    - Cambio: arriba solo "Más"; el WhatsApp junto al número del cliente; "Reservada" una vez (en los pasos); las fechas con su día; "Reservada el 20 nov. por …".
  - [x] Reprogramar
    - Cambio: "Ahora" con el día y el espacio.
  - [x] Cancelar
    - Cambio: un solo aviso del adelanto.
- [x] Órdenes
  - [x] En el taller
    - Cambio: tarjetas (2 columnas en pantalla ancha) con una sola marca (el problema o el estado), los pasos en el color del estado, la entrega con el mes en letras y lo que falta cobrar; los servicios, el primero "+ N más".
  - [x] Entregadas
    - Cambio: la fecha "17 nov." sin la hora; los servicios, el primero "+ N más".
- [x] Ficha de una orden
  - Cambio: el WhatsApp junto al cliente (con "Avisar" a la vista, en "Más"); la etiqueta solo en Recibida y En proceso; la entrega con su día; pagos "20 nov. · Dueño"; historial "20 nov., 15:55 · Dueño". Las fotos quedan con dos botones (en Android la galería no ofrece la cámara).
- [ ] Recibir vehículo
- [ ] Entregar vehículo (con la firma)
- [ ] Publicar en la galería
- [ ] Cotizaciones
  - [ ] Pendientes
  - [ ] Aceptadas
  - [ ] Rechazadas
- [ ] Nueva cotización
  - [ ] Paso 1: Cliente
  - [ ] Paso 2: Vehículo
  - [ ] Paso 3: Servicios y precio
- [ ] Ficha de una cotización
- [ ] Nueva versión de una cotización

## Clientes

- [ ] Clientes
- [ ] Nuevo cliente
- [ ] Ficha de un cliente
  - [ ] Agregar vehículo
  - [ ] Editar datos
- [ ] Ficha de un vehículo
- [ ] Cambiar el dueño de un vehículo
- [ ] Mantenimientos
  - [ ] Por avisar
  - [ ] Más adelante
  - [ ] Cerrados
- [ ] Reclamos
  - [ ] Pendientes
  - [ ] Todos
- [ ] Ficha de un reclamo

## Finanzas

- [ ] Saldos pendientes
  - [ ] Registrar pago
- [ ] Gastos
  - [ ] Registrar gasto
  - [ ] Anular gasto
- [ ] Reportes
  - [ ] Resumen
  - [ ] Ingresos
  - [ ] Gastos
  - [ ] Taller y clientes
  - [ ] Elegir fechas

## Administración

- [ ] Sitio web (portada de la sección)
  - [ ] Textos
  - [ ] Servicios
  - [ ] Página de un servicio
  - [ ] Galería
  - [ ] Preguntas frecuentes
- [ ] Catálogo y precios
- [ ] Servicio del catálogo (sus variantes y precios)
- [ ] Usuarios
- [ ] Nuevo usuario
- [ ] Ficha de un usuario
- [ ] Configuración (portada de la sección)
  - [ ] Negocio
  - [ ] Taller
  - [ ] Parámetros
  - [ ] Mensajes
