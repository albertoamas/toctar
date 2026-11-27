CREATE TABLE "subida_pendiente" (
	"clave" text PRIMARY KEY NOT NULL,
	"consulta_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"expira_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subida_pendiente" ADD CONSTRAINT "subida_pendiente_consulta_id_consulta_id_fk" FOREIGN KEY ("consulta_id") REFERENCES "public"."consulta"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subida_pendiente" ADD CONSTRAINT "subida_pendiente_created_by_usuario_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subida_pendiente_por_consulta" ON "subida_pendiente" USING btree ("consulta_id");--> statement-breakpoint
CREATE INDEX "subida_pendiente_por_vencimiento" ON "subida_pendiente" USING btree ("expira_at");