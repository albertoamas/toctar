-- Pedido 13: la firma del cliente al entregar el vehículo (P13-firma-entrega.md): la imagen privada, el nombre de quien
-- firmó o, sin firma, el motivo.
ALTER TABLE "trabajo" ADD COLUMN "firma_archivo_id" integer;--> statement-breakpoint
ALTER TABLE "trabajo" ADD COLUMN "firma_nombre" text;--> statement-breakpoint
ALTER TABLE "trabajo" ADD COLUMN "sin_firma_motivo" text;--> statement-breakpoint
ALTER TABLE "trabajo" ADD CONSTRAINT "trabajo_firma_archivo_id_archivo_id_fk" FOREIGN KEY ("firma_archivo_id") REFERENCES "public"."archivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trabajo" ADD CONSTRAINT "trabajo_firma_archivo_id_unique" UNIQUE("firma_archivo_id");--> statement-breakpoint
ALTER TABLE "trabajo" ADD CONSTRAINT "trabajo_firma_con_nombre" CHECK ("trabajo"."firma_archivo_id" is null or "trabajo"."firma_nombre" is not null);--> statement-breakpoint
ALTER TABLE "trabajo" ADD CONSTRAINT "trabajo_firma_o_motivo" CHECK ("trabajo"."firma_archivo_id" is null or "trabajo"."sin_firma_motivo" is null);