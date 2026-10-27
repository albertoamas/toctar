-- Pedido 21: planes de mantenimiento por vehículo (docs/08-desarrollo/etapas/P21-planes-mantenimiento.md §4).
-- Cada servicio dice cuál es su mantenimiento y cada cuántos meses; cada recordatorio guarda el servicio que se agenda y
-- su frecuencia. Ordenado a mano: las columnas nuevas entran nulas, se llenan con los datos de hoy y recién después son
-- obligatorias. La columna `genera_mantenimiento` y el parámetro global se borran en 0037.
ALTER TABLE "recordatorio_mantenimiento" DROP CONSTRAINT "recordatorio_estado_valido";--> statement-breakpoint
ALTER TABLE "recordatorio_mantenimiento" ALTER COLUMN "trabajo_origen_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "servicio" ADD COLUMN "mantenimiento_servicio_id" integer;--> statement-breakpoint
ALTER TABLE "servicio" ADD COLUMN "mantenimiento_meses" integer;--> statement-breakpoint
ALTER TABLE "recordatorio_mantenimiento" ADD COLUMN "servicio_mantenimiento_id" integer;--> statement-breakpoint
ALTER TABLE "recordatorio_mantenimiento" ADD COLUMN "intervalo_meses" integer;--> statement-breakpoint
ALTER TABLE "recordatorio_mantenimiento" ADD COLUMN "trabajo_hecho_id" integer;--> statement-breakpoint
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_mantenimiento_servicio_id_servicio_id_fk" FOREIGN KEY ("mantenimiento_servicio_id") REFERENCES "public"."servicio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordatorio_mantenimiento" ADD CONSTRAINT "recordatorio_mantenimiento_servicio_mantenimiento_id_servicio_id_fk" FOREIGN KEY ("servicio_mantenimiento_id") REFERENCES "public"."servicio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordatorio_mantenimiento" ADD CONSTRAINT "recordatorio_mantenimiento_trabajo_hecho_id_trabajo_id_fk" FOREIGN KEY ("trabajo_hecho_id") REFERENCES "public"."trabajo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Datos del catálogo: los que generaban mantenimiento pasan a tener el suyo, con el intervalo de hoy (3 meses). El
-- pulido y nano cerámico tiene el suyo en el catálogo (0016); los demás, ellos mismos
UPDATE "servicio" s SET
  "mantenimiento_meses" = COALESCE((SELECT ("valor" #>> '{}')::int FROM "parametro" WHERE "clave" = 'intervalo_mantenimiento_meses'), 3),
  "mantenimiento_servicio_id" = COALESCE(
    CASE WHEN s."slug" = 'pulido-y-nano-ceramico' THEN (SELECT m."id" FROM "servicio" m WHERE m."slug" = 'mantenimiento-del-nano-ceramico') END,
    s."id"
  )
WHERE s."genera_mantenimiento";--> statement-breakpoint
-- Datos de los recordatorios: el mantenimiento que dice el catálogo de su servicio y el intervalo de hoy
UPDATE "recordatorio_mantenimiento" r SET
  "intervalo_meses" = COALESCE((SELECT ("valor" #>> '{}')::int FROM "parametro" WHERE "clave" = 'intervalo_mantenimiento_meses'), 3),
  "servicio_mantenimiento_id" = COALESCE((SELECT s."mantenimiento_servicio_id" FROM "servicio" s WHERE s."id" = r."servicio_id"), r."servicio_id");--> statement-breakpoint
-- Los abiertos repetidos de un vehículo y servicio (el error que esto corrige): queda el más reciente
UPDATE "recordatorio_mantenimiento" SET "estado" = 'no_interesado', "trabajo_agendado_id" = NULL, "nota" = 'Repetido: se dejó el más reciente.', "updated_at" = now()
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id", row_number() OVER (PARTITION BY "vehiculo_id", "servicio_id" ORDER BY "created_at" DESC, "id" DESC) AS n
    FROM "recordatorio_mantenimiento" WHERE "estado" IN ('pendiente', 'avisado', 'agendado')
  ) x WHERE x.n > 1
);--> statement-breakpoint
ALTER TABLE "recordatorio_mantenimiento" ALTER COLUMN "servicio_mantenimiento_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recordatorio_mantenimiento" ALTER COLUMN "intervalo_meses" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "recordatorio_un_plan_abierto" ON "recordatorio_mantenimiento" USING btree ("vehiculo_id","servicio_id") WHERE "recordatorio_mantenimiento"."estado" in ('pendiente', 'avisado', 'agendado');--> statement-breakpoint
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_mantenimiento_completo" CHECK (("servicio"."mantenimiento_servicio_id" is null) = ("servicio"."mantenimiento_meses" is null));--> statement-breakpoint
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_mantenimiento_meses_valido" CHECK ("servicio"."mantenimiento_meses" between 1 and 24);--> statement-breakpoint
ALTER TABLE "recordatorio_mantenimiento" ADD CONSTRAINT "recordatorio_hecho_con_trabajo" CHECK (("recordatorio_mantenimiento"."estado" = 'hecho') = ("recordatorio_mantenimiento"."trabajo_hecho_id" is not null));--> statement-breakpoint
ALTER TABLE "recordatorio_mantenimiento" ADD CONSTRAINT "recordatorio_intervalo_valido" CHECK ("recordatorio_mantenimiento"."intervalo_meses" between 1 and 24);--> statement-breakpoint
ALTER TABLE "recordatorio_mantenimiento" ADD CONSTRAINT "recordatorio_estado_valido" CHECK ("recordatorio_mantenimiento"."estado" in ('pendiente', 'avisado', 'agendado', 'hecho', 'no_interesado'));
