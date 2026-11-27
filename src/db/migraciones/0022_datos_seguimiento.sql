-- Días sin movimiento para resaltar una consulta que se enfría (HU-28, RF-35). Editable en Configuración.
-- No pisa datos existentes: se puede aplicar en cualquier entorno.
INSERT INTO "parametro" ("clave", "valor") VALUES ('dias_consulta_fria', '7'::jsonb)
ON CONFLICT ("clave") DO NOTHING;
