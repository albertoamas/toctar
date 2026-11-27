-- Datos iniciales del negocio (HU-04): lo que entregó el dueño (01-descubrimiento/material-recibido.md).
-- WhatsApp, ubicación y redes quedan vacíos: los carga el dueño desde el panel.
-- No pisa datos existentes: se puede aplicar en cualquier entorno.
INSERT INTO "negocio" ("id", "nombre", "correo", "redes")
VALUES (1, 'TocTar Detailing', 'toctartarija@gmail.com', '{}'::jsonb)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
-- Horario pendiente de confirmar: lunes a sábado, 8:00–12:00 y 14:00–18:00.
INSERT INTO "sucursal" ("nombre", "direccion", "horarios")
SELECT
  'Tarija',
  'Barrio Aeropuerto, calle Juan Pablo II, pasaje Tejerina, Tarija',
  '[
    {"dia": 1, "turnos": [{"desde": "08:00", "hasta": "12:00"}, {"desde": "14:00", "hasta": "18:00"}]},
    {"dia": 2, "turnos": [{"desde": "08:00", "hasta": "12:00"}, {"desde": "14:00", "hasta": "18:00"}]},
    {"dia": 3, "turnos": [{"desde": "08:00", "hasta": "12:00"}, {"desde": "14:00", "hasta": "18:00"}]},
    {"dia": 4, "turnos": [{"desde": "08:00", "hasta": "12:00"}, {"desde": "14:00", "hasta": "18:00"}]},
    {"dia": 5, "turnos": [{"desde": "08:00", "hasta": "12:00"}, {"desde": "14:00", "hasta": "18:00"}]},
    {"dia": 6, "turnos": [{"desde": "08:00", "hasta": "12:00"}, {"desde": "14:00", "hasta": "18:00"}]},
    {"dia": 7, "turnos": []}
  ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "sucursal");
