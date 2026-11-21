-- Pedido 56: el repintado de aros, un servicio que el dueño no mencionó al inicio. Se agrega a los servicios iniciales
-- (0007_datos_servicios.sql) con su resumen, su variante única (D-2) y los colores de partida del probador (el bronce
-- primero: el probador arranca con el primero, y uno oscuro casi no se ve sobre el sitio negro). Sin precios
-- (RN-10 en el sitio; en el catálogo los carga el dueño). El dueño corrige todo desde el panel.
-- Solo si todavía no existe (por su dirección o por su nombre): se puede aplicar en cualquier entorno.
INSERT INTO "servicio" ("nombre", "slug", "resumen", "colores", "orden")
SELECT
  'Repintado de aros',
  'repintado-de-aros',
  'Devolvemos el color a tus aros o les damos uno nuevo, con pintura resistente al calor del freno y a la suciedad del camino.',
  '[
    {"nombre": "Bronce", "hex": "#7a5530", "acabado": "satinado"},
    {"nombre": "Negro", "hex": "#141414", "acabado": "mate"},
    {"nombre": "Negro", "hex": "#0e0e0e", "acabado": "brillante"},
    {"nombre": "Grafito", "hex": "#3d4247", "acabado": "satinado"},
    {"nombre": "Plata", "hex": "#b9bdc2", "acabado": "brillante"},
    {"nombre": "Dorado", "hex": "#b08d3c", "acabado": "brillante"},
    {"nombre": "Blanco", "hex": "#e9e9e6", "acabado": "satinado"}
  ]'::jsonb,
  COALESCE((SELECT max("orden") FROM "servicio"), 0) + 1
WHERE NOT EXISTS (SELECT 1 FROM "servicio" WHERE "slug" = 'repintado-de-aros' OR lower("nombre") = 'repintado de aros');
--> statement-breakpoint
INSERT INTO "variante" ("servicio_id", "nombre", "orden")
SELECT s."id", 'Única', 1
FROM "servicio" s
WHERE s."slug" = 'repintado-de-aros' AND NOT EXISTS (SELECT 1 FROM "variante" v WHERE v."servicio_id" = s."id");
