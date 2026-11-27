ALTER TABLE "usuario" DROP CONSTRAINT "usuario_rol_valido";--> statement-breakpoint
ALTER TABLE "usuario" ALTER COLUMN "rol" SET DEFAULT 'encargado';--> statement-breakpoint
-- Pedido 32: cada técnico pasa a encargado con el perfil Taller (agenda y órdenes). Lo que podía hacer lo sigue
-- pudiendo, y ahora también recibe, avisa y entrega; sin "Pagos" ni "Cotizaciones" no ve precios (RN-12).
INSERT INTO "usuario_permiso" ("usuario_id", "permiso")
  SELECT "id", "permiso" FROM "usuario", (VALUES ('agenda'), ('ordenes')) AS "taller" ("permiso")
  WHERE "rol" = 'tecnico'
  ON CONFLICT ("usuario_id", "permiso") DO NOTHING;--> statement-breakpoint
UPDATE "usuario" SET "rol" = 'encargado', "updated_at" = now() WHERE "rol" = 'tecnico';--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_rol_valido" CHECK ("usuario"."rol" in ('dueno', 'encargado'));