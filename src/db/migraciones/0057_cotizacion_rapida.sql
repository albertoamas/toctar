ALTER TABLE "consulta" ALTER COLUMN "cliente_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "consulta" ALTER COLUMN "vehiculo_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "consulta" ADD COLUMN "interesado_nombre" text;--> statement-breakpoint
ALTER TABLE "consulta" ADD COLUMN "interesado_telefono" text;--> statement-breakpoint
ALTER TABLE "consulta" ADD COLUMN "interesado_vehiculo" text;--> statement-breakpoint
ALTER TABLE "consulta" ADD COLUMN "interesado_tamano_id" integer;--> statement-breakpoint
ALTER TABLE "consulta" ADD CONSTRAINT "consulta_interesado_tamano_id_tamano_vehiculo_id_fk" FOREIGN KEY ("interesado_tamano_id") REFERENCES "public"."tamano_vehiculo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consulta" ADD CONSTRAINT "consulta_cliente_o_interesado" CHECK (("consulta"."cliente_id" is not null and "consulta"."vehiculo_id" is not null) or ("consulta"."interesado_nombre" is not null and "consulta"."interesado_telefono" is not null and "consulta"."interesado_tamano_id" is not null));