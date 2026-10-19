import type { Metadata } from "next";
import { METADATOS_NO_ENCONTRADA, NoEncontrada } from "@/componentes/sitio/no-encontrada";

export const metadata: Metadata = METADATOS_NO_ENCONTRADA;

// Un servicio oculto o inexistente (notFound() dentro del sitio): ya tiene el encabezado y el pie de su diseño.
// Responde 200 con noindex: la página empieza a enviarse antes de saber si el servicio existe (ver pulido 2.9).
export default function PaginaNoEncontradaSitio() {
  return <NoEncontrada />;
}
