// El contenido del Manual del panel (docs/10-lanzamiento/capacitacion.md): los capítulos, cada tema con su captura en una
// tablet y lo que señala cada número. De aquí salen las capturas (scripts/manual-capturas.mjs) y la página
// (scripts/manual-armar.mjs), así el texto y la pantalla no se separan.
//
// Una captura: `ruta` y, si hace falta, `pasos` antes de sacarla (abrir un modal o un menú; nunca guardar nada) y `ver`
// (lo que tiene que quedar arriba). Cada marca dice dónde está en la pantalla (`en`) y qué es (`texto`):
//   { rol, nombre, exacto }  un botón, enlace, título… por su nombre (lo que lee el lector de pantalla)
//   { etiqueta }             un campo por su etiqueta
//   { texto, exacto }        un texto a la vista
//   { css }                  lo demás
// Los datos son siempre los de demostración (`npm run datos:demo`): nunca clientes reales.

const boton = (nombre, exacto = false) => ({ rol: "button", nombre, exacto });
const enlace = (nombre, exacto = false) => ({ rol: "link", nombre, exacto });
const titulo = (nombre) => ({ rol: "heading", nombre, exacto: true });

export const CAPITULOS = [
  {
    id: "empezar",
    numero: "1",
    titulo: "Empezar",
    resumen: "Entrar, ubicarse en el inicio y leer cualquier pantalla del panel.",
    temas: [
      {
        titulo: "Instalar la app e ingresar",
        quien: ["todos"],
        intro: "El panel se abre en el navegador del celular, de la tablet o de la computadora. Instalado, queda con su ícono, como una app.",
        captura: {
          id: "01-ingresar",
          ruta: "/ingresar",
          sinSesion: true,
          marcas: [
            { en: { etiqueta: "Usuario" }, texto: "Tu usuario, el que te dio el dueño." },
            { en: { etiqueta: "Contraseña" }, texto: "Tu contraseña. El ojo la muestra para revisar lo escrito." },
            { en: boton("Ingresar", true), texto: "Entra al panel." },
          ],
        },
        pasos: [
          "Abre la dirección del panel en el navegador.",
          "Para instalarla: en Android, el menú del navegador → <b>Agregar a la pantalla de inicio</b>; en el iPhone o el iPad, <b>Compartir</b> → <b>Agregar a inicio</b>.",
          "Ingresa con tu usuario y tu contraseña.",
        ],
        siAlgoFalla: [
          ["«Demasiados intentos»", "Te equivocaste varias veces seguidas: espera unos minutos y vuelve a intentar."],
          ["Olvidé mi contraseña", "El dueño te pone una nueva desde Usuarios."],
        ],
      },
      {
        titulo: "El inicio: lo del día",
        quien: ["todos"],
        intro: "Al entrar, Inicio muestra lo que pide atención hoy. Cada tarjeta y cada fila se tocan para abrir su pantalla.",
        captura: {
          id: "02-inicio",
          ruta: "/panel",
          marcas: [
            { en: { css: "nav" }, texto: "El menú: cada persona ve solo lo que le toca." },
            { en: enlace("Nueva cotización", true), texto: "Lo que más se hace, a un toque: cotizar y reservar." },
            { en: { rol: "region", nombre: "Resumen de hoy" }, texto: "El resumen: por cobrar, en el taller, los que llegan hoy, cotizaciones y mantenimientos." },
            { en: titulo("Para hoy"), texto: "Para hoy: cada vehículo con lo que le toca (recibir, marcar listo, avisar)." },
            { en: { css: 'a[href="/panel/manual"]' }, texto: "Este manual, siempre a mano.", lado: "arriba" },
            { en: boton("Cerrar sesión"), texto: "Cerrar sesión, al terminar en un equipo compartido.", lado: "arriba" },
          ],
        },
      },
      {
        titulo: "Cómo leer una pantalla",
        quien: ["todos"],
        intro: "Todas las fichas (una cotización, una reserva, una orden) se ordenan igual. Sabiendo leer una, se leen todas.",
        captura: {
          id: "03-pantalla",
          ruta: "/panel/ordenes/3",
          marcas: [
            { en: { css: "main a[aria-label^='Volver']" }, texto: "Volver: a la pantalla de la que viniste. Debajo del título dice cuál." },
            { en: { css: "main h1" }, texto: "Qué es (la placa, el número) y su estado.", lado: "arriba" },
            { en: { rol: "navigation", nombre: "Pasos del trabajo" }, texto: "En qué paso va el trabajo." },
            { en: boton("Marcar listo", true), texto: "El paso siguiente: el botón grande y rojo. Siempre hay uno solo." },
            { en: boton("Más", true), texto: "Lo que se usa poco: extender la entrega, volver un paso.", lado: "arriba" },
            { en: titulo("Datos"), texto: "Los datos. Las filas con «›» llevan a otra pantalla (la ficha del cliente, la cotización)." },
          ],
        },
        claves: [
          ["Botón rojo", "Lo principal de la pantalla: guardar, crear o el paso siguiente."],
          ["Botón con borde", "Otra acción a la vista, como «Escribir por WhatsApp»."],
          ["«Editar», «＋ Agregar»", "Junto al título de una sección: cambian esa sección, en una ventana."],
          ["«⋯»", "Las opciones de una fila (un pago, un PDF)."],
        ],
      },
      {
        titulo: "Guardar, los avisos y salir sin guardar",
        quien: ["todos"],
        sinCaptura: true,
        puntos: [
          "Después de guardar sale un aviso corto («Pago registrado.», «Cliente creado.»). Se va solo.",
          "Si falta algo, el aviso dice <b>«Revisa los campos marcados.»</b> y el campo queda en rojo con lo que hay que corregir.",
          "Si cierras una ventana con cambios tocando afuera, con Escape o con el «atrás» del celular, abajo pregunta <b>«Tienes cambios sin guardar.»</b>: <span class='boton'>Seguir editando</span> no pierde nada; <span class='boton'>Descartar cambios</span> los borra.",
          "<span class='boton'>Cancelar</span> y la X cierran sin preguntar: ya es una decisión.",
          "Si se cae el internet, arriba sale <b>«Sin conexión»</b>: espera a que vuelva para guardar.",
          "Con una mejora del sistema sale <b>«Hay una versión nueva del sistema»</b> con <span class='boton'>Actualizar</span>. Tócalo cuando no estés a mitad de un formulario.",
        ],
      },
    ],
  },

  {
    id: "ciclo",
    numero: "2",
    titulo: "El ciclo de un trabajo",
    resumen: "De la cotización a la entrega, paso por paso y con quién hace cada uno.",
    ciclo: true,
    temas: [
      {
        paso: 1,
        titulo: "Cotizar",
        quien: ["atencion", "dueno"],
        intro: "Una cotización se arma en tres pasos: cliente, vehículo y servicios. El precio sale del catálogo, para el tamaño del vehículo.",
        captura: {
          id: "10-nueva-cotizacion",
          ruta: "/panel/cotizaciones/nueva?cliente=8",
          marcas: [
            { en: { texto: "Servicios y precio", exacto: true }, texto: "Los tres pasos: cliente, vehículo y servicios. Se vuelve atrás sin perder lo escrito." },
            { en: { texto: "Cambiar" }, texto: "Para quién es. «Cambiar» vuelve a elegir el cliente." },
            { en: { css: "main [role=radiogroup]" }, texto: "Su vehículo, u «Otro vehículo» para registrar uno nuevo." },
            { en: boton("Siguiente"), texto: "Sigue a los servicios; al final, «Crear cotización»." },
          ],
        },
        pasos: [
          "<span class='boton rojo'>Nueva cotización</span> desde Inicio, Cotizaciones o la ficha del cliente.",
          "Elige el cliente y el vehículo (o regístralos ahí mismo).",
          "Elige los servicios. Si un servicio tiene opciones (1 año, 2 años…), elige cuál. Ajusta el precio o suma un descuento si hace falta.",
          "Revisa la validez y el adelanto sugerido, y <span class='boton rojo'>Crear cotización</span>. Queda su PDF.",
        ],
      },
      {
        paso: 1,
        titulo: "Mandar la cotización y su respuesta",
        quien: ["atencion", "dueno"],
        intro: "La cotización enviada no cambia: si hay que cambiar algo, se hace una versión nueva y la anterior queda como se mandó.",
        captura: {
          id: "11-cotizacion",
          alto: 1080,
          ruta: "/panel/cotizaciones/6",
          marcas: [
            { en: enlace("Enviar por WhatsApp", true), texto: "Abre el chat del cliente con el mensaje y el enlace al PDF: solo toca Enviar." },
            { en: enlace("Ver PDF", true), lado: "arriba", texto: "El PDF, como lo ve el cliente." },
            { en: boton("Opciones del PDF de la versión 2"), lado: "arriba", texto: "«⋯»: compartir el archivo o descargarlo." },
            { en: titulo("Versiones"), texto: "Cada versión, de la más nueva a la más vieja. La reemplazada queda en gris." },
            { en: enlace("Reservar en Agenda", true), texto: "Aceptada: el paso siguiente es reservarle un día." },
            { en: boton("Más", true), lado: "arriba", texto: "Nueva versión, Rechazar o Volver a pendiente." },
          ],
        },
        pasos: [
          "<span class='boton'>Enviar por WhatsApp</span>: el cliente recibe el mensaje con un enlace y ve la cotización sin cuenta.",
          "Cuando responde que sí: <span class='boton rojo'>Aceptó</span>. Si dice que no: <b>Rechazar</b> en «Más», con el motivo.",
          "Para cambiar un precio o un servicio: <b>Nueva versión</b> en «Más». Se manda la nueva; el enlace de la vieja ya no la muestra.",
        ],
        nota: "El enlace del PDF vale mientras la cotización vale: hasta su fecha de validez (una aceptada, siempre). Vencida, reemplazada o rechazada, el cliente ve una página que lo dice, sin precios.",
      },
      {
        paso: 2,
        titulo: "Reservar",
        quien: ["atencion", "dueno"],
        intro: "La reserva aparta un espacio del taller en unas fechas. Sale de una cotización aceptada, o directa, sin cotización.",
        captura: {
          id: "12-agenda",
          ruta: "/panel/agenda?semana=2026-11-09&dia=2026-11-11",
          marcas: [
            { en: enlace("Nueva reserva", true), texto: "Una reserva nueva." },
            { en: titulo("Por reservar (2)"), texto: "Por reservar: las cotizaciones aceptadas que todavía no tienen día." },
            { en: { texto: "Hoy", exacto: true }, lado: "arriba", texto: "Los días de la semana: se toca uno para verlo. Las flechas pasan de semana." },
            { en: titulo("Espacio 1"), texto: "Cada espacio del taller con sus reservas. Un día libre se toca para reservar ahí." },
          ],
        },
        pasos: [
          "Desde una cotización aceptada, <span class='boton rojo'>Reservar en Agenda</span>. O <span class='boton rojo'>Nueva reserva</span> desde Agenda, Inicio o la ficha del cliente.",
          "Son cuatro pasos: cliente, vehículo, servicios (una de sus cotizaciones o <b>Reserva sin cotización</b>) y fecha y adelanto.",
          "El sistema solo ofrece los espacios libres en esas fechas: no hay dos reservas en el mismo espacio a la vez.",
          "El adelanto: el monto que trae el cliente (el sugerido, más o el total), cómo pagó y la foto del comprobante. O <b>Sin adelanto</b>.",
        ],
      },
      {
        paso: 2,
        titulo: "La reserva",
        quien: ["atencion", "dueno"],
        intro: "Mientras el vehículo no llega, la reserva es su ficha: desde aquí se recibe, se cobra el adelanto, se reprograma o se cancela.",
        captura: {
          id: "13-reserva",
          alto: 1100,
          ruta: "/panel/agenda/10",
          marcas: [
            { en: { css: "a[href*='/recibir']" }, texto: "Recibir vehículo: desde el día de ingreso." },
            { en: boton("Más", true), lado: "arriba", texto: "Reprogramar (otras fechas u otro espacio) o Cancelar reserva, con el motivo." },
            { en: titulo("Datos"), texto: "Cuándo, dónde, el cliente y su vehículo. Al pie, quién la reservó y su cotización." },
            { en: boton("Registrar pago", true), texto: "Cobrar el adelanto o lo que traiga el cliente." },
          ],
        },
        nota: "Si se cancela, el adelanto no se devuelve: queda como ingreso.",
      },
      {
        paso: 3,
        titulo: "Recibir el vehículo",
        quien: ["taller", "atencion", "dueno"],
        intro: "Al llegar el vehículo se revisa parte por parte, con foto de cada detalle. Así queda constancia de cómo llegó.",
        captura: {
          id: "14-recibir",
          alto: 1300,
          ruta: "/panel/ordenes/10/recibir",
          marcas: [
            { en: boton("Marcar todas como bien"), texto: "Si todo está bien, de un toque." },
            { en: boton("Bien: Capó", true), lado: "arriba", texto: "«Bien»: la parte no tiene nada." },
            { en: boton("Detalle: Capó", true), lado: "arriba", texto: "«Detalle»: un rayón, un golpe u otra cosa, con su nota y su foto." },
          ],
          ver: titulo("Checklist"),
        },
        pasos: [
          "En Agenda o en Inicio, abre la reserva del día y toca <span class='boton rojo'>Recibir vehículo</span>.",
          "Revisa cada parte: <span class='boton'>Bien</span> o <span class='boton'>Detalle</span>. No se recibe sin revisar todas.",
          "En <b>Observaciones</b> va lo que no está en la lista: lo que deja el cliente, lo que pidió.",
          "<span class='boton rojo'>Recibir vehículo</span>. Se abre la orden.",
        ],
      },
      {
        paso: 4,
        titulo: "Trabajar la orden",
        quien: ["taller", "atencion", "dueno"],
        intro: "La orden es la ficha del trabajo en el taller. Arriba, siempre el paso siguiente.",
        captura: {
          id: "15-orden",
          ruta: "/panel/ordenes/3",
          ver: titulo("Cómo llegó"),
          marcas: [
            { en: titulo("Cómo llegó"), texto: "Cómo llegó: el checklist de la recepción, con los detalles y sus fotos." },
            { en: boton("Tomar foto", true), texto: "Las fotos del inicio y del final del trabajo." },
            { en: titulo("Historial"), texto: "El historial: lo escribe el sistema (reservada, recibido, en proceso, listo…)." },
          ],
        },
        pasos: [
          "<span class='boton rojo'>Empezar trabajo</span> y, al terminar, <span class='boton rojo'>Marcar listo</span>.",
          "Toma las fotos del inicio y las del final: sirven para la galería del sitio.",
          "Si se atrasa: <b>Extender entrega</b> en «Más». Si se marcó algo por error: volver un paso, en «Más».",
        ],
        nota: "Si el trabajo vino de una reserva con nota («trae llaves de repuesto»), la nota está en la orden.",
      },
      {
        paso: 5,
        titulo: "Lista: avisar al cliente",
        quien: ["taller", "atencion", "dueno"],
        captura: {
          id: "16-orden-lista",
          ruta: "/panel/ordenes/9",
          marcas: [
            { en: boton("Avisar por WhatsApp", true), texto: "Abre el WhatsApp con el mensaje armado: «tu vehículo está listo». Queda quién avisó y cuándo." },
            { en: enlace("Entregar vehículo", true), texto: "Cuando viene el cliente." },
            { en: enlace("Ver la cotización"), texto: "La cotización de la que salió." },
          ],
        },
        nota: "Inicio muestra las listas que todavía no se avisaron.",
      },
      {
        paso: 6,
        titulo: "Entregar y cobrar",
        quien: ["taller", "atencion", "dueno"],
        intro: "Al entregar se cobra lo que falta y el cliente firma. El vehículo sale y, si tiene mantenimiento, se programa el próximo.",
        captura: {
          id: "17-entregar",
          alto: 1500,
          ruta: "/panel/ordenes/9/entregar",
          marcas: [
            { en: titulo("Pagos"), texto: "Lo que falta cobrar, y Registrar pago (quien tiene Pagos)." },
            { en: titulo("Firma del cliente"), texto: "El cliente firma con el dedo. Si no puede, «Entregar sin firma» con el motivo." },
            { en: { rol: "button", nombre: "Entregar vehículo", exacto: true }, texto: "Entrega el vehículo." },
          ],
        },
        nota: "Si el cliente se lleva el vehículo debiendo, solo lo autoriza quien tiene el permiso «Entrega con saldo». El saldo se sigue cobrando después, desde Saldos pendientes.",
      },
    ],
  },

  {
    id: "cobros",
    numero: "3",
    titulo: "Cobros",
    resumen: "Registrar pagos, anular uno mal cargado y cobrar lo que quedó pendiente.",
    temas: [
      {
        titulo: "Registrar un pago",
        quien: ["atencion", "dueno"],
        intro: "Se cobra lo que traiga el cliente, desde el adelanto hasta el total. Nunca más que lo que debe.",
        captura: {
          id: "20-registrar-pago",
          ruta: "/panel/ordenes/3",
          pasos: [{ clic: boton("Registrar pago", true) }],
          marcas: [
            { en: { etiqueta: "Monto" }, texto: "El monto: viene con todo lo que falta. Se cambia si paga una parte." },
            { en: { css: "[role=dialog] [role=radiogroup], [role=dialog] fieldset" }, texto: "Cómo pagó: efectivo, QR o transferencia. Con QR o transferencia, la foto del comprobante." },
            { en: { texto: "Cambiar fecha" }, texto: "Solo si se pagó otro día." },
            { en: { css: "[role=dialog] button[type=submit]" }, texto: "Registra el pago." },
          ],
        },
        claves: [
          ["Adelanto", "Lo que se paga antes de que llegue el vehículo. Si cancela, no se devuelve."],
          ["Saldo", "Lo que se paga desde que llega el vehículo, también al retirarlo."],
          ["¿Quién decide cuál es?", "El sistema, por la fecha del pago. No hay que elegirlo."],
        ],
        nota: "Un pago mal cargado no se borra: «⋯» del pago → <b>Anular pago</b>, con el motivo. Queda tachado y deja de contar.",
      },
      {
        titulo: "Saldos pendientes",
        quien: ["atencion", "dueno"],
        intro: "Quién se llevó el vehículo debiendo, cuánto y desde cuándo.",
        captura: {
          id: "21-saldos",
          alto: 1000,
          ruta: "/panel/pagos",
          marcas: [
            { en: boton("Ordenar"), texto: "Ordenar: las más antiguas, las de más monto…" },
            { en: enlace("Escribir por WhatsApp"), texto: "Le escribe con el mensaje del saldo.", lado: "arriba" },
            { en: boton("Registrar pago"), texto: "Cobra desde la misma fila.", lado: "arriba" },
          ],
        },
      },
    ],
  },

  {
    id: "clientes",
    numero: "4",
    titulo: "Clientes y mantenimientos",
    resumen: "Registrar clientes y vehículos, su historia y los mantenimientos por avisar.",
    temas: [
      {
        titulo: "Clientes",
        quien: ["atencion", "dueno"],
        captura: {
          id: "30-clientes",
          ruta: "/panel/clientes",
          marcas: [
            { en: enlace("Agregar cliente"), texto: "Nombre, WhatsApp y su vehículo (placa y tamaño). El correo, el NIT y las notas son opcionales." },
            { en: { css: "main input[type=search]" }, texto: "Buscar por nombre, teléfono o placa." },
            { en: { css: "main ul li a, main table tbody tr a" }, texto: "Cada cliente: toca para abrir su ficha." },
          ],
        },
        nota: "Si el teléfono o la placa ya existen, el sistema lo avisa y ofrece abrir la ficha que ya está: así no hay un cliente dos veces.",
      },
      {
        titulo: "La ficha del cliente",
        quien: ["atencion", "dueno"],
        intro: "Todo lo del cliente en un lugar: sus vehículos, sus reservas, sus cotizaciones y sus mantenimientos.",
        captura: {
          id: "31-ficha-cliente",
          ruta: "/panel/clientes/8",
          marcas: [
            { en: titulo("Vehículos"), texto: "Sus vehículos. En «Editar» de cada uno: cambiar de dueño o desactivarlo." },
            { en: titulo("Reservas"), texto: "Sus reservas y órdenes, con su saldo." },
            { en: titulo("Cotizaciones"), texto: "Sus cotizaciones." },
            { en: enlace("Nueva cotización"), texto: "Cotizar o reservar para este cliente, sin volver a elegirlo." },
          ],
        },
      },
      {
        titulo: "Mantenimientos",
        quien: ["atencion", "dueno"],
        intro: "Los servicios con mantenimiento (por ejemplo, el nano cerámico) programan el próximo al entregar el vehículo.",
        captura: {
          id: "32-mantenimientos",
          ruta: "/panel/mantenimientos",
          marcas: [
            { en: enlace("Por avisar"), texto: "Por avisar: los que vencen en los próximos 15 días." },
            { en: boton("Avisar por WhatsApp"), lado: "arriba", texto: "Le escribe con el mensaje del mantenimiento." },
            { en: enlace("Reservar", true), lado: "arriba", texto: "Le arma la reserva." },
            { en: boton("No le interesa"), texto: "Lo cierra, con el motivo." },
          ],
        },
      },
    ],
  },

  {
    id: "dueno",
    numero: "5",
    titulo: "Solo el dueño",
    resumen: "Precios, el sitio web, los reclamos, los usuarios y la configuración.",
    temas: [
      {
        titulo: "Catálogo y precios",
        quien: ["dueno"],
        intro: "Cada servicio, sus opciones y un precio por tamaño de vehículo. Los precios nunca salen en el sitio web.",
        captura: {
          id: "40-servicio-catalogo",
          ruta: "/panel/catalogo",
          pasos: [{ clic: { css: "main a[href^='/panel/catalogo/']" } }],
          marcas: [
            { en: { css: "main h1" }, texto: "El servicio y si se muestra en el sitio." },
            { en: titulo("Datos"), texto: "Cuántos días dura y su mantenimiento (cada cuánto vuelve)." },
            { en: boton("Editar variantes"), texto: "Sus opciones: 1 año, 2 años, Básico, Premium…" },
            { en: { texto: "1 año", exacto: true }, texto: "Cada opción con un precio por tamaño. «Editar» los cambia; uno vacío dice «Según evaluación»." },
          ],
        },
        nota: "Cambiar un precio no cambia las cotizaciones ya enviadas, y cada precio guarda su historial.",
      },
      {
        titulo: "Sitio web y reclamos",
        quien: ["dueno"],
        captura: {
          id: "41-sitio",
          ruta: "/panel/sitio",
          marcas: [
            { en: enlace("Portada"), texto: "La portada: el título, la frase y la foto." },
            { en: enlace("Servicios"), texto: "La página de cada servicio: textos, beneficios, pasos y foto, y si se muestra." },
            { en: enlace("Galería"), texto: "Las fotos de antes y después. Desde una orden entregada, «Publicar en la galería»." },
          ],
        },
        puntos: [
          "Los <b>reclamos</b> llegan desde la página «Garantía y reclamos» del sitio. La lista abre en <b>Pendientes</b>.",
          "En cada reclamo: <span class='boton'>Escribir por WhatsApp</span> y, al resolverlo, <span class='boton rojo'>Marcar como atendido</span> con lo que se hizo.",
        ],
      },
      {
        titulo: "Usuarios y permisos",
        quien: ["dueno"],
        intro: "A cada encargado se le dan sus permisos con un perfil y, si hace falta, se ajusta cada casilla.",
        captura: {
          id: "42-usuario",
          ruta: "/panel/usuarios/2",
          pasos: [{ clic: boton("Editar rol y permisos") }],
          marcas: [
            { en: { css: "[role=dialog] [role=radiogroup]" }, texto: "El rol: dueño o encargado." },
            { en: boton("Atención"), lado: "arriba", texto: "Los perfiles: Taller, Atención o Todo marcan las casillas de un toque." },
            { en: { css: "[role=dialog] button[type=submit]" }, texto: "Guarda el rol y los permisos." },
          ],
        },
        nota: "Un usuario que ya no trabaja se <b>desactiva</b>: no se borra y no puede entrar.",
      },
      {
        titulo: "Configuración: los mensajes",
        quien: ["dueno"],
        intro: "Negocio (datos y logo), Taller (espacios, tamaños y checklist), Parámetros (adelanto, validez) y los mensajes de WhatsApp.",
        captura: {
          id: "43-mensajes",
          ruta: "/panel/configuracion/mensajes",
          marcas: [
            { en: { rol: "region", nombre: "Vehículo listo" }, texto: "Cada mensaje, como le llega al cliente." },
            { en: boton("Editar mensaje: Cotización"), texto: "Cambia el texto. Los campos entre llaves ({nombre}, {enlace}) los completa el sistema." },
          ],
        },
      },
    ],
  },
];

/** Quién hace cada cosa (la etiqueta de color de cada tema). */
export const QUIEN = {
  todos: "Todos",
  taller: "Taller",
  atencion: "Atención",
  dueno: "Dueño",
};

/** Lo que ve cada perfil, módulo por módulo (src/lib/permisos.ts: MODULOS y PERFILES). */
export const PERMISOS = {
  columnas: ["Taller", "Atención", "Todo", "Dueño"],
  filas: [
    ["Inicio", "sí", "sí", "sí", "sí"],
    ["Agenda y Órdenes (recibir, trabajar, avisar, entregar)", "sí", "sí", "sí", "sí"],
    ["Clientes", "", "sí", "sí", "sí"],
    ["Cotizaciones (y ver precios)", "", "sí", "sí", "sí"],
    ["Pagos: cobrar y Saldos pendientes", "", "sí", "sí", "sí"],
    ["Mantenimientos", "", "sí", "sí", "sí"],
    ["Reclamos y Sitio web", "", "", "sí", "sí"],
    ["Entregar con saldo pendiente", "", "", "sí", "sí"],
    ["Sumar un servicio a una orden, publicar en la galería", "", "", "", "sí"],
    ["Catálogo y precios, Usuarios, Configuración", "", "", "", "sí"],
  ],
};

/** Qué significa cada estado, como lo dice su insignia. */
export const ESTADOS = [
  { grupo: "Cotización", filas: [
    ["Pendiente", "Enviada, sin respuesta del cliente."],
    ["Aceptada", "El cliente dijo que sí."],
    ["Sin fecha", "Aceptada, pero todavía sin reserva: está en «Por reservar»."],
    ["Rechazada", "El cliente dijo que no (con su motivo)."],
    ["Reemplazada", "Una versión vieja: vale la más nueva."],
  ] },
  { grupo: "Trabajo", filas: [
    ["Reservada", "Tiene día y espacio; el vehículo todavía no llegó."],
    ["Recibida", "El vehículo está en el taller, revisado."],
    ["En proceso", "Se está trabajando."],
    ["Lista", "Terminada: hay que avisar al cliente."],
    ["Entregada", "El cliente se la llevó."],
    ["Atrasada", "Pasó la entrega aproximada y no está lista."],
    ["Cancelada", "No se hizo (con su motivo)."],
  ] },
];

/** Un día cualquiera, por perfil. */
export const DIA = [
  { quien: "taller", titulo: "En el taller", pasos: ["Abre Inicio: «Para hoy» dice qué llega y qué toca.", "Recibe los vehículos del día con el checklist.", "Trabaja cada orden: empieza, toma las fotos, márcala lista.", "Avisa al cliente y, cuando viene, entrega."] },
  { quien: "atencion", titulo: "En atención", pasos: ["Revisa «Para atender» en Inicio: cotizaciones aceptadas sin fecha, saldos, reclamos.", "Cotiza y envía por WhatsApp.", "Reserva las aceptadas y cobra los adelantos.", "Cobra al entregar y avisa los mantenimientos."] },
  { quien: "dueno", titulo: "El dueño", pasos: ["Mira el resumen de Inicio: por cobrar, en el taller, atrasadas.", "Responde los reclamos.", "Ajusta precios, servicios o mensajes cuando hace falta.", "Revisa Saldos pendientes."] },
];

/** Problemas frecuentes. */
export const PROBLEMAS = [
  ["No veo un módulo en el menú", "No tienes ese permiso. El dueño lo da en Usuarios."],
  ["No veo los precios", "Ver precios va con el permiso de Cotizaciones o de Pagos."],
  ["«Recibir vehículo» no aparece", "Aparece desde el día de ingreso de la reserva. Si llegó antes, reprograma la reserva."],
  ["No me deja reservar en un espacio", "Ya está ocupado en esas fechas: el sistema solo ofrece los libres."],
  ["Me equivoqué en un pago", "«⋯» del pago → Anular pago, con el motivo. Después regístralo bien."],
  ["Hay que cambiar una cotización ya enviada", "«Más» → Nueva versión. La anterior queda como se mandó."],
  ["El cliente no puede abrir el enlace", "Puede que haya vencido o tenga una versión nueva: mándale la vigente con «Enviar por WhatsApp»."],
  ["Sale «Sin conexión»", "No se guarda sin internet: espera a que vuelva la señal."],
  ["Otra duda o un error", "Una captura de pantalla por WhatsApp a YankoSoft, con lo que estabas haciendo."],
];

/** Palabras del panel. */
export const GLOSARIO = [
  ["Orden", "El trabajo de un vehículo desde que se recibe hasta que se entrega."],
  ["Reserva", "El día y el espacio apartados para un vehículo, antes de que llegue."],
  ["Espacio", "Un lugar de trabajo del taller. Se configuran en Configuración → Taller."],
  ["Variante u opción", "Una forma del mismo servicio: 1 año, 2 años, Básico, Premium."],
  ["Tamaño", "El tamaño del vehículo: define el precio de cada servicio."],
  ["Checklist", "La revisión parte por parte al recibir."],
  ["Adelanto / Saldo", "Lo que se paga antes de que llegue el vehículo / después."],
  ["Perfil", "Un atajo para marcar los permisos de un encargado: Taller, Atención o Todo."],
];
