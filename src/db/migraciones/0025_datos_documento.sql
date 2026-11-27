-- Cliente, vehículo y negocio copiados en cada cotización al guardarla (HU-26, D-4): el PDF sale de esta copia.
-- Las cotizaciones que ya existen se completan con los datos de hoy; después la columna es obligatoria.
ALTER TABLE "cotizacion" ADD COLUMN "datos_documento" jsonb;--> statement-breakpoint
UPDATE "cotizacion" c SET "datos_documento" = jsonb_build_object(
  'cliente', jsonb_build_object('nombre', k."nombre", 'telefono', k."telefono"),
  'vehiculo', jsonb_build_object(
    'placa', v."placa",
    'descripcion', nullif(concat_ws(', ', nullif(concat_ws(' ', v."marca", v."modelo"), ''), v."color"), ''),
    'tamano', coalesce((SELECT t."nombre" FROM "cotizacion_linea" l JOIN "tamano_vehiculo" t ON t."id" = l."tamano_id" WHERE l."cotizacion_id" = c."id" ORDER BY l."orden" LIMIT 1), '')
  ),
  'negocio', (
    SELECT jsonb_build_object('nombre', n."nombre", 'razonSocial', n."razon_social", 'nit', n."nit", 'whatsapp', s."telefono_whatsapp", 'direccion', s."direccion")
    FROM "negocio" n
    LEFT JOIN LATERAL (SELECT * FROM "sucursal" WHERE "activo" ORDER BY "id" LIMIT 1) s ON true
    WHERE n."id" = 1
  )
)
FROM "consulta" q
JOIN "cliente" k ON k."id" = q."cliente_id"
JOIN "vehiculo" v ON v."id" = q."vehiculo_id"
WHERE q."id" = c."consulta_id";--> statement-breakpoint
ALTER TABLE "cotizacion" ALTER COLUMN "datos_documento" SET NOT NULL;
