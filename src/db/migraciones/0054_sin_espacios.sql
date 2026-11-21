-- Pedido 55: sin espacios fijos ni límite por día. Los trabajos dejan de tener espacio y se quitan la restricción de
-- exclusión por espacio y la tabla de espacios: la Agenda muestra cuántos autos hay cada día y el dueño decide.
-- Con "IF EXISTS": una base de desarrollo que ya aplicó una versión anterior de este pedido (con `sucursal.lugares`)
-- queda igual que una nueva.
ALTER TABLE "trabajo" DROP CONSTRAINT IF EXISTS "trabajo_sin_cruces";--> statement-breakpoint
ALTER TABLE "trabajo" DROP CONSTRAINT IF EXISTS "trabajo_espacio_id_espacio_taller_id_fk";--> statement-breakpoint
ALTER TABLE "trabajo" DROP COLUMN IF EXISTS "espacio_id";--> statement-breakpoint
DROP TABLE IF EXISTS "espacio_taller";--> statement-breakpoint
ALTER TABLE "sucursal" DROP CONSTRAINT IF EXISTS "sucursal_lugares_validos";--> statement-breakpoint
ALTER TABLE "sucursal" DROP COLUMN IF EXISTS "lugares";
