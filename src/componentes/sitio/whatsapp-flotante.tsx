"use client";

import { useEffect, useState } from "react";
import { IconoWhatsApp } from "./iconos-marca";
import { ATRIBUTO_PRINCIPAL } from "./whatsapp-comun";

// Botón fijo de WhatsApp (HU-15). Se esconde mientras el botón principal de WhatsApp de la página
// (los marcados con data-whatsapp-principal) está a la vista: así nunca hay dos botones iguales en pantalla.
// Aparece cuando ese botón sale de la pantalla, o enseguida si la página no tiene uno.
// No hay versión sin JavaScript: el número llega en contenido transmitido, que el navegador inserta con JavaScript.

export function WhatsAppFlotante({ href }: { href: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observados = new Set<Element>();
    /** Observados que el IntersectionObserver todavía no midió: hasta medirlos no se decide (sin parpadeos). */
    const sinMedir = new Set<Element>();
    const aLaVista = new Set<Element>();
    const decidir = () => {
      if (sinMedir.size === 0) setVisible(aLaVista.size === 0);
    };

    const observador = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        sinMedir.delete(e.target);
        if (e.isIntersecting) aLaVista.add(e.target);
        else aLaVista.delete(e.target);
      }
      decidir();
    });

    const buscar = () => {
      // Un botón que salió de la página (por ejemplo, el provisorio que se reemplaza al terminar de cargar)
      // ya no cuenta: si no, quedaría "a la vista" para siempre.
      for (const el of observados) {
        if (!el.isConnected) {
          observados.delete(el);
          sinMedir.delete(el);
          aLaVista.delete(el);
          observador.unobserve(el);
        }
      }
      for (const el of document.querySelectorAll(`[${ATRIBUTO_PRINCIPAL}]`)) {
        if (!observados.has(el)) {
          observados.add(el);
          sinMedir.add(el);
          observador.observe(el);
        }
      }
    };

    buscar();
    // Los botones principales pueden llegar después (contenido que se transmite al cargar).
    const cambios = new MutationObserver(() => {
      buscar();
      decidir();
    });
    cambios.observe(document.body, { childList: true, subtree: true });
    // Si la página no tiene botón principal, el observador no avisa nada: se decide en el primer cuadro.
    const cuadro = requestAnimationFrame(decidir);
    return () => {
      cancelAnimationFrame(cuadro);
      observador.disconnect();
      cambios.disconnect();
    };
  }, []);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Escribir a TocTar por WhatsApp"
      className="tt-whatsapp tt-whatsapp--fijo"
      data-visible={visible}
    >
      <IconoWhatsApp />
    </a>
  );
}
