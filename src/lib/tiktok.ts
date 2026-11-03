/** El usuario de un enlace de TikTok ("https://www.tiktok.com/@toctar.detailing" → "@toctar.detailing"), si lo tiene. */
export function usuarioDeTikTok(enlace: string): string | null {
  const m = /tiktok\.com\/(@[\w.]+)/i.exec(enlace);
  return m ? m[1] : null;
}
