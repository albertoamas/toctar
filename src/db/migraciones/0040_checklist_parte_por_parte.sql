-- Pedido 12, ajuste del 01/11: quien recibe revisa parte por parte y marca cada una "bien" o "detalle"; sin fila, todavía no
-- se revisó. Lo registrado hasta ahora eran todos detalles (por defecto).
ALTER TABLE "trabajo_revision" ALTER COLUMN "tipo" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "trabajo_revision" ADD COLUMN "estado" text DEFAULT 'detalle' NOT NULL;--> statement-breakpoint
ALTER TABLE "trabajo_revision" ADD CONSTRAINT "trabajo_revision_estado_valido" CHECK ("trabajo_revision"."estado" in ('bien', 'detalle'));--> statement-breakpoint
ALTER TABLE "trabajo_revision" ADD CONSTRAINT "trabajo_revision_tipo_si_detalle" CHECK (("trabajo_revision"."estado" = 'detalle') = ("trabajo_revision"."tipo" is not null));--> statement-breakpoint
ALTER TABLE "trabajo_revision" ADD CONSTRAINT "trabajo_revision_bien_sin_foto" CHECK ("trabajo_revision"."estado" = 'detalle' or ("trabajo_revision"."nota" is null and "trabajo_revision"."archivo_id" is null));