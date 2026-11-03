ALTER TABLE "trabajo" DROP CONSTRAINT "trabajo_tecnico_id_usuario_id_fk";
--> statement-breakpoint
DROP INDEX "trabajo_por_tecnico";--> statement-breakpoint
ALTER TABLE "trabajo" DROP COLUMN "tecnico_id";