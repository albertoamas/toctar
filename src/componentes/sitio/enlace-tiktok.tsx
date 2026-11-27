import { cn } from "cn";
import { NOMBRE_RED } from "@/modulos/configuracion/esquemas";
import { IconoRed } from "./iconos-marca";

// Acceso a TikTok para ver más trabajos (pedido de la demo del 24/10, registro de cambios 2; más a la vista desde el
// pedido 35): un enlace a su perfil, sin videos incrustados (cargarían los rastreadores de TikTok y harían lento el
// celular). Solo si el dueño cargó el enlace en Configuración → Negocio.
// En blanco (tt-boton--blanco): se ve a la primera y no le roba el rojo a WhatsApp, la acción principal del sitio.

export function EnlaceTikTok({
  enlace,
  texto = `Mira nuestros trabajos en ${NOMBRE_RED.tiktok}`,
  variante = "blanco",
  className,
}: {
  enlace?: string;
  texto?: string;
  variante?: "blanco" | "contorno";
  className?: string;
}) {
  if (!enlace) return null;
  return (
    <a href={enlace} target="_blank" rel="noreferrer" className={cn("tt-boton", variante === "blanco" ? "tt-boton--blanco" : "tt-boton--contorno", className)}>
      <IconoRed red="tiktok" />
      {texto}
    </a>
  );
}
