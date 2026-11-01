import { useEffect, useRef, useState } from "react";
import { EraserIcon } from "lucide-react";
import { Button } from "@/componentes/ui/button";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Un recuadro para firmar con el dedo o el mouse (pedido 13: la firma del cliente al entregar). Al levantar el dedo
// avisa con la imagen (PNG, fondo transparente); "Borrar firma" la limpia. El trazo usa el color de tinta del panel.
// Si cambia el ancho (girar el celular), el recuadro se limpia: la firma se hace de nuevo.

type Props = {
  /** La firma como imagen, o null si está vacía. */
  alCambiar: (firma: Blob | null) => void;
  /** Para el lector de pantalla y las pruebas. */
  etiqueta: string;
  invalido?: boolean;
  describedBy?: string;
};

const ALTO = 180;

export function PanelFirma({ alCambiar, etiqueta, invalido, describedBy }: Props) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const [vacia, setVacia] = useState(true);

  // El tamaño real del lienzo, en píxeles del dispositivo: así el trazo no sale borroso en el celular
  useEffect(() => {
    const c = lienzo.current;
    if (!c) return;
    const ajustar = () => {
      const escala = window.devicePixelRatio || 1;
      c.width = Math.round(c.clientWidth * escala);
      c.height = Math.round(ALTO * escala);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.scale(escala, escala);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--tinta").trim() || "#1a1a1a";
    };
    ajustar();
    let ancho = c.clientWidth;
    const observador = new ResizeObserver(() => {
      if (c.clientWidth === ancho) return;
      ancho = c.clientWidth;
      ajustar();
      setVacia(true);
      alCambiar(null);
    });
    observador.observe(c);
    return () => observador.disconnect();
  }, [alCambiar]);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function empezar(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dibujando.current = true;
    const { x, y } = punto(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Un toque sin mover deja un punto
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = punto(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function terminar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return;
    dibujando.current = false;
    // "Borrar firma" se habilita con la imagen ya lista: hasta entonces, la firma no se enviaría
    e.currentTarget.toBlob((imagen) => {
      setVacia(!imagen);
      alCambiar(imagen);
    }, "image/png");
  }

  function borrar() {
    const c = lienzo.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setVacia(true);
    alCambiar(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={lienzo}
        role="img"
        aria-label={etiqueta}
        aria-describedby={describedBy}
        tabIndex={-1}
        // Sin "touch-action": el dedo dibuja en vez de mover la página
        className={`h-[180px] w-full touch-none rounded-sm border-2 border-dashed bg-fondo ${invalido ? "border-rojo-texto" : "border-border"}`}
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerCancel={terminar}
      />
      <Button type="button" variant="outline" className="self-start" disabled={vacia} onClick={borrar}>
        <EraserIcon />
        Borrar firma
      </Button>
    </div>
  );
}
