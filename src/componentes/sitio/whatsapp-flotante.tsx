"use client";

import { useEffect, useRef, useState } from "react";
import { XIcon } from "lucide-react";
import { IconoWhatsApp } from "./iconos-marca";
import { ATRIBUTO_PRINCIPAL } from "./whatsapp-comun";

// Botón fijo de WhatsApp (HU-15). Se esconde mientras el botón principal de WhatsApp de la página
// (los marcados con data-whatsapp-principal) está a la vista: así nunca hay dos botones iguales en pantalla.
// Aparece cuando ese botón sale de la pantalla, o enseguida si la página no tiene uno.
// No hay versión sin JavaScript: el número llega en contenido transmitido, que el navegador inserta con JavaScript.
// La nubecita (pedido de la demo del 24/10, registro de cambios 1): unos segundos después de aparecer el botón, sale a
// su lado con una pregunta corta (que también abre WhatsApp) y el botón da un saltito. Una sola vez por visita: al
// salir queda anotada, y en las páginas siguientes ya no aparece. Se cierra con su X; el foco pasa al botón.

/** Milisegundos de espera antes de la nubecita: que primero se vea la página. */
const ESPERA_NUBE = 3000;
const NUBE_VISTA = "tt-whatsapp-nube-vista";

function nubeVista(): boolean {
  try {
    return sessionStorage.getItem(NUBE_VISTA) === "1";
  } catch {
    return false;
  }
}

export function WhatsAppFlotante({ href }: { href: string }) {
  const [visible, setVisible] = useState(false);
  const [nube, setNube] = useState<"esperando" | "abierta" | "cerrada">("esperando");
  const boton = useRef<HTMLAnchorElement>(null);

  // La primera vez que aparece el botón en la visita, la nubecita sale después de la espera
  useEffect(() => {
    if (!visible || nube !== "esperando" || nubeVista()) return;
    const reloj = setTimeout(() => {
      setNube("abierta");
      try {
        sessionStorage.setItem(NUBE_VISTA, "1");
      } catch {
        // Sin almacenamiento (ventana privada): saldrá también en la página siguiente
      }
    }, ESPERA_NUBE);
    return () => clearTimeout(reloj);
  }, [visible, nube]);

  function cerrarNube() {
    setNube("cerrada");
    // El botón de cerrar desaparece: el foco no se pierde, pasa al de WhatsApp
    boton.current?.focus();
  }

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

  const abierta = nube === "abierta";
  return (
    <div className="tt-whatsapp-fijo" data-visible={visible} data-nube={abierta}>
      {abierta && (
        <div className="tt-nube">
          <a href={href} target="_blank" rel="noreferrer" className="tt-nube__enlace">
            ¿Cotizamos tu vehículo?
          </a>
          <button type="button" onClick={cerrarNube} aria-label="Cerrar el mensaje" className="tt-nube__cerrar">
            <XIcon aria-hidden />
          </button>
        </div>
      )}
      <a ref={boton} href={href} target="_blank" rel="noreferrer" aria-label="Escribir a TocTar por WhatsApp" className="tt-whatsapp tt-whatsapp--fijo">
        <IconoWhatsApp />
      </a>
    </div>
  );
}
