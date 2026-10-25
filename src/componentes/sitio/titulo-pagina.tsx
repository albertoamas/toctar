// Título principal de las páginas interiores del sitio (Servicios, Galería, Nosotros…). Un solo estilo:
// antes la misma lista de clases estaba copiada en 6 páginas (pulido 2.2). La portada y cada servicio tienen
// su propio titular, más grande.
export function TituloPagina({ children }: { children: React.ReactNode }) {
  return <h1 className="font-heading text-[40px] leading-[44px] font-extrabold italic">{children}</h1>;
}

/** Título de una sección dentro de una página del sitio (h2): el mismo estilo en todas. */
export const TITULO_SECCION = "font-heading text-[28px] leading-8 font-bold italic md:text-[40px] md:leading-[44px]";
