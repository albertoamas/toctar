# Capacitación del sistema de gestión — guía por rol

> **Para entregar al dueño y a los encargados:** el **Manual del panel**, dentro del propio sistema: el libro junto a "Cerrar sesión" abre `/panel/manual` (pedido 44), con su PDF para descargar. Es una página con la marca TocTar y una captura del celular en cada paso, en el orden del ciclo de un trabajo. Su fuente es `contenido/manual/` (el HTML, las capturas, el logo y el PDF); una copia para compartir por enlace está en claude.ai ([Manual del panel](https://claude.ai/artifact/TsmLggAGJyzf7h4eHWcLdN)). Esta guía es la interna: cómo dar la sesión. Si una pantalla del manual cambia, se vuelve a capturar, se regenera el PDF y se actualiza `contenido/manual/`. **Las capturas se sacan solo con los datos de demostración** (`npm run datos:demo`), nunca con clientes reales: el repositorio es público y lo versionado queda en la historia.

Guía corta para enseñar el panel a quien lo va a usar: el **dueño** y los **encargados**, según su perfil (**Taller** o **Atención**). Va en el orden en que se hace el trabajo en el taller. Cada parte dice qué se toca y dónde, con los nombres de los botones tal como aparecen.

- **Para quién:** el dueño de TocTar y sus encargados. El cliente no usa el sistema: no reserva ni tiene cuenta. Todo lo registra el personal.
- **Dónde se practica:** en `pruebas.toctardetailing.com`, con los datos de demostración (`npm run datos:demo`). Ahí se puede probar sin miedo: nada de lo que se haga llega al taller real.
- **Cuánto dura:** unos 60 minutos con el dueño (partes 1 a 4) y unos 30 con cada encargado (parte 1 y la de su perfil).
- **Cómo:** cada uno con su celular en la mano. YankoSoft muestra cada paso una vez, y después la persona lo hace sola mientras se mira.

## 1. Para todos: entrar y moverse

1. **Instalar la app.** En el celular, se abre la dirección del panel en el navegador y se elige **"Agregar a la pantalla de inicio"** (en el iPhone, desde "Compartir"). Queda un ícono de TocTar y se abre como una app.
2. **Ingresar.** Con el usuario y la contraseña que da el dueño. Después de varios intentos fallidos, el ingreso se bloquea unos minutos: si alguien olvida su contraseña, se la cambia el dueño en Usuarios.
3. **El menú.** En el celular, el botón de tres rayas arriba a la izquierda. Cada persona ve solo los módulos que su permiso le da.
4. **"Volver".** La flecha redonda junto al título lleva a la pantalla de la que se vino. Debajo del título dice adónde lleva ("Cliente", "Agenda", "Inicio"…).
5. **Los avisos.** Después de guardar, sale un aviso corto abajo ("Pago registrado.", "Cliente creado."). Si algo falta, el aviso dice "Revisa los campos marcados." y el campo con el problema queda marcado en rojo, con lo que hay que corregir.
6. **Salir sin guardar.** Si se intenta salir de un formulario con algo escrito, el sistema pregunta **"¿Salir sin guardar?"**. "Seguir editando" no pierde nada.
7. **Versión nueva.** Cuando YankoSoft sube una mejora, aparece **"Hay una versión nueva del sistema"** con **"Actualizar"**. Conviene tocarlo cuando no se está a mitad de un formulario.

## 2. Encargado con el perfil Taller

El perfil **Taller** recibe, trabaja, avisa y entrega los vehículos. **No ve precios, pagos ni saldos.** Su menú tiene **Inicio**, **Agenda** y **Órdenes**.

### El día empieza en Inicio
- **"Para hoy"**: los vehículos que llegan hoy, los que se entregan y los que están listos sin avisar.
- Cada fila se toca para abrir su reserva u orden.

### Recibir un vehículo (cuando llega al taller)
1. En **Agenda** (o desde Inicio) se abre la reserva del día y se toca **"Recibir vehículo"**.
2. **El checklist, parte por parte:** "Bien" con un toque, o **"Detalle"** si tiene un rayón, un golpe u otra cosa (con su foto). Si todo está bien, **"Marcar todas como bien"** de un toque.
3. **Observaciones** (opcional): lo que no está en el checklist, como objetos que deja el cliente o lo que pidió.
4. **"Recibir vehículo"**. La reserva pasa a ser una **orden**, y se abre.

### Trabajar la orden
- En la orden, el botón grande de arriba es siempre el paso siguiente: **"Empezar trabajo"** y, al terminar, **"Marcar listo"**.
- Las **fotos** del trabajo se agregan en la orden: las del inicio y las del final.
- Si algo se marcó por error, en **"Más"** se puede volver un paso atrás ("Volver a en proceso").
- **"Extender entrega"** (en "Más") mueve la fecha si el trabajo se atrasa.

### Avisar y entregar
1. Con la orden lista, **"Avisar por WhatsApp"** abre el WhatsApp con el mensaje armado ("su vehículo está listo").
2. Cuando el cliente viene, **"Entregar vehículo"**: el cliente firma en la pantalla (**"Firma del cliente"**). Si no puede firmar, **"Entregar sin firma"** pide el motivo.
3. Si el cliente todavía debe, la entrega solo la puede autorizar quien tiene ese permiso (**"Autorizar entrega con saldo"**). Si no, se llama al dueño.

## 3. Encargado con el perfil Atención

**Atención** hace todo lo de Taller y además trata con los clientes: los registra, les cotiza, les cobra y les avisa el mantenimiento. Su menú suma **Clientes**, **Cotizaciones**, **Saldos pendientes** y **Mantenimientos**.

### Clientes
- **"Agregar cliente"**: nombre, WhatsApp y su vehículo (la placa y el tamaño). Lo demás (correo, NIT, notas) es opcional.
- Si el teléfono o la placa ya existen, el sistema lo avisa y ofrece abrir la ficha que ya está, para no tener al mismo cliente dos veces.
- En la **ficha del cliente** están sus vehículos, sus reservas, sus cotizaciones y sus mantenimientos. Nada se borra: un cliente o un vehículo que ya no va se **desactiva** (en "Más").

### Cotizar
1. **"Nueva cotización"** (en Cotizaciones o en la ficha del cliente), en tres pasos: **Cliente**, **Vehículo** y **Servicios y precio**.
2. Cada servicio trae el precio del catálogo para el tamaño del vehículo. Se puede ajustar, y se puede sumar un descuento.
3. Al crearla queda su **PDF**. Con **"Compartir"** se manda por WhatsApp.
4. Cuando el cliente responde: **"Aceptó"** (queda en **"Por reservar"** de la Agenda) o **"Rechazar"** (en "Más", con el motivo).
5. **Una cotización enviada no cambia su precio ni su PDF.** Si hay que cambiar algo, **"Nueva versión"** (en "Más"): la anterior queda como estaba.

### Reservar
1. **"Nueva reserva"** (en Agenda, desde una cotización aceptada con **"Reservar en Agenda"**, o tocando un día libre del tablero), en cuatro pasos: **Cliente**, **Vehículo**, **Servicios** y **Fecha y adelanto**.
2. El sistema solo ofrece los **espacios libres** en esas fechas.
3. **El adelanto:** el monto, cómo pagó (efectivo, QR, transferencia) y la foto del comprobante. O **"Sin adelanto"**.
4. Desde la reserva se puede **"Reprogramar"** o **"Cancelar reserva"** (en "Más", con el motivo; los pagos quedan registrados).

### Cobrar y saldos
- **"Registrar pago"** en la reserva o en la orden: el monto (nunca más que el saldo), el método y el comprobante.
- **Saldos pendientes:** quién debe y cuánto, de las órdenes ya entregadas. Desde cada fila se escribe por WhatsApp o se registra el pago.
- Un pago mal cargado no se borra: se **anula** con el motivo.

### Mantenimientos
- Los servicios con mantenimiento programan el próximo al entregarse (por ejemplo, el nano cerámico cada 3 meses).
- En **Mantenimientos**, la pestaña **"Por avisar"**: **"Avisar"** abre el WhatsApp con el mensaje; **"Reservar"** arma la reserva; **"No le interesa"** lo cierra.

## 4. Dueño

El dueño ve y hace todo lo anterior, ve todos los precios y además maneja lo que es solo suyo.

### Inicio
- Los números del día: **Por cobrar**, **En el taller**, **Llegan hoy**, **Cotizaciones** y **Mantenimientos**. Cada tarjeta lleva a su lista.
- **"Para atender"**: lo que espera una acción, como un reclamo nuevo, una cotización sin respuesta o una aceptada sin fecha.

### Catálogo y precios (solo el dueño)
- Cada servicio con sus **variantes** (por ejemplo 1, 2, 3, 5 y 10 años) y su **precio por tamaño** de vehículo.
- **"Agregar servicio"** pide solo el nombre. Después se cargan las variantes y los precios. Un precio vacío se muestra como "Según evaluación".
- Cambiar un precio no cambia las cotizaciones ya enviadas. El historial de cada precio queda guardado ("Ver historial").
- **Los precios no salen en el sitio.**

### Sitio web
- **Servicios:** la página de cada servicio en el sitio, con sus beneficios, sus pasos y su foto, y si se muestra o no.
- **Galería:** las fotos de antes y después. Desde una orden entregada, **"Publicar en la galería"** las pasa sin volver a subirlas.
- **Textos** y **Preguntas frecuentes** del sitio.

### Reclamos
- Llegan desde la página "Garantía y reclamos" del sitio. La lista abre en **"Pendientes"**.
- En cada reclamo: **"Escribir por WhatsApp"** y, al resolverlo, **"Marcar como atendido"** con lo que se hizo.

### Usuarios (solo el dueño)
- **"Agregar usuario"**: nombre, usuario, contraseña inicial y rol.
- El encargado se arma con un **perfil** que marca sus permisos de un toque: **Taller**, **Atención** o **Todo**. Después se puede ajustar cada casilla. El permiso **"Entrega con saldo"** es aparte.
- Un usuario que ya no trabaja se **desactiva** (no se borra). Desde su ficha también se le cambia la contraseña.

### Configuración (solo el dueño)
- **Negocio:** nombre, WhatsApp, dirección, horarios, redes y el logo de los documentos.
- **Taller:** los **espacios** del taller, los **tamaños** de vehículo con sus ejemplos y las **partes del checklist**.
- **Parámetros:** el adelanto sugerido, cuántos días vale una cotización y a los cuántos días una sin respuesta pide atención.
- **Mensajes:** el texto de cada mensaje de WhatsApp ("listo", saldo, mantenimiento…), con su propio tono.

## 5. Cosas que conviene saber

- **Nada se borra.** Clientes, vehículos, servicios y usuarios se desactivan; los pagos se anulan con motivo. Así siempre queda la historia.
- **Las fechas y horas** se muestran en hora de Bolivia.
- **Sin internet no se guarda.** Arriba sale "Sin conexión. Los cambios no se guardarán hasta que vuelva internet." Se espera a que vuelva la señal y recién entonces se guarda.
- **Las fotos de los clientes** (comprobantes, reclamos, checklist) son privadas: solo se ven dentro del panel. Al sitio solo llega lo que el dueño publica en la galería.
- **Ante una duda o un error**, una captura de pantalla por WhatsApp a YankoSoft.

## 6. Lista para la sesión

- [ ] Datos de demostración cargados en `pruebas.toctardetailing.com`.
- [ ] Un usuario de cada perfil creado para practicar (Taller y Atención).
- [ ] Cada persona instaló la app en su celular e ingresó con su usuario.
- [ ] Taller: recibió un vehículo con un detalle y su foto, lo marcó listo, avisó y lo entregó con firma.
- [ ] Atención: registró un cliente, le cotizó, compartió el PDF, lo reservó con adelanto y registró un pago.
- [ ] Dueño: cambió un precio, armó un usuario con su perfil, cambió el mensaje de "listo" y publicó un trabajo en la galería.
- [ ] Las dudas que salieron, anotadas para responderlas o para el registro de cambios.
