// Compartido entre el servidor (whatsapp.tsx) y el cliente (whatsapp-flotante.tsx). Va aparte porque lo que
// exporta un archivo "use client" llega al servidor como referencia, no como valor.

/** Marca del botón principal de WhatsApp de una página: mientras se ve, el botón fijo se esconde. */
export const ATRIBUTO_PRINCIPAL = "data-whatsapp-principal";
