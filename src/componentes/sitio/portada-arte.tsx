// Arte de la portada (componente Cover del Design System): una losa roja con la esquina cortada a 60°,
// un bloque en tinta y seis franjas rojas a 60°. Negro, blanco y rojo, los tres colores del manual.
// Decorativo: va oculto para los lectores de pantalla.
export function PortadaArte({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 288" aria-hidden="true" className={className} preserveAspectRatio="xMaxYMax meet">
      <polygon className="fill-rojo" points="16,0 160,0 160,212 144,240 16,240" />
      <rect className="fill-tinta" x="176" y="96" width="96" height="144" />
      {[0, 24, 48, 72, 96, 120].map((d) => (
        <polygon key={d} className="fill-rojo" points={`${288 + d},240 ${304 + d},240 ${415 + d},48 ${399 + d},48`} />
      ))}
    </svg>
  );
}
