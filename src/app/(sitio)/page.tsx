import Image from "next/image";

// Portada provisional hasta construir HU-10: el logo, el lema y la línea LED encendiéndose.
export default function Inicio() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-24 text-center">
      <h1 className="sr-only">TocTar Detailing</h1>
      <Image
        src="/marca/toctar-vertical-sobre-oscuro.svg"
        alt="TocTar, como ven tu auto, te ven a ti"
        width={280}
        height={263}
        priority
        unoptimized
      />
      <hr className="tt-led tt-led--encender w-full max-w-md" />
      <p className="max-w-md text-tinta-suave">Sitio en construcción.</p>
    </section>
  );
}
