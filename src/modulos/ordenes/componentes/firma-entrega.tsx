import Image from "next/image";
import type { FirmaEntrega } from "../consultas";

// La entrega en la orden (pedido 13): la firma del cliente, en grande al tocarla, con "Recibido conforme por {nombre}", o
// "Entregado sin firma" con el motivo. La firma no es un precio ni un teléfono: la ve también el técnico (RN-12).

export function FirmaDeEntrega({ firma }: { firma: FirmaEntrega }) {
  return (
    <section aria-labelledby="firma-titulo" className="tt-tarjeta-panel flex flex-col gap-3 p-4">
      <h2 id="firma-titulo" className="tt-titulo-seccion">Firma de entrega</h2>
      {firma.imagen ? (
        <>
          <a href={firma.imagen.url} target="_blank" rel="noreferrer" className="self-start rounded-sm border border-border bg-fondo p-2" aria-label="Ver la firma en grande">
            <Image src={firma.imagen.url} alt={`Firma de ${firma.nombre ?? "el cliente"}`} width={320} height={120} unoptimized className="h-28 w-auto max-w-full object-contain" />
          </a>
          <p>Recibido conforme por {firma.nombre}.</p>
        </>
      ) : (
        <p>Entregado sin firma: {firma.motivo}</p>
      )}
    </section>
  );
}
