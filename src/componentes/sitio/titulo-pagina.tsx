// Título principal de las páginas interiores del sitio (Servicios, Galería, Nosotros…). Un solo estilo:
// antes la misma lista de clases estaba copiada en 6 páginas (pulido 2.2). La portada y cada servicio tienen
// su propio titular, más grande.
export function TituloPagina({ children }: { children: React.ReactNode }) {
  return <h1 className="font-heading text-[40px] leading-[44px] font-extrabold italic">{children}</h1>;
}
