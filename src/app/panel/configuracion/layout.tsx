// Configuración (pedido 26): la portada (/panel/configuracion) ofrece las partes en tarjetas y cada parte trae su
// encabezado, con "‹ Configuración" para volver. Este layout NO protege: cada página llama a exigirModulo.
export default function LayoutConfiguracion({ children }: LayoutProps<"/panel/configuracion">) {
  return <section className="flex flex-col gap-6">{children}</section>;
}
