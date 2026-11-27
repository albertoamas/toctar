import type { Route } from "next";
import Link from "next/link";
import { cn } from "cn";
import { Monograma } from "./iconos-marca";
import { TITULO_SECCION } from "./titulo-pagina";
import { BotonWhatsApp } from "./whatsapp";

// Cierre de una página del sitio: una invitación a escribir y el botón principal de WhatsApp, con el monograma
// de fondo. Al ser el principal, mientras se ve el botón fijo se esconde (pulido 1.3). Lo usan la portada,
// Servicios, cada servicio (con el servicio escrito en el mensaje), la Galería, Nosotros y las Preguntas frecuentes
// (pulido 2.1 a 2.6). `boton`: lo que gana el cliente al tocarlo (en las preguntas, "Hacer mi pregunta").
// `secundario`: un enlace opcional, con borde, al lado del WhatsApp (en Nosotros, las preguntas frecuentes).
// Va siempre pegado al pie (mt-auto en el contenido del sitio, que es una columna que llena la pantalla): en una página
// corta, como una galería con pocas fotos, no queda a media pantalla con un hueco debajo (pedido del 24/10).
export function CierreWhatsApp({
  titulo,
  texto,
  boton = "Mandar fotos de mi vehículo",
  servicio,
  secundario,
}: {
  titulo: string;
  texto: string;
  boton?: string;
  servicio?: string;
  secundario?: { href: Route; texto: string };
}) {
  return (
    <section className="relative mt-auto overflow-hidden bg-superficie">
      <Monograma className="pointer-events-none absolute -right-16 -bottom-24 w-[28rem] fill-fondo md:-right-10 md:w-[36rem]" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-12 md:py-24">
        <h2 className={cn("max-w-xl", TITULO_SECCION)}>{titulo}</h2>
        <p className="max-w-xl text-tinta-suave">{texto}</p>
        <div className="flex flex-wrap gap-3">
          {/* El texto dice lo que gana el cliente; el ícono y el nombre accesible dicen que es WhatsApp. */}
          <BotonWhatsApp texto={boton} servicio={servicio} />
          {secundario && (
            <Link href={secundario.href} className="tt-boton tt-boton--contorno">
              {secundario.texto}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
