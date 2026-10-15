import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Montserrat } from "next/font/google";
import { Toaster } from "@/componentes/ui/sonner";
import "./globals.css";

// Tipografías de la identidad visual: Montserrat (la del lema del logo) para todo el texto,
// Barlow Condensed en itálica para los titulares.
const texto = Montserrat({
  variable: "--font-texto",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const titular = Barlow_Condensed({
  variable: "--font-titular",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "TocTar Detailing",
    template: "%s · TocTar Detailing",
  },
  description: "Detailing automotriz en Tarija, Bolivia",
};

// Barra del navegador y de la app instalada en negro, como la marca.
export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${texto.variable} ${titular.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
