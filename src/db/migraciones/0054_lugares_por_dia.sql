-- Pedido 55: lugares por día en vez de espacios fijos. Los lugares de cada sucursal son los espacios activos que tenía
-- (al menos 1); los trabajos dejan de tener espacio y la restricción de exclusión por espacio se quita: ahora el servidor
-- cuenta los trabajos de cada día contra los lugares, con la sucursal bloqueada (D-5).
ALTER TABLE "sucursal" ADD COLUMN "lugares" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
UPDATE "sucursal" SET "lugares" = greatest(1, least(50, (SELECT count(*) FROM "espacio_taller" e WHERE e."sucursal_id" = "sucursal"."id" AND e."activo")));--> statement-breakpoint
ALTER TABLE "sucursal" ADD CONSTRAINT "sucursal_lugares_validos" CHECK ("sucursal"."lugares" between 1 and 50);--> statement-breakpoint
ALTER TABLE "trabajo" DROP CONSTRAINT IF EXISTS "trabajo_sin_cruces";--> statement-breakpoint
ALTER TABLE "trabajo" DROP CONSTRAINT "trabajo_espacio_id_espacio_taller_id_fk";--> statement-breakpoint
ALTER TABLE "trabajo" DROP COLUMN "espacio_id";--> statement-breakpoint
DROP TABLE "espacio_taller";
