// Los datos de una sección de ficha, en lectura: la etiqueta a la izquierda y el valor a la derecha, así los valores quedan
// en columna aunque una etiqueta sea larga (skill pantallas-panel). La usan las fichas de Configuración (Negocio y
// Parámetros, pulidos 13.26 y 13.29) para verse igual.

type Fila = [string, React.ReactNode];

/** `filas`: una que no corresponde va como `false` (`cond && [...]`) y no se muestra. */
export function ListaDatos({ filas, nombre }: { filas: (Fila | false)[]; /** El nombre de la lista para el lector ("Datos de la orden"). */ nombre?: string }) {
  return (
    <dl aria-label={nombre} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2">
      {filas.filter((f): f is Fila => !!f).map(([etiqueta, valor]) => (
        <div key={etiqueta} className="contents">
          <dt className="text-tinta-suave">{etiqueta}</dt>
          <dd className="break-words">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
