import { Monograma } from "./iconos-marca";
import { BotonWhatsApp } from "./whatsapp";

// Cierre de una página del sitio: una invitación a escribir y el botón principal de WhatsApp, con el monograma
// de fondo. Al ser el principal, mientras se ve el botón fijo se esconde (pulido 1.3). Lo usan la portada,
// Servicios y la página de cada servicio, que lo manda con el servicio escrito (pulido 2.1 a 2.3).
export function CierreWhatsApp({ titulo, texto, servicio }: { titulo: string; texto: string; servicio?: string }) {
  return (
    <section className="relative overflow-hidden bg-superficie">
      <Monograma className="pointer-events-none absolute -right-16 -bottom-24 w-[28rem] fill-fondo md:-right-10 md:w-[36rem]" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-12 md:py-24">
        <h2 className="max-w-xl font-heading text-[28px] leading-8 font-bold italic md:text-[40px] md:leading-[44px]">{titulo}</h2>
        <p className="max-w-xl text-tinta-suave">{texto}</p>
        {/* El texto dice lo que gana el cliente; el ícono y el nombre accesible dicen que es WhatsApp. */}
        <BotonWhatsApp texto="Mandar fotos de mi vehículo" servicio={servicio} />
      </div>
    </section>
  );
}
