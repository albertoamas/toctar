ALTER TABLE "archivo" ADD COLUMN "mediana_clave" text;--> statement-breakpoint
ALTER TABLE "archivo" ADD CONSTRAINT "archivo_mediana_clave_unique" UNIQUE("mediana_clave");