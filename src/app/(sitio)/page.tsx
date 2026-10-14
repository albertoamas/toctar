import Image from "next/image";

// Portada provisional hasta construir HU-10: el logo, el lema y la línea LED encendiéndose.
export default function Inicio() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-24 text-center">
      <h1 className="sr-only">TocTar Detailing</h1>
      <div className="flex flex-col items-center gap-5">
        <Image
          src="/marca/toctar-vertical-sin-lema-sobre-oscuro.svg"
          alt="TocTar"
          width={280}
          height={237}
          priority
          unoptimized
        />
        <p className="tt-lema text-sm text-tinta">Como ven tu auto, te ven a ti</p>
      </div>
      <hr className="tt-led tt-led--encender w-full max-w-md" />
      <p className="max-w-md text-tinta-suave">Sitio en construcción.</p>
    </section>
  );
}
