// Direcciones legibles para Google (RF-09): "Pulido y nano cerámico" → "pulido-y-nano-ceramico".

export const PATRON_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function crearSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tildes y diéresis
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}
