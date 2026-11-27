-- Datos iniciales de las marcas de vehículo (pedido 52, etapas/P52-catalogo-de-marcas.md): las comunes en Bolivia y las
-- que ya tienen los vehículos registrados, sin repetir por mayúsculas (si una ya está entre las comunes, con su forma),
-- en orden alfabético. El dueño las cambia en Configuración → Taller.
INSERT INTO "marca_vehiculo" ("nombre", "orden")
SELECT "nombre", row_number() OVER (ORDER BY lower("nombre"))
FROM (
  SELECT DISTINCT ON (lower("nombre")) "nombre"
  FROM (
    SELECT "nombre", 0 AS "prioridad"
    FROM (VALUES
      ('Toyota'), ('Nissan'), ('Suzuki'), ('Hyundai'), ('Kia'), ('Mitsubishi'), ('Mazda'), ('Chevrolet'), ('Volkswagen'),
      ('Ford'), ('Honda'), ('Subaru'), ('Jeep'), ('Renault'), ('BYD'), ('Chery'), ('JAC'), ('Great Wall'), ('Changan'), ('Isuzu')
    ) AS "comunes" ("nombre")
    UNION ALL
    SELECT btrim("marca"), 1 FROM "vehiculo" WHERE "marca" IS NOT NULL AND btrim("marca") <> ''
  ) AS "todas"
  ORDER BY lower("nombre"), "prioridad", "nombre"
) AS "unicas";
