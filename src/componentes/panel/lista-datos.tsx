// Los datos de una sección de ficha, en lectura: la etiqueta a la izquierda y el valor a la derecha, así los valores quedan
// en columna aunque una etiqueta sea larga (skill pantallas-panel). La usan las fichas de Configuración (Negocio y
// Parámetros, pulidos 13.26 y 13.29) para verse igual.

export function ListaDatos({ filas }: { filas: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2">
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="contents">
          <dt className="text-tinta-suave">{etiqueta}</dt>
          <dd className="break-words">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
