import { CameraIcon, TriangleAlertIcon } from "lucide-react";

// Las fotos del sitio van en un mismo formato (estándar del 06/11, pulido 13.12). Dos ayudas para quien las saca:
// - `GuiaFoto`: cómo sacarla, antes de subirla. El formato dice también cómo conseguirlo: "4:3" solo no le dice nada a
//   quien no sabe qué es, y casi todos los celulares ya sacan así con la cámara normal.
// - `AvisoFoto`: la foto elegida no cumple (ver avisos en lib/formato-fotos.ts). Avisa y no bloquea: a veces solo se tiene
//   esa foto.

const FORMATO_ESTANDAR = "Formato 4:3, con el celular acostado. Cámara normal, sin retrato ni panorámico.";

export function GuiaFoto({ titulo = "Cómo sacar esta foto", formato = FORMATO_ESTANDAR, consejo }: { titulo?: string; formato?: string; consejo: string }) {
  return (
    <div className="flex gap-3 rounded-lg bg-info-fondo p-3 text-sm">
      <CameraIcon className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{titulo}</p>
        <p>
          {formato} {consejo}
        </p>
      </div>
    </div>
  );
}

export function AvisoFoto({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="flex gap-2 rounded-sm border border-aviso p-3 text-sm">
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-aviso" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
