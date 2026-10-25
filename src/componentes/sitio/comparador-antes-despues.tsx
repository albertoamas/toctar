"use client";

import { useEffect, useId, useRef, useState } from "react";
import { proporcionDe } from "@/lib/formato-fotos";
import type { UrlsFoto } from "@/lib/fotos";

// Comparador de antes y después de la galería pública: una sola foto partida por una línea que se arrastra. A la
// izquierda de la línea, el antes; a la derecha, el después. El tirador es el paralelogramo rojo a 60° de la marca.
// - Con el dedo o el mouse: se arrastra de costado en cualquier punto de la foto, o se toca donde se quiere la línea.
//   Un gesto vertical desplaza la página y no mueve la línea (`touch-action: pan-y` y el umbral de abajo).
// - Con el teclado y el lector de pantalla: un deslizador nativo (oculto) que mueve la misma línea con las flechas.
// Las dos fotos se ven enteras (`object-contain`): si no tienen la misma forma, una queda con bordes, pero nunca recortada.
// Con `marco` (la galería) va en un recuadro de 4:3 como los demás trabajos y las fotos lo llenan (`object-cover`), salvo
// que el antes y el después tengan formas distintas: recortadas no coincidirían, y van enteras.
// El alto máximo sale de la variable `--alto-comparador` (70dvh si nadie la pone): la portada lo achica en el celular.
// `sola` (la portada, pedido de YankoSoft del 24/10): la línea va y viene sola unas veces hasta que el visitante la
// arrastra, la toca o la enfoca con el teclado; se pausa fuera de la pantalla y no se mueve con "reducir movimiento".

type Foto = Pick<UrlsFoto, "url" | "miniatura" | "ancho" | "alto">;

const INICIO = 50;
/** Píxeles de movimiento antes de decidir si el gesto es un arrastre de costado (línea) o un desplazamiento (página). */
const UMBRAL = 8;
/** Cerca del borde, la etiqueta de ese lado quedaría sobre la otra foto: se esconde (en % del ancho). */
const MARGEN_ETIQUETA = 15;
/** El movimiento solo: espera al estar a la vista, cuánto se aleja del medio (del 20 al 80 %) y cuánto dura una ida y vuelta. */
const ESPERA_MS = 1000;
const AMPLITUD = 30;
const PERIODO_MS = 5000;
/** Idas y vueltas antes de quedarse en el medio. */
const VUELTAS = 3;

type Gesto = { id: number; x: number; y: number; arrastrando: boolean };

export function ComparadorAntesDespues({
  antes,
  despues,
  descripcion,
  conLeyenda = false,
  alFrente = false,
  sola = false,
  sinAyuda = false,
  marco = false,
  sizes = "(min-width: 768px) 50vw, 100vw",
}: {
  antes: Foto;
  despues: Foto;
  descripcion: string;
  /** La descripción, visible debajo (la portada dice qué trabajo es). */
  conLeyenda?: boolean;
  /** Está en la primera pantalla (la portada, el primer par de la galería): las fotos cargan enseguida. */
  alFrente?: boolean;
  /** La línea se mueve sola hasta que el visitante la toca (la portada). */
  sola?: boolean;
  /** "Arrastra la línea para comparar" solo para el lector de pantalla: la galería lo dice una vez, arriba. */
  sinAyuda?: boolean;
  /** En un recuadro de 4:3 que las fotos llenan: la galería, donde todos los trabajos miden lo mismo. */
  marco?: boolean;
  /** Qué ancho ocupa en la pantalla (atributo `sizes`): el navegador elige la versión de 640 px o la grande. */
  sizes?: string;
}) {
  const [corte, setCorte] = useState(INICIO);
  // Una vez que el visitante la toca, la línea queda donde la deja: ya no se mueve sola
  const [quieta, setQuieta] = useState(!sola);
  const caja = useRef<HTMLDivElement>(null);
  const gesto = useRef<Gesto | null>(null);
  const id = useId();
  // La caja toma la forma de la foto de después y nunca pasa del alto máximo
  const proporcion = proporcionDe(despues);
  // En el marco, las fotos lo llenan si tienen la misma forma (con 5 % de tolerancia); si no, van enteras
  const mismaForma = Math.abs(proporcionDe(antes) / proporcion - 1) < 0.05;
  const ajuste = marco && mismaForma ? "object-cover" : "object-contain";
  const estiloCaja: React.CSSProperties & Record<"--corte", number> = marco
    ? { "--corte": corte, aspectRatio: "4 / 3" }
    : { "--corte": corte, aspectRatio: proporcion, maxWidth: `calc(var(--alto-comparador, 70dvh) * ${proporcion})` };

  // El movimiento solo: un vaivén suave desde el medio, solo mientras la foto está a la vista y la pestaña abierta.
  // Escribe la posición directo en la variable --corte de la caja (sin pasar por React en cada cuadro). El deslizador
  // queda en el medio mientras tanto: su valor no cambia bajo el lector de pantalla. Tras unas idas y vueltas vuelve al
  // medio y se detiene: no queda moviéndose para siempre (WCAG 2.2.2).
  const animado = useRef(INICIO);
  useEffect(() => {
    const el = caja.current;
    const reducir = matchMedia("(prefers-reduced-motion: reduce)");
    if (quieta || !el || reducir.matches) return;
    let visible = false;
    let terminado = false;
    let cuadro = 0;
    let anterior: number | null = null;
    let transcurrido = 0;
    const poner = (valor: number) => {
      animado.current = valor;
      el.style.setProperty("--corte", String(valor));
    };
    const parar = () => {
      cancelAnimationFrame(cuadro);
      cuadro = 0;
      anterior = null;
    };
    const paso = (ahora: number) => {
      if (anterior !== null) transcurrido += ahora - anterior;
      anterior = ahora;
      const enMovimiento = transcurrido - ESPERA_MS;
      if (enMovimiento >= VUELTAS * PERIODO_MS) {
        terminado = true;
        poner(INICIO);
        parar();
        return;
      }
      if (enMovimiento > 0) poner(INICIO + AMPLITUD * Math.sin((enMovimiento / PERIODO_MS) * 2 * Math.PI));
      cuadro = requestAnimationFrame(paso);
    };
    const seguir = () => {
      if (cuadro || terminado || !visible || document.hidden || reducir.matches) return;
      cuadro = requestAnimationFrame(paso);
    };
    const observador = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) seguir();
      else parar();
    });
    observador.observe(el);
    const alCambiarPestana = () => (document.hidden ? parar() : seguir());
    document.addEventListener("visibilitychange", alCambiarPestana);
    // Si se activa "reducir movimiento" con la página abierta, se detiene en el medio
    const alReducir = () => {
      if (!reducir.matches) return;
      terminado = true;
      parar();
      poner(INICIO);
    };
    reducir.addEventListener("change", alReducir);
    return () => {
      parar();
      observador.disconnect();
      document.removeEventListener("visibilitychange", alCambiarPestana);
      reducir.removeEventListener("change", alReducir);
    };
  }, [quieta]);

  /** El visitante toma la línea: deja de moverse sola y sigue desde donde estaba. */
  function detener() {
    if (quieta) return;
    setCorte(animado.current);
    setQuieta(true);
  }

  function moverA(x: number) {
    const r = caja.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setCorte(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)));
  }

  return (
    // Con la ayuda oculta (sinAyuda) no queda espacio debajo: la foto termina donde termina la caja
    <div className={sinAyuda ? "flex flex-col" : "flex flex-col gap-2"}>
      <div
        ref={caja}
        className="group relative mx-auto w-full cursor-ew-resize touch-pan-y overflow-hidden bg-superficie select-none"
        // --corte: dónde está la línea (en %), la lee todo lo de adentro; el movimiento solo la escribe directo
        style={estiloCaja}
        onPointerDown={(e) => {
          // Solo el dedo principal o el botón izquierdo: el clic derecho (guardar la foto) o un segundo dedo no mueven nada
          if (!e.isPrimary || e.button !== 0) return;
          gesto.current = { id: e.pointerId, x: e.clientX, y: e.clientY, arrastrando: false };
        }}
        onPointerMove={(e) => {
          const g = gesto.current;
          if (!g || g.id !== e.pointerId) return;
          if (!g.arrastrando) {
            const dx = Math.abs(e.clientX - g.x);
            if (dx < UMBRAL || dx < Math.abs(e.clientY - g.y)) return;
            g.arrastrando = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            // Un arrastre de costado toma la línea; un desplazamiento de la página, no
            detener();
          }
          moverA(e.clientX);
        }}
        onPointerUp={(e) => {
          const g = gesto.current;
          gesto.current = null;
          // Un toque sin arrastre lleva la línea ahí
          if (g && g.id === e.pointerId && !g.arrastrando && Math.hypot(e.clientX - g.x, e.clientY - g.y) < UMBRAL) {
            detener();
            moverA(e.clientX);
          }
        }}
        // El navegador tomó el gesto para desplazar la página: la línea no se toca
        onPointerCancel={() => (gesto.current = null)}
      >
        <FotoComparada foto={despues} alt={`Después: ${descripcion}`} alFrente={alFrente} sizes={sizes} className={ajuste} />
        {/* El antes encima, recortado hasta la línea */}
        <FotoComparada
          foto={antes}
          alt={`Antes: ${descripcion}`}
          alFrente={alFrente}
          sizes={sizes}
          className={`bg-superficie ${ajuste}`}
          style={{ clipPath: "inset(0 calc(100% - var(--corte) * 1%) 0 0)" }}
        />
        {corte > MARGEN_ETIQUETA && <span aria-hidden className="absolute top-2 left-2 bg-negro/75 px-2 py-0.5 text-sm font-semibold text-blanco">Antes</span>}
        {corte < 100 - MARGEN_ETIQUETA && (
          <span aria-hidden className="absolute top-2 right-2 bg-negro/75 px-2 py-0.5 text-sm font-semibold text-blanco">Después</span>
        )}

        {/* El deslizador del teclado y el lector de pantalla: oculto; su foco se ve en el tirador (group-has) */}
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={Math.round(corte)}
          onChange={(e) => {
            detener();
            setCorte(Number(e.target.value));
          }}
          // Con el foco del teclado, la línea deja de moverse sola
          onFocus={detener}
          aria-label="Comparar antes y después"
          aria-valuetext={`Antes, hasta el ${Math.round(corte)} % de la foto`}
          aria-describedby={`${id}-ayuda`}
          className="sr-only"
        />
        {/* La línea, con un borde oscuro fino (ring) para que se lea sobre fotos claras */}
        <span aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-blanco ring-1 ring-negro/45" style={{ left: "calc(var(--corte) * 1%)" }} />
        {/* El tirador: el corte a 60° de la marca (skew de 30°). En los bordes no se sale de la foto: queda entero adentro */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 flex h-11 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          style={{ left: "clamp(1.75rem, calc(var(--corte) * 1%), calc(100% - 1.75rem))" }}
        >
          <span className="absolute inset-0 -skew-x-[30deg] bg-rojo outline-offset-2 outline-[var(--foco)] group-has-[input:focus-visible]:outline-2" />
          <span className="relative flex gap-1 text-lg leading-none font-bold text-blanco">
            <span>‹</span>
            <span>›</span>
          </span>
        </span>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        {conLeyenda && <p className="font-semibold">{descripcion}</p>}
        <p id={`${id}-ayuda`} className={sinAyuda ? "sr-only" : "text-sm text-tinta-suave"}>
          Arrastra la línea para comparar
        </p>
      </div>
    </div>
  );
}

/**
 * Una de las dos fotos, a todo el recuadro. Con sus dos versiones (640 px y la grande): el navegador elige según el
 * ancho que ocupa (`sizes`) y la densidad de la pantalla. Al frente carga enseguida; si no, al acercarse a la pantalla.
 */
function FotoComparada(props: { foto: Foto; alt: string; alFrente: boolean; sizes: string; className: string; style?: React.CSSProperties }) {
  const { foto, alt, alFrente, sizes, className, style } = props;
  const srcSet = foto.miniatura === foto.url ? undefined : `${foto.miniatura} 640w, ${foto.url} ${foto.ancho ?? 1600}w`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- next/image no arma este srcSet (las fotos van sin su optimizador)
    <img
      src={foto.miniatura}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      draggable={false}
      loading={alFrente ? undefined : "lazy"}
      className={`absolute inset-0 size-full ${className}`}
      style={style}
    />
  );
}
