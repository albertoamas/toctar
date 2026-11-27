import type { Metadata } from "next";
import { MarcoSitio } from "@/componentes/sitio/marco-sitio";
import { METADATOS_NO_ENCONTRADA, NoEncontrada } from "@/componentes/sitio/no-encontrada";

export const metadata: Metadata = METADATOS_NO_ENCONTRADA;

// Una dirección que no existe: queda fuera del diseño del sitio, así que lleva su marco (encabezado y pie), igual
// que cuando no se encuentra un servicio (src/app/(sitio)/not-found.tsx). Antes salía sin menú ni pie (pulido 2.9).
export default function PaginaNoEncontrada() {
  return (
    <MarcoSitio>
      <NoEncontrada />
    </MarcoSitio>
  );
}
