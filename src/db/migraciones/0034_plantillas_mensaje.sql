CREATE TABLE "plantilla_mensaje" (
	"clave" text PRIMARY KEY NOT NULL,
	"texto" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "plantilla_mensaje_clave_valida" CHECK (clave in ('listo', 'saldo', 'mantenimiento')),
	CONSTRAINT "plantilla_mensaje_texto_largo" CHECK (char_length("plantilla_mensaje"."texto") between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "plantilla_mensaje" ADD CONSTRAINT "plantilla_mensaje_updated_by_usuario_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;