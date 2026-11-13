-- Pedido 49 (docs/08-desarrollo/etapas/P49-politica-de-privacidad.md): el texto inicial de la política de privacidad, del
-- borrador de 10-lanzamiento/politica-de-privacidad.md. El dueño lo corrige desde el panel. Los datos del negocio van entre
-- llaves y los completa el sitio con Configuración. No pisa lo existente.
INSERT INTO "contenido_pagina" ("clave", "datos") VALUES
  ('privacidad', jsonb_build_object(
    'presentacion', 'En {negocio} cuidamos los datos que nos confías. Aquí te contamos qué datos guardamos, para qué los usamos y cómo puedes pedir que los cambiemos o los borremos.',
    'quienes_somos', '{negocio}, taller de detailing automotriz en {direccion}. Para cualquier consulta sobre tus datos, escríbenos por WhatsApp al {whatsapp} o al correo {correo}.',
    'que_datos', 'Si nos dejas un reclamo en la página Garantía y reclamos:
- tu nombre, tu teléfono y la placa de tu vehículo;
- el servicio y lo que nos cuentas;
- las fotos que adjuntes, hasta 3.

Para evitar envíos automáticos y abusos, también guardamos un código de tu conexión: una versión cifrada de tu dirección de internet (IP), que no sirve para saber quién eres.

Si eres cliente del taller, los datos los registra nuestro personal (tú no tienes cuenta en el sistema):
- tu nombre, tu teléfono y, si nos los das, tu correo, tu NIT y tu razón social para la factura;
- los datos de tu vehículo: placa, marca, modelo, año y color;
- las cotizaciones, las reservas, los trabajos y los pagos, con los comprobantes que nos envíes;
- las fotos de tu vehículo al recibirlo y al terminar el trabajo, y lo que revisamos al recibirlo;
- tu firma al retirar el vehículo, como constancia de que lo recibiste conforme (no es una firma certificada).

No pedimos datos que no necesitamos para atenderte: ni tu carnet de identidad, ni datos de tarjetas o cuentas bancarias.',
    'para_que', '- Para cotizar, agendar y hacer el trabajo en tu vehículo.
- Para avisarte por WhatsApp cuando tu vehículo está listo y cuando le toca un mantenimiento. Te escribe una persona del taller: no son mensajes automáticos.
- Para responder tus reclamos y cumplir la garantía.
- Para nuestras cuentas: los pagos y los saldos.

No vendemos ni compartimos tus datos con nadie para publicidad. Las fotos de trabajos que mostramos en la galería del sitio no dejan ver la placa ni a ninguna persona.',
    'quien_los_ve', 'Solo el dueño y el personal autorizado del taller, cada uno con los permisos de su función. El sistema y las fotos se guardan con proveedores que cuidan su seguridad:
- Hetzner, donde funciona el sistema;
- Cloudflare, donde se guardan las fotos y los documentos, en un espacio privado al que solo accede nuestro sistema.

Si nos escribes por WhatsApp, esa conversación la maneja WhatsApp (Meta), con sus propias reglas.',
    'cuanto_tiempo', '- Datos de clientes y trabajos: mientras seas cliente y hasta 5 años después del último trabajo, por la garantía y nuestras cuentas.
- Reclamos: hasta 2 años después de atenderlos.

Pasado ese tiempo, los borramos.',
    'cookies', 'Este sitio no usa cookies de publicidad ni de seguimiento, ni herramientas que midan tus visitas.
- Para recordar que cerraste el globito de WhatsApp, tu navegador guarda una marca que se borra al cerrar la pestaña.
- El mapa de la página Contacto es de Google Maps: al verlo, Google puede guardar sus propias cookies, según sus reglas.
- El panel del personal usa una cookie para mantener la sesión iniciada. Solo la tienen el dueño y los encargados, no los visitantes.',
    'derechos', 'Puedes pedirnos en cualquier momento que te digamos qué datos tuyos tenemos, que los corrijamos o que los borremos. Escríbenos por WhatsApp o por correo, y te respondemos en un plazo de 10 días hábiles.

Algunos datos los tenemos que conservar un tiempo más, por ejemplo los de un pago o los de un trabajo con garantía vigente. Si es así, te lo explicamos.',
    'cambios', 'Si cambiamos algo, lo publicamos en esta página con la nueva fecha de actualización.'
  ))
ON CONFLICT ("clave") DO NOTHING;
