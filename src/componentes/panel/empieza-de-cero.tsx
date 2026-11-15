"use client";

import { Fragment, useEffect, useState } from "react";

// Un formulario que empieza de cero cada vez que se vuelve a su pantalla (hallazgo 9 de la prueba en celulares, 15/11).
// Next guarda oculta la última pantalla de cada ruta, con lo que tenía escrito (Cache Components): al salir de Nueva
// reserva sin guardar y volver a entrar, aunque fuera la misma dirección, el formulario traía lo descartado. Al ocultarse
// la pantalla, React corre la limpieza de sus efectos: ahí se cambia la vez y lo de adentro se arma de nuevo.
// Salir de la pantalla es descartar: por un enlace del panel, con cambios, ya se pregunta antes (AvisoAlSalir).
export function EmpiezaDeCero({ children }: { children: React.ReactNode }) {
  const [vez, setVez] = useState(0);
  useEffect(() => {
    // En desarrollo, React monta, limpia y vuelve a montar enseguida para probar los efectos: esa limpieza no es salir
    // de la pantalla, y rearmar el formulario ahí borraba lo escrito antes de que cargara la página
    let montado = false;
    const espera = setTimeout(() => (montado = true));
    return () => {
      clearTimeout(espera);
      if (montado) setVez((v) => v + 1);
    };
  }, []);
  return <Fragment key={vez}>{children}</Fragment>;
}
