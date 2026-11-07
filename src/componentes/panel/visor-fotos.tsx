import { useEffect, useRef } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/componentes/ui/dialog";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Una foto del panel en grande (pulido 13.16): el mismo visor en órdenes, reclamos, la galería, "Cómo llegó", el checklist,
// la firma y el comprobante. Antes había cuatro formas, y dos abrían otra pestaña. Con varias, se pasa a la de al lado con
// las flechas de la pantalla o del teclado, o deslizando con el dedo; la siguiente ya se cargó. Sin vuelta: en la última,
// "Siguiente" se atenúa (aria-disabled, no disabled: un botón deshabilitado pierde el foco y el teclado queda fuera) y el
// contador dice dónde se está.

export type FotoVisor = {
  url: string;
  ancho: number | null;
  alto: number | null;
  alt: string;
  /** Debajo de la foto: de qué es ("Puerta derecha: Rayón. Raspado en la manija"). */
  leyenda?: string;
};

type Props = {
  fotos: FotoVisor[];
  /** La que se ve, o null cerrado. */
  abierta: number | null;
  alCambiar: (indice: number | null) => void;
  /** De qué son: "Inicio" da "Inicio: foto 3 de 8"; con una sola, el título es este. */
  titulo: string;
  /** Lo que se hace con la foto a la vista ("Quitar foto"). */
  acciones?: (indice: number) => React.ReactNode;
  /** En lugar de la foto: algo propio (el antes y el después de un trabajo de la galería). */
  contenido?: (indice: number) => React.ReactNode;
  /** Cómo se llama lo que se recorre, para los botones: "foto" o "trabajo". */
  cosa?: "foto" | "trabajo";
};

/** Un gesto de costado de al menos 50 px, más de costado que de alto: el de arriba o abajo desplaza la foto. */
const UMBRAL = 50;

export function VisorFotos({ fotos, abierta, alCambiar, titulo, acciones, contenido, cosa = "foto" }: Props) {
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const varias = fotos.length > 1;
  const indice = abierta === null ? null : Math.min(abierta, fotos.length - 1);
  const foto = indice === null ? null : fotos[indice];
  const ir = (destino: number) => {
    if (destino >= 0 && destino < fotos.length) alCambiar(destino);
  };

  // Las flechas del teclado, en toda la ventana: el foco puede quedar fuera del contenido (en el título o al cerrar el menú)
  const irA = useRef(ir);
  useEffect(() => {
    irA.current = ir;
  });
  useEffect(() => {
    if (indice === null || !varias) return;
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") irA.current(indice - 1);
      else if (e.key === "ArrowRight") irA.current(indice + 1);
    };
    // En captura: el diálogo maneja sus propias teclas y no deja que lleguen a la ventana
    window.addEventListener("keydown", alTecla, true);
    return () => window.removeEventListener("keydown", alTecla, true);
  }, [indice, varias]);

  // La de antes y la de después, cargadas de antemano: al pasar aparecen enseguida
  useEffect(() => {
    if (indice === null) return;
    for (const vecina of [fotos[indice - 1], fotos[indice + 1]]) {
      if (vecina) new Image().src = vecina.url;
    }
  }, [indice, fotos]);

  return (
    <Dialog open={foto !== null} onOpenChange={(abrir) => !abrir && alCambiar(null)}>
      {foto && indice !== null && (
        <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-4 sm:max-w-4xl">
          <DialogTitle>{varias ? `${titulo}: ${cosa} ${indice + 1} de ${fotos.length}` : titulo}</DialogTitle>
          <div
            className="relative touch-pan-y"
            onPointerDown={(e) => {
              if (e.pointerType !== "mouse") inicio.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={(e) => {
              const desde = inicio.current;
              inicio.current = null;
              if (!desde) return;
              const dx = e.clientX - desde.x;
              if (Math.abs(dx) >= UMBRAL && Math.abs(dx) > Math.abs(e.clientY - desde.y)) ir(dx < 0 ? indice + 1 : indice - 1);
            }}
            onPointerCancel={() => (inicio.current = null)}
          >
            {contenido ? (
              contenido(indice)
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- las fotos ya vienen en WebP; sin el optimizador, como en todo el panel
              <img
                key={foto.url}
                src={foto.url}
                alt={foto.alt}
                width={foto.ancho ?? undefined}
                height={foto.alto ?? undefined}
                className="mx-auto max-h-[70dvh] w-full bg-superficie object-contain"
              />
            )}
            {varias && (
              <>
                <BotonPaso lado="anterior" cosa={cosa} deshabilitado={indice === 0} alTocar={() => ir(indice - 1)} />
                <BotonPaso lado="siguiente" cosa={cosa} deshabilitado={indice === fotos.length - 1} alTocar={() => ir(indice + 1)} />
              </>
            )}
          </div>
          {foto.leyenda && <p className="text-sm">{foto.leyenda}</p>}
          {acciones?.(indice)}
        </DialogContent>
      )}
    </Dialog>
  );
}

function BotonPaso({ lado, cosa, deshabilitado, alTocar }: { lado: "anterior" | "siguiente"; cosa: string; deshabilitado: boolean; alTocar: () => void }) {
  const Icono = lado === "anterior" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-disabled={deshabilitado || undefined}
      onClick={() => !deshabilitado && alTocar()}
      aria-label={`${cosa === "foto" ? "Foto" : "Trabajo"} ${lado}`}
      className={cn("absolute top-1/2 size-11 -translate-y-1/2 rounded-full bg-background/90 shadow-md aria-disabled:cursor-default aria-disabled:opacity-30", lado === "anterior" ? "left-2" : "right-2")}
    >
      <Icono className="size-5" />
    </Button>
  );
}
