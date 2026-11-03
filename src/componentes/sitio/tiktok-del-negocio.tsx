import { connection } from "next/server";
import { Suspense } from "react";
import { obtenerDatosPublicos } from "@/modulos/configuracion/consultas";
import { EnlaceTikTok } from "./enlace-tiktok";

// Aparte de EnlaceTikTok: lee la configuración del negocio (solo en el servidor), y así EnlaceTikTok se puede probar solo.

/**
 * El TikTok del negocio leído de su configuración, para lo que está en todas las páginas (el encabezado y su menú): se
 * lee al atender el pedido, como el pie, y queda en caché con la etiqueta "negocio".
 */
export function TikTokDelNegocio(props: Omit<React.ComponentProps<typeof EnlaceTikTok>, "enlace">) {
  return (
    <Suspense fallback={null}>
      <TikTokLeido {...props} />
    </Suspense>
  );
}

async function TikTokLeido(props: Omit<React.ComponentProps<typeof EnlaceTikTok>, "enlace">) {
  await connection();
  const { redes } = await obtenerDatosPublicos();
  return <EnlaceTikTok enlace={redes.tiktok} {...props} />;
}
