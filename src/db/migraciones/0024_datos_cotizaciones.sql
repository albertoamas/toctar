-- Formas de pago del PDF de la cotización (HU-25, RF-32). Borrador hasta que el dueño lo corrija en Configuración.
-- No pisa datos existentes: se puede aplicar en cualquier entorno.
INSERT INTO "parametro" ("clave", "valor") VALUES ('formas_pago_cotizacion', to_jsonb('Efectivo, QR o transferencia bancaria.'::text))
ON CONFLICT ("clave") DO NOTHING;
