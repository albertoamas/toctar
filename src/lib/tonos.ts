/**
 * Los tonos de las insignias de estado del panel (pedido 26): la clase .tt-estado--{tono} de globals.css. Sin tono, gris.
 * Va aparte de los componentes para que las reglas de cada módulo (qué estado lleva qué tono) no dependan de la interfaz.
 */
export type TonoEstado = "exito" | "aviso" | "peligro" | "info" | "violeta";
