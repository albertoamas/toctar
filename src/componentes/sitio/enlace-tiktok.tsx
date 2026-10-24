import { cn } from "cn";
import { NOMBRE_RED } from "@/modulos/configuracion/esquemas";
import { IconoRed } from "./iconos-marca";

// Acceso a TikTok para ver más trabajos (pedido de la demo del 24/10, registro de cambios 2): un enlace a su perfil,
// sin videos incrustados (cargarían los rastreadores de TikTok y harían lento el celular). Va en la Galería y en la
// portada, solo si el dueño cargó el enlace en Configuración → Negocio (la página lo lee junto con sus otros datos).

export function EnlaceTikTok({ enlace, className }: { enlace?: string; className?: string }) {
  if (!enlace) return null;
  return (
    <a href={enlace} target="_blank" rel="noreferrer" className={cn("tt-boton tt-boton--contorno", className)}>
      <IconoRed red="tiktok" />
      Mira nuestros trabajos en {NOMBRE_RED.tiktok}
    </a>
  );
}
