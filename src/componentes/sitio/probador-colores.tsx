"use client";

import { useId, useRef, useState } from "react";
import { cn } from "cn";
import type { ColorServicio } from "@/db/esquema/sitio";
import { enlaceWhatsApp, mensajeColor } from "@/lib/whatsapp";
import { LUZ_ACABADO, NOMBRE_ACABADO } from "@/modulos/sitio/colores";
import { IconoWhatsApp } from "./iconos-marca";

// Pedido 56 (P56-probador-de-colores.md): en la página de un servicio con colores (el repintado de aros), se elige un
// color y se ve en un aro dibujado; "Quiero este color" abre WhatsApp con el color ya escrito. Sin precios (RN-10).
// El dibujo es original, sin marcas. Al cambiar de color, una pasada de luz en 60°, el único ángulo de la marca; con
// "menos movimiento", sin animación.

type Props = {
  servicio: string;
  colores: ColorServicio[];
  /** El WhatsApp del negocio; sin número, el botón lleva a Contacto. */
  whatsapp: string | null;
};

export function ProbadorColores({ servicio, colores, whatsapp }: Props) {
  const [elegido, setElegido] = useState(0);
  const pasada = useRef<HTMLDivElement>(null);
  // Sin los signos de useId: el id va en url(#…) de los degradados del dibujo
  const id = `probador${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const color = colores[Math.min(elegido, colores.length - 1)];
  const luz = LUZ_ACABADO[color.acabado];
  const acabado = NOMBRE_ACABADO[color.acabado];
  const href = whatsapp ? enlaceWhatsApp(whatsapp, mensajeColor(servicio, color.nombre, acabado)) : "/contacto";

  const elegir = (i: number) => {
    setElegido(i);
    // Vuelve a empezar la pasada de luz
    const el = pasada.current;
    if (el) {
      el.classList.remove("tt-pasada--ver");
      void el.offsetWidth;
      el.classList.add("tt-pasada--ver");
    }
  };

  return (
    <section aria-labelledby={`${id}-titulo`} className="relative grid items-center gap-6 overflow-hidden bg-superficie p-5 md:grid-cols-[1.1fr_1fr] md:gap-10 md:p-12">
      {/* La franja de 60° de la marca, detrás */}
      <div aria-hidden className="pointer-events-none absolute inset-y-[-20%] left-[30%] w-1/2 -skew-x-[30deg] bg-superficie-alta md:left-[38%] md:w-1/3" />

      <div className="relative mx-auto aspect-square w-full max-w-[340px] md:max-w-[520px]" style={{ "--aro": color.hex } as React.CSSProperties}>
        <Aro id={id} luz={luz.luz} reflejo={luz.reflejo} />
        <div ref={pasada} aria-hidden className="tt-pasada pointer-events-none absolute inset-0 overflow-hidden rounded-full" />
      </div>

      <div className="relative flex min-w-0 flex-col gap-6">
        <h2 id={`${id}-titulo`} className="font-heading text-[32px] leading-[32px] font-extrabold text-balance uppercase italic md:text-[48px] md:leading-[46px]">
          Elige el color
        </h2>
        <div aria-live="polite">
          <p className="text-sm text-tinta-suave">Color elegido</p>
          <p className="font-heading text-[40px] leading-[40px] font-extrabold uppercase italic md:text-[56px] md:leading-[54px]">{color.nombre}</p>
          <p className="mt-1 text-tinta-media">{acabado}</p>
        </div>
        <ul aria-label="Colores" className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pt-0.5 pb-2 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(92px,1fr))] md:overflow-visible md:px-0">
          {colores.map((c, i) => (
            <li key={i} className="w-[92px] shrink-0 snap-start md:w-auto">
              <button
                type="button"
                onClick={() => elegir(i)}
                aria-pressed={i === elegido}
                className={cn(
                  "flex w-full flex-col items-center gap-2 border-2 bg-fondo px-1.5 pt-3 pb-2.5 text-center text-[13px] leading-tight font-semibold hover:border-superficie-alta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-texto",
                  i === elegido ? "border-tinta" : "border-transparent",
                )}
              >
                <span
                  aria-hidden
                  className="size-[38px] rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.15)]"
                  style={{
                    background:
                      c.acabado === "mate"
                        ? c.hex
                        : `radial-gradient(circle at 32% 28%, rgb(255 255 255 / ${c.acabado === "brillante" ? 0.75 : 0.35}), transparent ${c.acabado === "brillante" ? 38 : 45}%), ${c.hex}`,
                  }}
                />
                <span>{c.nombre}</span>
                <span className="text-xs font-medium text-tinta-suave">{NOMBRE_ACABADO[c.acabado]}</span>
              </button>
            </li>
          ))}
        </ul>
        <a href={href} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noopener" : undefined} className="tt-boton tt-boton--principal self-stretch md:self-start">
          <IconoWhatsApp />
          Quiero este color
          <span className="sr-only"> por WhatsApp</span>
        </a>
        <p className="-mt-2 text-sm text-tinta-suave">El tono final se confirma en el taller con una muestra.</p>
      </div>
    </section>
  );
}

// El aro deportivo (aprobado el 21/11): cinco pares de rayos rectos que nacen juntos en el centro y se separan hacia el
// borde, cada rayo partido en una mitad con luz y otra con sombra (da volumen); borde con canto, neumático de perfil bajo
// y disco perforado detrás. Las formas se calculan una vez, al cargar el módulo.
const C = 200;
const P = (r: number, grados: number): [number, number] => [C + r * Math.sin((grados * Math.PI) / 180), C - r * Math.cos((grados * Math.PI) / 180)];
const n1 = (v: number) => Math.round(v * 10) / 10;
const camino = (puntos: [number, number][]) => "M" + puntos.map(([x, y]) => `${n1(x)} ${n1(y)}`).join(" L") + " Z";

/** Un rayo recto de A a B, más angosto en A: sus dos mitades (luz a un lado del eje, sombra al otro). */
function rayoRecto(a: [number, number], b: [number, number], medioA: number, medioB: number) {
  const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [nx, ny] = [-(b[1] - a[1]) / largo, (b[0] - a[0]) / largo];
  const lado = (p: [number, number], m: number, signo: number): [number, number] => [p[0] + nx * m * signo, p[1] + ny * m * signo];
  return {
    luz: camino([lado(a, medioA, -1), lado(b, medioB, -1), b, a]),
    sombra: camino([a, b, lado(b, medioB, 1), lado(a, medioA, 1)]),
  };
}

const RAYOS = [0, 1, 2, 3, 4].flatMap((k) => [-1, 1].map((lado) => rayoRecto(P(40, k * 72 + lado * 9), P(148, k * 72 + lado * 8.5), 6.5, 11)));
const AGUJEROS = Array.from({ length: 36 }, (_, k) => [P(100, k * 10), P(113, k * 10 + 5)]).flat();
const TUERCAS = [0, 1, 2, 3, 4].map((k) => P(27, 36 + k * 72));
const PINZA = `M${P(136, 28).map(n1).join(" ")} A136 136 0 0 1 ${P(136, 82).map(n1).join(" ")} L${P(96, 80).map(n1).join(" ")} A96 96 0 0 0 ${P(96, 30).map(n1).join(" ")} Z`;
const PINZA_FILO = `M${P(128, 36).map(n1).join(" ")} A128 128 0 0 1 ${P(128, 74).map(n1).join(" ")}`;

/** El aro dibujado (original, sin marcas). Los grises son del dibujo (goma, disco, pinza y tuercas), no del tema. */
function Aro({ id, luz, reflejo }: { id: string; luz: number; reflejo: number }) {
  const g = (nombre: string) => `${id}-${nombre}`;
  const pintura = "transition-[fill,opacity] duration-500 motion-reduce:transition-none";
  return (
    <svg viewBox="0 0 400 400" aria-hidden className="size-full overflow-visible drop-shadow-[0_24px_30px_rgb(0_0_0/0.6)]">
      <defs>
        <radialGradient id={g("neumatico")} cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="#1d1d1d" />
          <stop offset="94%" stopColor="#111" />
          <stop offset="100%" stopColor="#060606" />
        </radialGradient>
        <radialGradient id={g("disco")} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#6c6c6c" />
          <stop offset="100%" stopColor="#3a3a3a" />
        </radialGradient>
        {/* La luz sobre la pintura: clara arriba a la izquierda, oscura abajo a la derecha */}
        <linearGradient id={g("luz")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity=".9" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0" />
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity=".85" />
        </linearGradient>
        <linearGradient id={g("destello")} x1="0" y1="0" x2="1" y2="0" gradientTransform="rotate(60 .5 .5)">
          <stop offset="36%" stopColor="#fff" stopOpacity="0" />
          <stop offset="47%" stopColor="#fff" stopOpacity=".9" />
          <stop offset="53%" stopColor="#fff" stopOpacity=".9" />
          <stop offset="64%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* Lo que se pinta: el borde, los rayos y el centro */}
        <g id={g("pieza")}>
          <path fillRule="evenodd" d="M200 38 A162 162 0 1 1 199.9 38 Z M200 54 A146 146 0 1 0 200.1 54 Z" />
          {RAYOS.map((r, i) => (
            <g key={i}>
              <path d={r.luz} />
              <path d={r.sombra} />
            </g>
          ))}
          <circle cx="200" cy="200" r="46" />
        </g>
      </defs>
      {/* Neumático de perfil bajo */}
      <circle cx="200" cy="200" r="197" fill={`url(#${g("neumatico")})`} />
      <circle cx="200" cy="200" r="186" fill="none" stroke="#2a2a2a" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="168" fill="none" stroke="#0a0a0a" strokeWidth="6" />
      {/* Lo de adentro: el fondo del aro, el disco perforado y la pinza */}
      <circle cx="200" cy="200" r="146" fill="#0b0b0b" />
      <circle cx="200" cy="200" r="126" fill={`url(#${g("disco")})`} />
      <circle cx="200" cy="200" r="126" fill="none" stroke="#333" strokeWidth="2" />
      <circle cx="200" cy="200" r="88" fill="#2b2b2b" />
      <g fill="#1a1a1a">
        {AGUJEROS.map(([x, y], i) => (
          <circle key={i} cx={n1(x)} cy={n1(y)} r="2.6" />
        ))}
      </g>
      <path d={PINZA} fill="#3b3e42" />
      <path d={PINZA_FILO} fill="none" stroke="#5a5e63" strokeWidth="3" strokeLinecap="round" />
      {/* El aro, del color elegido */}
      <use href={`#${g("pieza")}`} className={pintura} style={{ fill: "var(--aro)" }} />
      {/* El volumen de los rayos: una mitad con luz, la otra con sombra */}
      <g fill="#fff" opacity=".16">
        {RAYOS.map((r, i) => (
          <path key={i} d={r.luz} />
        ))}
      </g>
      <g fill="#000" opacity=".34">
        {RAYOS.map((r, i) => (
          <path key={i} d={r.sombra} />
        ))}
      </g>
      {/* El fondo del borde, más oscuro (da profundidad), y el canto que brilla */}
      <circle cx="200" cy="200" r="147.5" fill="none" stroke="#000" strokeOpacity=".45" strokeWidth="3" />
      <circle cx="200" cy="200" r="160.5" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="155" fill="none" stroke="#000" strokeOpacity=".2" strokeWidth="1" />
      {/* La luz del acabado: mate apagado, brillante con destello */}
      <use href={`#${g("pieza")}`} fill={`url(#${g("luz")})`} className={pintura} style={{ opacity: luz, mixBlendMode: "soft-light" }} />
      <use href={`#${g("pieza")}`} fill={`url(#${g("destello")})`} className={pintura} style={{ opacity: reflejo, mixBlendMode: "screen" }} />
      {/* El centro: alrededor de las tuercas, las tuercas y la tapa lisa */}
      <circle cx="200" cy="200" r="38" fill="none" stroke="#000" strokeOpacity=".3" strokeWidth="2" />
      {TUERCAS.map(([x, y], i) => (
        <g key={i}>
          <circle cx={n1(x)} cy={n1(y)} r="5.2" fill="#8c8f94" />
          <circle cx={n1(x)} cy={n1(y)} r="2.4" fill="#2a2a2a" />
        </g>
      ))}
      <circle cx="200" cy="200" r="15" fill="#151515" />
      <circle cx="200" cy="200" r="15" fill="none" stroke="#3a3a3a" strokeWidth="1.5" />
    </svg>
  );
}
