ALTER TABLE "servicio" ADD COLUMN "duracion_dias" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "servicio" ADD COLUMN "genera_mantenimiento" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_duracion_valida" CHECK ("servicio"."duracion_dias" between 1 and 60);