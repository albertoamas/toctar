-- Datos iniciales del catálogo (C1, HU-19): el nano cerámico genera recordatorio de mantenimiento (RN-08).
-- La duración queda en 1 día (el valor por defecto) hasta que el dueño la cargue. Sin precios.
UPDATE "servicio" SET "genera_mantenimiento" = true WHERE "slug" = 'pulido-y-nano-ceramico';
