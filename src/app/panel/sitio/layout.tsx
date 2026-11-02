// Sitio web (pedido 26): la portada (/panel/sitio) ofrece las partes en tarjetas y cada parte trae su encabezado, con
// "‹ Sitio web" para volver. Este layout NO protege: cada página llama a exigirModulo.
export default function LayoutSitioWeb({ children }: LayoutProps<"/panel/sitio">) {
  return <section className="flex flex-col gap-6">{children}</section>;
}
