ALTER TABLE "plantilla_mensaje" DROP CONSTRAINT "plantilla_mensaje_clave_valida";--> statement-breakpoint
ALTER TABLE "cotizacion" ADD COLUMN "enlace" text DEFAULT replace(gen_random_uuid()::text, '-', '') NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "cotizacion_enlace_unico" ON "cotizacion" USING btree ("enlace");--> statement-breakpoint
ALTER TABLE "plantilla_mensaje" ADD CONSTRAINT "plantilla_mensaje_clave_valida" CHECK (clave in ('listo', 'saldo', 'cotizacion', 'mantenimiento'));