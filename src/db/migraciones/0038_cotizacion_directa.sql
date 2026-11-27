-- Pedido 23: la cotización directa, sin consulta (P23-cotizacion-directa.md §4). La consulta queda como encabezado de
-- la cotización (D-12); las nuevas no llevan canal. El permiso "consultas" del encargado pasa a ser "cotizaciones"
-- (con él, también cotiza: pedido 24), y el parámetro de la consulta que se enfría, el de la cotización sin respuesta.
ALTER TABLE "usuario_permiso" DROP CONSTRAINT "usuario_permiso_valido";--> statement-breakpoint
UPDATE "usuario_permiso" SET "permiso" = 'cotizaciones' WHERE "permiso" = 'consultas';--> statement-breakpoint
ALTER TABLE "consulta" ALTER COLUMN "canal" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario_permiso" ADD CONSTRAINT "usuario_permiso_valido" CHECK (permiso in ('sitio', 'reclamos', 'clientes', 'cotizaciones', 'agenda', 'ordenes', 'pagos', 'mantenimientos', 'entrega_con_saldo'));--> statement-breakpoint
UPDATE "parametro" SET "clave" = 'dias_cotizacion_sin_respuesta' WHERE "clave" = 'dias_consulta_fria';
