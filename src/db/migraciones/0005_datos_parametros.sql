-- Datos iniciales de los parámetros (HU-05): valores que dio el dueño (material-recibido.md y requerimientos).
-- No pisa datos existentes: se puede aplicar en cualquier entorno.
-- Los textos del PDF son un borrador hecho con la garantía que mandó el dueño; él los ajusta desde el panel.
INSERT INTO "parametro" ("clave", "valor") VALUES
  ('adelanto_sugerido', '200'::jsonb),
  ('validez_cotizacion_dias', '15'::jsonb),
  ('intervalo_mantenimiento_meses', '3'::jsonb),
  ('condiciones_cotizacion', to_jsonb('Los precios están en bolivianos e incluyen materiales y mano de obra. Para reservar la fecha se pide un adelanto, que se descuenta del total. Si al recibir el vehículo su estado es distinto al evaluado, se avisa el nuevo precio antes de empezar el trabajo.'::text)),
  ('garantia_cotizacion', to_jsonb('Al entregar el vehículo te damos un manual con los cuidados que necesita. La garantía cubre el trabajo realizado siempre que se sigan esas indicaciones; si no se siguen, TocTar Detailing no se hace responsable del resultado.'::text))
ON CONFLICT ("clave") DO NOTHING;
--> statement-breakpoint
-- Los 5 tamaños de vehículo del dueño (RN-07)
INSERT INTO "tamano_vehiculo" ("nombre", "descripcion", "orden")
SELECT t.nombre, t.descripcion, t.orden
FROM (VALUES
  ('Compactos', 'Suzuki Alto, Kia Picanto, Vitz, Swift', 1),
  ('Sedanes y hatchbacks medianos', 'Corolla, Sentra, Honda Civic, Mazda 3, Toyota Yaris', 2),
  ('Vagonetas medianas', 'RAV4, Tucson, Sportage, X-Trail', 3),
  ('Vagonetas grandes y camionetas', 'Land Cruiser Prado, Ford Explorer, Hilux, Ford Ranger', 4),
  ('Extra grandes', 'Tundra, Sequoia, trufis', 5)
) AS t(nombre, descripcion, orden)
WHERE NOT EXISTS (SELECT 1 FROM "tamano_vehiculo");
--> statement-breakpoint
-- Los 3 espacios del taller (RN-06), en la primera sucursal
INSERT INTO "espacio_taller" ("sucursal_id", "nombre", "orden")
SELECT s.id, e.nombre, e.orden
FROM (SELECT min("id") AS id FROM "sucursal") AS s,
     (VALUES ('Espacio 1', 1), ('Espacio 2', 2), ('Espacio 3', 3)) AS e(nombre, orden)
WHERE s.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "espacio_taller");
