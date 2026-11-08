// Cómo le llega un mensaje de WhatsApp al cliente (HU-40): la burbuja del mensaje sobre el fondo de la conversación. La
// usan la ficha de Mensajes, en lectura, y el modal que lo edita, mientras se escribe (pulido 13.28).

export function BurbujaMensaje({ texto }: { texto: string }) {
  return (
    <div className="rounded-lg bg-neutro-fondo p-4">
      <p className="max-w-[34ch] rounded-xl rounded-tl-sm bg-fondo px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-[var(--sombra-tarjeta)]">
        {texto || <span className="text-tinta-suave">El mensaje está vacío.</span>}
      </p>
    </div>
  );
}
