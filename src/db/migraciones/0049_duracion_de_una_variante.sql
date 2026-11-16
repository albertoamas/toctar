-- Hallazgo 2 de la prueba en celulares (15/11): con una sola variante activa, la duración es solo la del servicio (el
-- modal de precios ya no ofrece "Duración propia"). La que se haya escrito en esa variante pasa al servicio, así la
-- reserva sigue sugiriendo la misma entrega, y la variante queda sin la suya.
update servicio s set duracion_dias = v.duracion_dias, updated_at = now()
from variante v
where v.servicio_id = s.id and v.activo and v.duracion_dias is not null
  and (select count(*) from variante x where x.servicio_id = s.id and x.activo) = 1;
--> statement-breakpoint
update variante v set duracion_dias = null
where v.activo and v.duracion_dias is not null
  and (select count(*) from variante x where x.servicio_id = v.servicio_id and x.activo) = 1;
