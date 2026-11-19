import { MEDIDA_TEXTO } from "@/componentes/panel/anchos";
// Los datos de una sección de ficha, en lectura: la etiqueta a la izquierda y el valor a la derecha, así los valores quedan
// en columna aunque una etiqueta sea larga (skill pantallas-panel). La usan las fichas de Configuración (Negocio y
// Parámetros, pulidos 13.26 y 13.29) para verse igual.

type Fila = [string, React.ReactNode];

/** `filas`: una que no corresponde va como `false` (`cond && [...]`) y no se muestra. */
export function ListaDatos({ filas, nombre }: { filas: (Fila | false)[]; /** El nombre de la lista para el lector ("Datos de la orden"). */ nombre?: string }) {
  return (
    // Una línea fina entre dato y dato, para distinguir cada uno (C7, 18/11). Según el ancho de la tarjeta, no de la
    // pantalla: angosta (el celular, una columna al costado), la etiqueta chica arriba y el valor con todo el ancho; con
    // lugar, la etiqueta a la izquierda y los valores en columna (subgrid: todas las filas comparten las dos columnas)
    <div className="@container">
      <dl aria-label={nombre} className="flex flex-col @md:grid @md:grid-cols-[auto_minmax(0,1fr)] @md:gap-x-6">
        {filas.filter((f): f is Fila => !!f).map(([etiqueta, valor]) => (
          <div key={etiqueta} className="flex flex-col gap-0.5 border-t border-border py-2.5 first:border-t-0 first:pt-0 last:pb-0 @md:col-span-2 @md:grid @md:grid-cols-subgrid @md:items-baseline @md:gap-x-6">
            <dt className="text-sm text-tinta-suave @md:text-base">{etiqueta}</dt>
            <dd className={`break-words ${MEDIDA_TEXTO}`}>{valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
