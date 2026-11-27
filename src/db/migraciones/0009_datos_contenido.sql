-- Textos iniciales del sitio (HU-08): borradores armados con la historia, la garantía y la entrevista del dueño.
-- Sin precios (RN-10). El dueño los corrige desde el panel. No pisa lo existente.
INSERT INTO "contenido_pagina" ("clave", "datos") VALUES
  ('inicio', jsonb_build_object(
    'lema', 'Como ven tu auto, te ven a ti',
    'presentacion', 'Somos un taller de detailing en Tarija. Pulimos, protegemos y renovamos tu vehículo por dentro y por fuera, con productos profesionales y cuidado en cada detalle.'
  )),
  ('nosotros', jsonb_build_object(
    'historia', 'TocTar Detailing empezó el 22 de junio de 2024. Después de trabajar en distintas ciudades, decidimos traer el servicio a Tarija. Empezamos en un garaje, con las máquinas más básicas, ofreciendo solo pulido y nano cerámico. Hoy también cuidamos el interior, los vidrios y los faroles de cada vehículo que llega al taller.',
    'como_trabajamos', 'Antes de cotizar preferimos ver tu vehículo en el taller; si no puedes venir, nos mandas fotos o un video y te damos un estimado. Te explicamos cada opción, reservas tu fecha con un adelanto y te avisamos cuando tu vehículo está listo. Al entregarlo, te damos un manual con los cuidados que necesita.',
    'por_que_elegirnos', jsonb_build_array(
      'Revisamos tu vehículo antes de darte un precio.',
      'Te explicamos cada opción con claridad.',
      'Trabajamos con productos profesionales.',
      'Cada trabajo se entrega con un manual de cuidados.'
    )
  )),
  ('contacto', jsonb_build_object(
    'bienvenida', 'Escríbenos por WhatsApp o pasa por el taller: revisamos tu vehículo y te damos una cotización.'
  ))
ON CONFLICT ("clave") DO NOTHING;
--> statement-breakpoint
INSERT INTO "faq" ("pregunta", "respuesta", "orden")
SELECT p.pregunta, p.respuesta, p.orden
FROM (VALUES
  ('¿Cuánto tiempo se queda mi vehículo?', 'Depende del servicio. Un pulido con nano cerámico toma alrededor de un día y medio; si haces más de un servicio, entre 2 y 3 días. Al reservar te confirmamos la fecha de entrega.', 1),
  ('¿Necesitan ver el vehículo para cotizar?', 'Es lo mejor: así el precio es exacto. Si no puedes venir, mándanos fotos o un video por WhatsApp y te damos un estimado, que confirmamos al ver el vehículo.', 2),
  ('¿Cómo reservo una fecha?', 'Escríbenos por WhatsApp. Cuando aceptas la cotización, reservas la fecha con un adelanto por QR o en efectivo, que se descuenta del total.', 3),
  ('¿Qué cubre la garantía?', 'Al entregar tu vehículo te damos un manual con los cuidados que necesita. La garantía cubre el trabajo realizado siempre que se sigan esas indicaciones.', 4),
  ('¿Cada cuánto se hace el mantenimiento del cerámico?', 'Recomendamos un mantenimiento periódico para que la capa dure lo que promete. Te avisamos cuando toque.', 5)
) AS p(pregunta, respuesta, orden)
WHERE NOT EXISTS (SELECT 1 FROM "faq");
