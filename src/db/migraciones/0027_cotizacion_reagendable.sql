DROP INDEX "trabajo_cotizacion_unica";--> statement-breakpoint
CREATE UNIQUE INDEX "trabajo_cotizacion_unica" ON "trabajo" USING btree ("cotizacion_id") WHERE "trabajo"."estado" <> 'cancelado';