import { useEffect, useRef, useState } from "react";
import { EraserIcon } from "lucide-react";
import { Button } from "@/componentes/ui/button";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Un recuadro para firmar con el dedo o el mouse (pedido 13: la firma del cliente al entregar). Al levantar el dedo
// avisa con la imagen (PNG con el fondo del panel, así se lee sola en cualquier visor); "Borrar firma" la limpia. Los
// colores son los tokens del panel (`--tinta` y `--fondo`). Sigue un solo dedo: otro dedo o la palma no la ensucian.
// Si cambia el ancho (girar el celular, una barra de desplazamiento), la firma se conserva, redibujada al nuevo ancho.

type Props = {
  /** La firma como imagen, o null si está vacía (también al desmontarse). */
  alCambiar: (firma: Blob | null) => void;
  /** Para el lector de pantalla y las pruebas. */
  etiqueta: string;
  invalido?: boolean;
  describedBy?: string;
};

const ALTO = 180;

/** Un color de los tokens del panel (globals.css). */
const token = (nombre: string) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();

export function PanelFirma({ alCambiar, etiqueta, invalido, describedBy }: Props) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  /** El dedo (o el mouse) que firma: los demás se ignoran. */
  const puntero = useRef<number | null>(null);
  const montado = useRef(true);
  const [vacia, setVacia] = useState(true);

  // El tamaño real del lienzo, en píxeles del dispositivo: así el trazo no sale borroso en el celular
  useEffect(() => {
    montado.current = true;
    const c = lienzo.current;
    if (!c) return;
    const preparar = (copia?: HTMLCanvasElement) => {
      const escala = window.devicePixelRatio || 1;
      c.width = Math.round(c.clientWidth * escala);
      c.height = Math.round(ALTO * escala);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = token("--fondo");
      ctx.fillRect(0, 0, c.width, c.height);
      // Lo ya firmado, al nuevo ancho (se ve igual; la imagen enviada no cambia)
      if (copia) ctx.drawImage(copia, 0, 0, c.width, c.height);
      ctx.scale(escala, escala);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = token("--tinta");
    };
    preparar();
    let ancho = c.clientWidth;
    const observador = new ResizeObserver(() => {
      if (c.clientWidth === ancho) return;
      ancho = c.clientWidth;
      const copia = document.createElement("canvas");
      copia.width = c.width;
      copia.height = c.height;
      copia.getContext("2d")?.drawImage(c, 0, 0);
      preparar(copia);
    });
    observador.observe(c);
    return () => {
      observador.disconnect();
      // Sin el recuadro, no hay firma: la que estaba no se envía
      montado.current = false;
      alCambiar(null);
    };
  }, [alCambiar]);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function empezar(e: React.PointerEvent<HTMLCanvasElement>) {
    // Solo el primer dedo o el botón principal del mouse
    if (puntero.current !== null || !e.isPrimary || e.button !== 0) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    puntero.current = e.pointerId;
    const { x, y } = punto(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Un toque sin mover deja un punto
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerId !== puntero.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = punto(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function terminar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerId !== puntero.current) return;
    puntero.current = null;
    // "Borrar firma" se habilita con la imagen ya lista: hasta entonces, la firma no se enviaría. Si el recuadro ya no
    // está (marcaron "Entregar sin firma" en el medio), la imagen no se avisa
    e.currentTarget.toBlob((imagen) => {
      if (!montado.current) return;
      setVacia(!imagen);
      alCambiar(imagen);
    }, "image/png");
  }

  function borrar() {
    const c = lienzo.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = token("--fondo");
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.restore();
    }
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
        // Como campo con error: la pantalla y el foco van aquí si falta la firma (useFocoEnError)
        data-invalido={invalido || undefined}
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
