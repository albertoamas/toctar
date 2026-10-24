import { cn } from "cn";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { IconoRed } from "./iconos-marca";

// Acceso a TikTok para ver más trabajos (pedido de la demo del 24/10, registro de cambios 2): un enlace a su perfil,
// sin videos incrustados (cargarían los rastreadores de TikTok y harían lento el celular). Va en la Galería y en la
// portada, solo si el dueño cargó el enlace en Configuración → Negocio. Quien lo usa ya llamó a connection().

export async function EnlaceTikTok({ className }: { className?: string }) {
  const { redes } = await obtenerDatosPublicos();
  if (!redes.tiktok) return null;
  return (
    <a href={redes.tiktok} target="_blank" rel="noreferrer" className={cn("tt-boton tt-boton--contorno gap-2", className)}>
      <IconoRed red="tiktok" className="size-5" />
      Mira nuestros trabajos en TikTok
    </a>
  );
}
