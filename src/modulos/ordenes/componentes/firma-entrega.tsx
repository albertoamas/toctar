import Image from "next/image";
import { AbrirFoto } from "@/componentes/panel/abrir-foto";
import type { FirmaEntrega } from "../consultas";

// La entrega en la orden (pedido 13): la firma del cliente, en grande al tocarla, con "Recibido conforme por {nombre}", o
// "Entregado sin firma" con el motivo. La firma no es un precio: la ve todo el que trabaja la orden (RN-12).

export function FirmaDeEntrega({ firma }: { firma: FirmaEntrega }) {
  return (
    <section aria-labelledby="firma-titulo" className="tt-tarjeta-panel flex flex-col gap-3 p-4">
      <h2 id="firma-titulo" className="tt-titulo-seccion">Firma de entrega</h2>
      {firma.imagen ? (
        <>
          {/* En el visor del panel, y no en otra pestaña (pulido 13.16) */}
          <AbrirFoto
            fotos={[{ ...firma.imagen, alt: `Firma de ${firma.nombre ?? "el cliente"}` }]}
            indice={0}
            titulo="Firma de entrega"
            etiqueta="Ver la firma en grande"
            className="self-start rounded-sm border border-border bg-fondo p-2"
          >
            <Image src={firma.imagen.url} alt={`Firma de ${firma.nombre ?? "el cliente"}`} width={320} height={120} unoptimized className="h-28 w-auto max-w-full object-contain" />
          </AbrirFoto>
          <p>Recibido conforme por {firma.nombre}.</p>
        </>
      ) : (
        <p>Entregado sin firma: {firma.motivo}</p>
      )}
    </section>
  );
}
