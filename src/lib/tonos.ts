/**
 * Los tonos de las insignias de estado del panel (pedido 26): la clase .tt-estado--{tono} de globals.css. Sin tono, gris.
 * Va aparte de los componentes para que las reglas de cada módulo (qué estado lleva qué tono) no dependan de la interfaz.
 *
 * Un color, un significado (paleta del 23/11, como las insignias de Atlassian y Shopify Polaris):
 * - sin tono (gris): esperando a otro o ya no cuenta (cotización pendiente, reemplazada, desactivado);
 * - info (azul): en curso o programado (reservada, en proceso);
 * - violeta: recién llegado al taller (recibida);
 * - exito (verde): bien o terminado (aceptada, lista, entregada, pagado, atendido);
 * - aviso (ámbar): falta hacer algo de nuestro lado (sin fecha, sin respuesta, sin avisar, debe), con ícono (Alerta);
 * - peligro (rojo): perdido o problema (rechazada, cancelada, atrasada, venció).
 */
export type TonoEstado = "exito" | "aviso" | "peligro" | "info" | "violeta";
