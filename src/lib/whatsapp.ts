// Números de WhatsApp de Bolivia. Se guardan en formato internacional sin "+" (591 y 8 dígitos),
// que es el que pide wa.me.

const CODIGO_PAIS = "591";

/**
 * Acepta el celular como lo escribe la gente ("71234567", "+591 712 34 567", "591-71234567")
 * y devuelve "59171234567", o null si no es un celular boliviano (8 dígitos que empiezan con 6 o 7).
 */
export function normalizarWhatsApp(texto: string): string | null {
  let digitos = texto.replace(/\D/g, "");
  if (digitos.length === 11 && digitos.startsWith(CODIGO_PAIS)) digitos = digitos.slice(3);
  if (!/^[67]\d{7}$/.test(digitos)) return null;
  return CODIGO_PAIS + digitos;
}

/** "59171234567" → "+591 7123 4567". */
export function formatearWhatsApp(numero: string): string {
  const local = numero.slice(3);
  return `+${CODIGO_PAIS} ${local.slice(0, 4)} ${local.slice(4)}`;
}

/** "59171234567" → "71234567": lo que se muestra en el campo para editar. */
export function whatsAppLocal(numero: string): string {
  return numero.startsWith(CODIGO_PAIS) ? numero.slice(3) : numero;
}

/** Enlace que abre el chat con el mensaje ya escrito. */
export function enlaceWhatsApp(numero: string, mensaje?: string): string {
  const base = `https://wa.me/${numero}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}
