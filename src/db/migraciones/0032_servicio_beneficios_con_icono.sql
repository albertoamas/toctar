ALTER TABLE "servicio" ADD COLUMN "opciones_en_escalera" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Los beneficios pasan de texto a { texto, icono }: los que ya estaban toman el ícono genérico ("listo")
UPDATE "servicio" SET "beneficios" = (
  SELECT coalesce(jsonb_agg(jsonb_build_object('texto', b.texto, 'icono', 'listo') ORDER BY b.n), '[]'::jsonb)
  FROM jsonb_array_elements_text("servicio"."beneficios") WITH ORDINALITY AS b(texto, n)
) WHERE jsonb_typeof("beneficios") = 'array';
