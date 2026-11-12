"use client";

import { useEffect, useRef, useState } from "react";

// El video de "Mira cómo trabajamos" dentro del celular de la portada (pedido 48, `etapas/P48-video-tiktok.md` §3):
// sin sonido y en bucle, se pide recién cuando el celular está a la vista (preload="none") y se pausa al salir. Con
// "reducir movimiento" o "ahorro de datos" no se reproduce solo: queda la foto con el botón (tocar el celular abre
// TikTok, como sin video). Decorativo: el celular va oculto para el lector de pantalla y el enlace es "Ver en TikTok".

type Conexion = { saveData?: boolean };

function puedeMoverseSolo(): boolean {
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ahorro = (navigator as Navigator & { connection?: Conexion }).connection?.saveData === true;
  return !reducir && !ahorro;
}

export function VideoDelCelular({ src, tipo, poster }: { src: string; tipo: string; poster: string | null }) {
  const video = useRef<HTMLVideoElement>(null);
  const [moviendose, setMoviendose] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v || !puedeMoverseSolo()) return;
    const observador = new IntersectionObserver(
      ([e]) => {
        // play() puede rechazarse (el navegador no deja reproducir solo): queda la foto con el botón
        if (e.isIntersecting) v.play().catch(() => setMoviendose(false));
        else v.pause();
      },
      { threshold: 0.4 },
    );
    observador.observe(v);
    return () => observador.disconnect();
  }, []);

  return (
    <>
      <video
        ref={video}
        muted
        loop
        playsInline
        // Sin foto de la galería, que cargue el primer cuadro para no dejar la pantalla negra (Safari lo dibuja solo
        // si se le pide un momento del video: #t=0.1)
        preload={poster ? "none" : "metadata"}
        poster={poster ?? undefined}
        onPlaying={() => setMoviendose(true)}
        onPause={() => setMoviendose(false)}
        className="size-full object-cover"
      >
        <source src={poster ? src : `${src}#t=0.1`} type={tipo} />
      </video>
      {!moviendose && <BotonReproducir />}
    </>
  );
}

/** El círculo con el triángulo, como el de un video de TikTok sin reproducir. */
export function BotonReproducir() {
  return (
    <span className="tt-celular__reproducir">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7Z" />
      </svg>
    </span>
  );
}
