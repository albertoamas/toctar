import { Seccion } from "@/componentes/panel/cabecera-seccion";

// HU-34: el historial de la orden (RF-42), lo más nuevo arriba: lo escribe el sistema al recibir, cambiar de estado,
// extender la entrega, sumar un servicio y entregar. Pedido 45: ya no se escriben notas a mano (al dueño le alcanza con
// estas); las que se escribieron antes se siguen viendo. Solo se lee: sin estado, se dibuja en el servidor.

type Avance = { id: number; nota: string; autor: string; cuando: string };

export function HistorialOrden({ avances }: { avances: Avance[] }) {
  return (
    <Seccion id="historial" titulo="Historial">
      {avances.length === 0 ? (
        <p className="text-tinta-suave">Todavía no hay nada en el historial.</p>
      ) : (
        <ol aria-label="Historial de la orden" className="flex flex-col border-l-2 border-border">
          {avances.map((a) => (
            <li key={a.id} className="flex flex-col gap-0.5 py-2 pl-4">
              <span className="whitespace-pre-line">{a.nota}</span>
              <span className="text-sm text-tinta-suave">
                {a.cuando}, {a.autor}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Seccion>
  );
}
