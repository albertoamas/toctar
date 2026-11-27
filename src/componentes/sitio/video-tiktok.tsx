"use client";

import { useEffect, useRef, useState } from "react";

// El video de "Mira cómo trabajamos" en la portada (pedido 48, `etapas/P48-video-tiktok.md` §3): sin sonido y en
// bucle. No se pide nada hasta que el video se acerca a la pantalla: recién ahí se le pone su archivo (con 20 MB, pedirlo
// al abrir la portada gastaría datos de quien nunca baja hasta ahí). A la vista se reproduce y al salir se pausa. Con
// "reducir movimiento" o "ahorro de datos" no se reproduce solo: queda el primer cuadro con el botón (tocarlo abre
// TikTok). Decorativo: va oculto para el lector de pantalla y el enlace es "Ver en TikTok".

type Conexion = { saveData?: boolean };

function puedeMoverseSolo(): boolean {
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ahorro = (navigator as Navigator & { connection?: Conexion }).connection?.saveData === true;
  return !reducir && !ahorro;
}

export function VideoTikTok({ src, tipo }: { src: string; tipo: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [cerca, setCerca] = useState(false);
  const [moviendose, setMoviendose] = useState(false);

  // Cerca de la pantalla (a 300 px), se le pone el archivo
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const observador = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setCerca(true);
        observador.disconnect();
      },
      { rootMargin: "300px" },
    );
    observador.observe(v);
    return () => observador.disconnect();
  }, []);

  // Ya con su archivo: a la vista se reproduce y al salir se pausa
  useEffect(() => {
    const v = video.current;
    if (!v || !cerca) return;
    // Un <source> agregado después no se lee solo: load() (también para el primer cuadro, aunque no se mueva)
    v.load();
    if (!puedeMoverseSolo()) return;
    const observador = new IntersectionObserver(
      ([e]) => {
        // play() puede rechazarse (el navegador no deja reproducir solo): queda el primer cuadro con el botón
        if (e.isIntersecting) v.play().catch(() => setMoviendose(false));
        else v.pause();
      },
      { threshold: 0.4 },
    );
    observador.observe(v);
    return () => observador.disconnect();
  }, [cerca]);

  return (
    <>
      <video
        ref={video}
        muted
        loop
        playsInline
        // Con su archivo, lo justo para el primer cuadro (Safari lo dibuja solo si se le pide un momento: #t=0.1)
        preload="metadata"
        onPlaying={() => setMoviendose(true)}
        onPause={() => setMoviendose(false)}
        className="size-full object-cover"
      >
        {cerca && <source src={`${src}#t=0.1`} type={tipo} />}
      </video>
      {!moviendose && (
        <span className="tt-video-tiktok__reproducir">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7Z" />
          </svg>
        </span>
      )}
    </>
  );
}
