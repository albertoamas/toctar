# <Código> <Nombre de la etapa> — especificación

- **Fase y semana:** <fase> · <semana y fechas>
- **Estado:** borrador | aprobada | en curso | cerrada
- **Historias:** <HU-XX, …>
- **Base:** requisitos, casos de uso y modelo de datos que aplica

Esta especificación se escribe al empezar la etapa, con lo aprendido en las anteriores. Se programa contra ella; si algo cambia durante la etapa, se corrige aquí primero.

## 1. Objetivo
Una o dos frases: qué puede hacer el dueño (o el visitante) al terminar la etapa que antes no podía.

## 2. Alcance
- **Incluye:** …
- **No incluye** (y dónde queda): …

## 3. Reglas que se cumplen
Requisitos (RF, RNF), reglas de negocio (RN) y supuestos (S) que toca la etapa, con cómo se garantiza cada uno: en la base, en el servidor o en la interfaz.

## 4. Datos
Tablas nuevas o cambiadas, columna por columna: tipo, nulo, restricciones e índices. Nombre de la migración. Datos iniciales.

## 5. Pantallas y rutas
Por cada ruta: quién entra, qué muestra, qué acciones ofrece y cómo se ve en el celular. Estados vacío, cargando y error.

## 6. Acciones del servidor
Por cada acción: quién puede llamarla, entrada (esquema Zod), validaciones, qué escribe, qué devuelve y los mensajes de éxito y de error.

## 7. Componentes y diseño
Componentes de shadcn/ui y del Design System que se usan; componentes nuevos.

## 8. Textos de la interfaz
Títulos, botones, mensajes de éxito, errores y estados vacíos, escritos tal como aparecen.

## 9. Pruebas
- **Unitarias** (`tests/unit/`): una por regla.
- **De punta a punta** (`tests/e2e/`): una por criterio de aceptación.

## 10. Orden de trabajo
Ramas, el orden de las historias y qué entra en cada PR.

## 11. Criterio de salida
Lo que se comprueba para dar la etapa por cerrada, y lo que se muestra en la demo.

## 12. Decisiones abiertas
Lo que falta definir, de quién depende y qué se hace mientras tanto.
