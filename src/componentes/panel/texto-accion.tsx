// El texto del botón principal del encabezado (22/11, recorrido visual): en un celular (hasta 420 px) la forma corta,
// "Nueva" o "Reservar", porque el título de la pantalla ya dice qué se crea; con el nombre completo, en un iPhone 14 el
// botón no entraba junto a "Cotizaciones" y bajaba a su renglón. El lector de pantalla oye siempre el nombre completo,
// que empieza con lo que se ve.

export function TextoAccion({ corto, children }: { /** Lo que se ve en el celular: "Nueva". */ corto: string; children: string }) {
  return (
    <>
      <span className="max-[420px]:hidden">{children}</span>
      <span aria-hidden className="min-[421px]:hidden">
        {corto}
      </span>
      <span className="sr-only min-[421px]:hidden">{children}</span>
    </>
  );
}
