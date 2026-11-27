-- Buscar clientes sin importar tildes (C1, HU-22): "jose" encuentra a "José". Extensión estándar de PostgreSQL;
-- el dueño de la base puede crearla (es de confianza desde PostgreSQL 13).
CREATE EXTENSION IF NOT EXISTS unaccent;
