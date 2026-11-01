# Flujo de trabajo del proyecto — TocTar Detailing

Proceso completo de desarrollo, adaptado a un desarrollador que trabaja solo, con Claude Code, para un cliente pequeño. Cada etapa tiene su carpeta en `docs/`.

## Las etapas

| # | Etapa | Qué se hace | Entregable | Carpeta |
|---|---|---|---|---|
| 1 | Descubrimiento | Entrevista, encuesta, análisis de la referencia | Notas y respuestas del dueño | `01-descubrimiento/` |
| 2 | Propuesta | Alcance, módulos, fases, tiempos | Documento de propuesta | `02-propuesta/` |
| 3 | Cierre comercial | Precio, forma de pago, acuerdo de alcance | Propuesta aprobada + contrato simple + adelanto | `03-cierre-comercial/` |
| 4 | Requerimientos | Requisitos funcionales y no funcionales, reglas de negocio | Documento de requerimientos | `04-requerimientos/` |
| 5 | Análisis | Casos de uso, historias de usuario, diagramas de secuencia | Backlog priorizado por fase | `05-analisis/` |
| 6 | Diseño | Modelo de datos, arquitectura, prototipo de pantallas | Diagrama de base de datos, stack definido, prototipo validado | `06-diseno/` |
| 7 | Preparación | Repositorio, entornos, dominio, hosting, cuentas | Proyecto base desplegado ("hola mundo" en producción) | `07-preparacion/` |
| 8 | Desarrollo iterativo | Ciclos semanales por fase, con demo al dueño | Funcionalidades en el entorno de pruebas | `08-desarrollo/` |
| 9 | Pruebas y aceptación | Pruebas automáticas + revisión del dueño | Acta de aceptación de la fase | `09-pruebas/` |
| 10 | Lanzamiento | Producción, carga de datos, capacitación | Sistema en uso | `10-lanzamiento/` |
| 11 | Soporte y mejora | Corrección de errores, cambios, nuevas fases | Soporte mensual + backlog de mejoras | `11-soporte/` |

Las etapas 8 a 11 se repiten en cada fase: sitio, taller, administración.

## Qué hay en cada etapa

### 3. Cierre comercial
Es la que más se saltan los desarrolladores junior, y la que evita problemas después. Antes de escribir requisitos detallados, el dueño debe aprobar la propuesta con el precio. El acuerdo, aunque sea de una página, debe dejar claro:
- **Qué incluye cada fase y qué no incluye.**
- **Control de cambios:** lo que esté fuera del alcance se cotiza aparte.
- **Forma de pago por fase:** por ejemplo, 50% al iniciar y 50% al entregar.
- **Propiedad:** de quién es el código, el dominio y el hosting.
- **Soporte:** cuánto cuesta y qué cubre.

### 4. Requerimientos
Se pasa de "lo que el dueño dijo" a requisitos numerados que se puedan verificar:
- **Funcionales:** `RF-01: El sistema permite registrar una consulta con fotos.`
- **No funcionales:** que funcione bien en el celular, respaldos diarios, tiempos de carga, seguridad de acceso.
- **Reglas de negocio:** `RN-01: El adelanto no se devuelve si el cliente cancela.` · `RN-02: Solo el rol dueño puede crear cotizaciones.` · `RN-03: Una cotización enviada conserva su precio.`

### 5. Análisis
- **Casos de uso:** quién hace qué con el sistema, con un diagrama general y el detalle de los principales.
- **Historias de usuario:** cada una con criterios de aceptación y priorizada: imprescindible, deseable o futura. Esto forma el backlog.
- **Diagramas de secuencia:** solo para los flujos críticos (consulta → cotización → reserva → orden → aviso).
- **Validación:** el dueño revisa el resultado antes de diseñar.

### 6. Diseño
- **Modelo de datos.** Es lo más caro de cambiar después, por eso se diseña para el sistema completo, aunque se programe por fases.
- **Arquitectura y stack:** tecnologías, hosting, cómo se integran WhatsApp y los PDF.
- **Prototipo de las pantallas clave** y mapa del sitio, validados con el dueño y los técnicos.

### 7. Preparación
- **Repositorio Git con `CLAUDE.md`:** contexto del negocio, convenciones y comandos. Los requisitos y el diseño viven en `docs/`, para que Claude Code los lea siempre.
- **Tres entornos:** desarrollo (local), pruebas (donde el dueño revisa) y producción.
- **Despliegue automático** desde la rama principal.
- **Dominio y respaldos.**
- **Verificación de Meta Business:** iniciarla temprano, porque tarda.

### 8. Desarrollo iterativo
El ciclo de cada historia de usuario es:
1. Crear una rama.
2. Planificar con Claude Code (modo plan).
3. Implementar.
4. Escribir las pruebas.
5. Revisar el código uno mismo; nunca hacer merge sin leerlo.
6. Hacer merge y desplegar en el entorno de pruebas.

Una vez por semana se muestra el avance al dueño: corregir el rumbo cada semana es barato; corregirlo al final de la fase, no.

**Definición de terminado:** la historia cumple sus criterios, tiene pruebas, está desplegada en pruebas y el dueño la vio.

### 9. Pruebas y aceptación
- **Pruebas automáticas** de las reglas de negocio y de los flujos críticos.
- **Revisión del dueño:** prueba en el entorno de pruebas con una lista de casos.
- **Acta de aceptación:** el dueño firma o confirma por escrito que la fase está aceptada. Esto cierra la fase y habilita el cobro.

### 10. Lanzamiento
- Cargar los datos reales: precios, servicios y, si se quiere, los clientes del cuaderno.
- Capacitar al dueño y a los técnicos con videos cortos.
- Acompañar la primera semana de uso.

### 11. Soporte y mejora
Los errores se corrigen dentro del soporte. Las mejoras van al backlog y se cotizan aparte.

## Principios
- **Nada se programa sin validar antes:** requisitos aprobados, luego diseño aprobado, luego código.
- **Trazabilidad:** cada requisito lleva a una historia, cada historia a una prueba. Si el dueño pregunta "¿esto estaba incluido?", se responde con el documento.
- **Alcance cerrado por fase:** los cambios siguen bienvenidos, pero entran a la siguiente fase o se cotizan aparte.
- **Desplegar desde el día uno:** producción es parte del proyecto, no el final.
- **La documentación es viva y está en el repositorio,** no en la cabeza ni en un chat.

## Estructura de `docs/`

```
docs/
├── flujo-de-trabajo.md          ← este documento
├── 01-descubrimiento/           entrevista, encuesta y respuestas del dueño
├── 02-propuesta/                propuesta.md
├── 03-cierre-comercial/         acuerdo, precio y condiciones
├── 04-requerimientos/           funcionales, no funcionales, reglas de negocio
├── 05-analisis/
│   ├── casos-de-uso/
│   ├── historias-de-usuario/
│   └── diagramas-de-secuencia/
├── 06-diseno/
│   ├── modelo-de-datos/
│   ├── arquitectura/
│   └── prototipos/
├── 07-preparacion/              entornos, dominio, hosting, cuentas
├── 08-desarrollo/               planificación de ciclos y notas de avance
├── 09-pruebas/
│   └── actas-de-aceptacion/
├── 10-lanzamiento/              carga de datos, capacitación, manuales
└── 11-soporte/                  solicitudes de cambio y backlog de mejoras
```

## Estado actual

- [x] 1. Descubrimiento
- [x] 2. Propuesta
- [x] 3. Cierre comercial: Web + Gestión (Bs 3.900), firmado y primer pago recibido (`acuerdo.md`)
- [x] 4. Requerimientos: aprobados por el dueño
- [ ] 5. Análisis: supuestos S-1 a S-5 respondidos (14/10); criterios de HU-01 a HU-18 se validan en la demo del 23/10 y HU-19 a HU-41 antes del 3/11
- [x] 6. Diseño: modelo de datos, arquitectura (stack aprobado, con Docker) e identidad visual (`06-diseno/identidad-visual.md`); sin prototipo por decisión del usuario
- [ ] 7. Preparación: dominio, VPS, Coolify, R2 y respaldos listos; pruebas en línea y producción sin publicar (`07-preparacion/servidor.md`). Falta darle sus accesos al dueño
- [ ] 8. Desarrollo iterativo ← en curso: entrega 1 programada y pulida; entrega 2 programada (C1 a C4, la reorganización del panel, HU-39 a HU-41 y los pedidos 20 y 21) y pulida (grupos 7 a 13). Siguen los ajustes de la reunión con el dueño (`08-desarrollo/ajustes-reunion-dueno.md`) y después el cierre de C5: prueba con los criterios, capacitación, demo y acta
- [ ] 9–11. Pruebas, lanzamiento y soporte (por entrega)
