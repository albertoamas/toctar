// Cómo se lee un vehículo en el panel (pulido 9.3): la placa grande, en Barlow, que es como el taller nombra un auto;
// debajo lo que se sepa (marca y modelo, año, color) y, aparte y con su etiqueta, el tamaño, que define el precio.
// Junto al modelo, sin etiqueta, el tamaño se leía como una lista de modelos. Lo usan la ficha del cliente y las
// opciones de vehículo de Nueva consulta; va dentro de un contenedor en columna.

type Props = { placa: string; detalle: (string | number)[]; tamano: string };

export function DatosVehiculo({ placa, detalle, tamano }: Props) {
  return (
    <>
      <span className="tt-placa text-lg">{placa}</span>
      {detalle.length > 0 && (
        <span className="flex flex-wrap gap-x-3 text-sm">
          {/* Por posición: dos datos pueden ser iguales (un modelo y un color "Blanco") */}
          {detalle.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </span>
      )}
      <span className="text-sm text-tinta-suave">Tamaño: {tamano}</span>
    </>
  );
}
