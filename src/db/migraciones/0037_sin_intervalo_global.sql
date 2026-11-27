-- Pedido 21: el mantenimiento ya es de cada servicio (0036). Se van la casilla "genera mantenimiento" y el intervalo
-- único de Configuración (RN-08 cambia: P21-planes-mantenimiento.md §3).
ALTER TABLE "servicio" DROP COLUMN "genera_mantenimiento";--> statement-breakpoint
DELETE FROM "parametro" WHERE "clave" = 'intervalo_mantenimiento_meses';
