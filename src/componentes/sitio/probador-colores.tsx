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

/**
 * El aro dibujado (original): neumático, disco y pinza detrás, y el aro de cinco rayos dobles del color elegido. Los
 * grises son del dibujo (goma, disco y tuercas), no de la interfaz: no cambian con el tema.
 */
function Aro({ id, luz, reflejo }: { id: string; luz: number; reflejo: number }) {
  const g = (nombre: string) => `${id}-${nombre}`;
  const pintura = "transition-[fill,opacity] duration-500 motion-reduce:transition-none";
  return (
    <svg viewBox="0 0 400 400" aria-hidden className="size-full overflow-visible drop-shadow-[0_24px_30px_rgb(0_0_0/0.6)]">
      <defs>
        <radialGradient id={g("neumatico")} cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#1c1c1c" />
          <stop offset="92%" stopColor="#0d0d0d" />
          <stop offset="100%" stopColor="#050505" />
        </radialGradient>
        <radialGradient id={g("disco")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5c5c5c" />
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
          <stop offset="38%" stopColor="#fff" stopOpacity="0" />
          <stop offset="48%" stopColor="#fff" stopOpacity=".85" />
          <stop offset="52%" stopColor="#fff" stopOpacity=".85" />
          <stop offset="62%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* Un rayo doble: angosto en el centro y ancho donde se une al borde */}
        <g id={g("rayo")}>
          <path d="M187 162 Q182 120 170 80 Q184 72 197 74 L198 162 Z" />
          <path d="M213 162 Q218 120 230 80 Q216 72 203 74 L202 162 Z" />
        </g>
        <g id={g("pieza")}>
          <path fillRule="evenodd" d="M200 48 A152 152 0 1 1 199.9 48 Z M200 72 A128 128 0 1 0 200.1 72 Z" />
          {[0, 72, 144, 216, 288].map((grados) => (
            <use key={grados} href={`#${g("rayo")}`} transform={`rotate(${grados} 200 200)`} />
          ))}
          <circle cx="200" cy="200" r="44" />
        </g>
      </defs>
      <circle cx="200" cy="200" r="196" fill={`url(#${g("neumatico")})`} />
      <circle cx="200" cy="200" r="176" fill="none" stroke="#262626" strokeWidth="2" />
      <circle cx="200" cy="200" r="112" fill={`url(#${g("disco")})`} />
      <circle cx="200" cy="200" r="112" fill="none" stroke="#2c2c2c" strokeWidth="10" strokeDasharray="2 9" />
      <path d="M268 120 A96 96 0 0 1 300 178 L280 182 A76 76 0 0 0 254 136 Z" fill="#2a2a2a" />
      <use href={`#${g("pieza")}`} className={pintura} style={{ fill: "var(--aro)" }} />
      <use href={`#${g("pieza")}`} fill={`url(#${g("luz")})`} className={pintura} style={{ opacity: luz, mixBlendMode: "soft-light" }} />
      <use href={`#${g("pieza")}`} fill={`url(#${g("destello")})`} className={pintura} style={{ opacity: reflejo, mixBlendMode: "screen" }} />
      <circle cx="200" cy="200" r="22" fill="#151515" />
      <circle cx="200" cy="200" r="150" fill="none" stroke="#000" strokeOpacity=".35" strokeWidth="1.5" />
      <g fill="#8a8a8a">
        <circle cx="200" cy="174" r="4.5" />
        <circle cx="224.7" cy="192" r="4.5" />
        <circle cx="215.3" cy="221" r="4.5" />
        <circle cx="184.7" cy="221" r="4.5" />
        <circle cx="175.3" cy="192" r="4.5" />
      </g>
    </svg>
  );
}
