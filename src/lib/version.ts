// Pedido 39: si la versión publicada es otra que la que tiene abierta la persona. Sin una de las dos (sin conexión, un
// error o una compilación sin versión), no se avisa: mejor callar que avisar de más.
export function hayVersionNueva(propia: string | undefined, publicada: string | undefined): boolean {
  return !!propia && !!publicada && propia !== publicada;
}
