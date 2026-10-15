-- Servicios iniciales (HU-07): los que TocTar ofrece según la entrevista (01-descubrimiento/entrevista.md).
-- Los resúmenes son borradores sin precios (RN-10); el dueño los corrige desde el panel.
-- Solo se cargan si todavía no hay servicios: se puede aplicar en cualquier entorno.
INSERT INTO "servicio" ("nombre", "slug", "resumen", "orden")
SELECT s.nombre, s.slug, s.resumen, s.orden
FROM (VALUES
  ('Pulido y nano cerámico', 'pulido-y-nano-ceramico', 'Corregimos la pintura con pulido y la protegemos con una capa de nano cerámico que dura de 1 a 10 años, según la que elijas.', 1),
  ('Lavado de interior', 'lavado-de-interior', 'Dejamos el interior de tu vehículo limpio y renovado. Elige entre lavado básico y premium.', 2),
  ('Limpieza de asientos por inyección y succión', 'limpieza-de-asientos-por-inyeccion-y-succion', 'Sacamos la suciedad profunda de los asientos: inyectamos el producto y lo succionamos con máquina.', 3),
  ('Pulido de vidrios', 'pulido-de-vidrios', 'Quitamos el ácido y las manchas de tus vidrios para que recuperen su transparencia.', 4),
  ('Restauración de faroles con polímero', 'restauracion-de-faroles-con-polimero', 'Devolvemos la claridad a los faroles opacos o amarillentos y los protegemos con polímero.', 5),
  ('Polarizado de vidrios', 'polarizado-de-vidrios', 'Instalamos lámina de polarizado para que tengas más privacidad y menos calor dentro del vehículo.', 6),
  ('Instalación de PPF', 'instalacion-de-ppf', 'Protegemos la pintura con una película transparente contra rayones, piedras y desgaste.', 7),
  ('Mantenimiento del nano cerámico', 'mantenimiento-del-nano-ceramico', 'Mantén tu nano cerámico como el primer día: lavado técnico, descontaminación y refuerzo de la capa.', 8)
) AS s(nombre, slug, resumen, orden)
WHERE NOT EXISTS (SELECT 1 FROM "servicio");
--> statement-breakpoint
-- Pasos del mantenimiento: el contenido que mandó el dueño (material-recibido.md)
UPDATE "servicio"
SET "pasos" = '[
  {"titulo": "Lavado técnico de carrocería", "detalle": "Lavado seguro, sin rayar la capa cerámica."},
  {"titulo": "Limpieza de llantas y neumáticos", "detalle": "Quitamos el polvo de freno y la suciedad pegada."},
  {"titulo": "Secado seguro con microfibra", "detalle": "Sin marcas ni rayones."},
  {"titulo": "Descontaminación de pintura", "detalle": "Sacamos los contaminantes que el lavado no quita."},
  {"titulo": "Inspección del recubrimiento", "detalle": "Revisamos cómo está la capa de nano cerámico."},
  {"titulo": "Refuerzo de la capa", "detalle": "Aplicamos producto cerámico para fortalecer la protección."}
]'::jsonb
WHERE "slug" = 'mantenimiento-del-nano-ceramico' AND "pasos" = '[]'::jsonb;
--> statement-breakpoint
-- Variantes (D-2: todo servicio tiene al menos una). Sin precios: llegan en C1.
INSERT INTO "variante" ("servicio_id", "nombre", "orden")
SELECT s.id, v.nombre, v.orden
FROM (VALUES
  ('pulido-y-nano-ceramico', '1 año', 1),
  ('pulido-y-nano-ceramico', '2 años', 2),
  ('pulido-y-nano-ceramico', '3 años', 3),
  ('pulido-y-nano-ceramico', '5 años', 4),
  ('pulido-y-nano-ceramico', '10 años', 5),
  ('lavado-de-interior', 'Básico', 1),
  ('lavado-de-interior', 'Premium', 2),
  ('limpieza-de-asientos-por-inyeccion-y-succion', 'Única', 1),
  ('pulido-de-vidrios', 'Única', 1),
  ('restauracion-de-faroles-con-polimero', 'Única', 1),
  ('polarizado-de-vidrios', 'Única', 1),
  ('instalacion-de-ppf', 'Única', 1),
  ('mantenimiento-del-nano-ceramico', 'Única', 1)
) AS v(slug, nombre, orden)
JOIN "servicio" s ON s."slug" = v.slug
WHERE NOT EXISTS (SELECT 1 FROM "variante");
