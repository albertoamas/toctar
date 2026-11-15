"use client";

import { Fragment, useEffect, useState } from "react";

// Una pantalla que empieza de cero cada vez que se vuelve a ella (hallazgo 9 de la prueba en celulares, 15/11). Next
// guarda oculta la última pantalla de cada ruta, con lo que tenía escrito (Cache Components): al salir sin guardar y
// volver a entrar, aunque fuera la misma dirección, aparecía lo descartado. Al ocultarse la pantalla, React corre la
// limpieza de sus efectos: ahí cambia la vez y lo de adentro se arma de nuevo. Lo usa PaginaPanel, en todas.
// Salir de la pantalla es descartar: por un enlace del panel, con cambios, ya se pregunta antes (AvisoAlSalir).
export function EmpiezaDeCero({ children }: { children: React.ReactNode }) {
  const [vez, setVez] = useState(0);
  useEffect(() => {
    // Solo en desarrollo, React monta, limpia y vuelve a montar enseguida para probar los efectos: esa limpieza no es
    // salir de la pantalla, y rearmar ahí borraba lo escrito antes de que cargara la página
    if (process.env.NODE_ENV !== "development") return () => setVez((v) => v + 1);
    let montado = false;
    const espera = setTimeout(() => (montado = true));
    return () => {
      clearTimeout(espera);
      if (montado) setVez((v) => v + 1);
    };
  }, []);
  return <Fragment key={vez}>{children}</Fragment>;
}
