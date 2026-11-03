import { connection } from "next/server";
import { Suspense } from "react";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { cn } from "cn";
import { EnlaceTikTok } from "./enlace-tiktok";
import { IconoRed } from "./iconos-marca";

// Aparte de EnlaceTikTok: lee la configuración del negocio (solo en el servidor), y así EnlaceTikTok se puede probar solo.

/**
 * El TikTok del negocio leído de su configuración, para lo que está en todas las páginas (el encabezado y su menú): se
 * lee al atender el pedido, como el pie, y queda en caché con la etiqueta "negocio".
 */
export function TikTokDelNegocio({ reservar = false, ...props }: Omit<React.ComponentProps<typeof EnlaceTikTok>, "enlace"> & { reservar?: boolean }) {
  // Con `reservar`, mientras se lee el enlace queda un botón igual pero invisible: lo que está al lado no se corre
  // cuando llega (el encabezado de la computadora, junto al menú)
  const lugar = reservar ? (
    <span aria-hidden className={cn("tt-boton tt-boton--contorno invisible", props.className)}>
      <IconoRed red="tiktok" />
      {props.texto}
    </span>
  ) : null;
  return (
    <Suspense fallback={lugar}>
      <TikTokLeido {...props} />
    </Suspense>
  );
}

async function TikTokLeido(props: Omit<React.ComponentProps<typeof EnlaceTikTok>, "enlace">) {
  await connection();
  const { redes } = await obtenerDatosPublicos();
  return <EnlaceTikTok enlace={redes.tiktok} {...props} />;
}
