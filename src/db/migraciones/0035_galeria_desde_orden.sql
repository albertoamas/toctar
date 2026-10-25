ALTER TABLE "galeria_item" ADD COLUMN "trabajo_id" integer;--> statement-breakpoint
ALTER TABLE "galeria_item" ADD CONSTRAINT "galeria_item_trabajo_id_trabajo_id_fk" FOREIGN KEY ("trabajo_id") REFERENCES "public"."trabajo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "galeria_item_trabajo" ON "galeria_item" USING btree ("trabajo_id");