import Image from "next/image";
import { ImageOffIcon } from "lucide-react";
import { AbrirFoto } from "@/componentes/panel/abrir-foto";
import type { UrlsFoto } from "@/lib/fotos";

// La foto de un vehículo en el encabezado de su ficha (pedido 58, P58-foto-del-vehiculo.md): para saber cuál es de un
// vistazo. Como las miniaturas de las listas (4:3, con el ícono si no tiene), más grande; se toca y se abre en el visor.
// Sin foto, el recuadro: se carga en "Editar" o sola con la primera foto de su próxima orden.

const CAJA = "flex aspect-[4/3] w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-superficie sm:w-28";

export function FotoVehiculo({ foto, placa }: { foto: UrlsFoto | null; placa: string }) {
  if (!foto)
    return (
      <span className={CAJA} role="img" aria-label="Sin foto">
        <ImageOffIcon className="size-6 text-tinta-suave" aria-hidden />
      </span>
    );
  return (
    <AbrirFoto fotos={[{ ...foto, alt: `Foto de ${placa}` }]} indice={0} titulo={placa} etiqueta={`Ver la foto de ${placa}`} className="shrink-0 rounded-lg">
      <span className={CAJA}>
        <Image src={foto.miniatura} alt={`Foto de ${placa}`} width={112} height={84} unoptimized className="size-full object-cover" />
      </span>
    </AbrirFoto>
  );
}
