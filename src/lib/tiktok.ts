/** El usuario de un enlace de TikTok ("https://www.tiktok.com/@toctar.detailing" → "@toctar.detailing"), si lo tiene. */
export function usuarioDeTikTok(enlace: string): string | null {
  let url: URL;
  try {
    url = new URL(enlace);
  } catch {
    return null;
  }
  if (url.hostname !== "tiktok.com" && !url.hostname.endsWith(".tiktok.com")) return null;
  const tramo = url.pathname.split("/").find((t) => t.startsWith("@"));
  const usuario = tramo?.replace(/\.+$/, "");
  return usuario && usuario.length > 1 ? usuario : null;
}
