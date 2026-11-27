/**
 * Lo que se recibe o se entrega, compacto (recorrido visual, 21/11): el cliente, el vehículo en una línea y, si se pasan,
 * los servicios. Sin la placa, que ya está en el título del paso. En lo angosto, el primer servicio y cuántos más; con
 * el costado (desde @4xl), todos, uno por renglón. En el celular ocupaba unos 220 px antes de la tarea del paso.
 */
export function ResumenDelTrabajo({ cliente, vehiculo, servicios = [] }: { cliente: string; vehiculo: (string | number)[]; servicios?: string[] }) {
  return (
    <div className="tt-tarjeta-panel flex flex-col gap-1 px-4 py-3 sm:px-5">
      <p className="font-semibold break-words">{cliente}</p>
      {vehiculo.length > 0 && <p className="text-sm text-tinta-suave">{vehiculo.join(" · ")}</p>}
      {servicios.length > 0 && (
        <>
          <p className="text-sm @4xl:hidden">
            {servicios[0]}
            {servicios.length > 1 && <span className="text-tinta-suave"> + {servicios.length - 1} más</span>}
          </p>
          <ul aria-label="Servicios" className="mt-2 hidden list-disc flex-col gap-1 border-t border-border pt-3 pl-5 text-sm marker:text-tinta-suave @4xl:flex">
            {servicios.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
