# El Templo del Sol Perdido — ficha del concepto

*Borrador para que el equipo lo revise, añada sus nombres y lo exporte a PDF (una página).*

**Equipo:** _(nombres)_ · **Curso:** Programación de Entornos Multimedia · **Fecha:** _(fecha de entrega)_

## La idea

Victoria Solano, una joven cartógrafa, sigue el mapa de su padre desaparecido hasta un templo perdido en la selva. Allí descubre que el temible Guardián del Sol que lo protege es su propio padre, atrapado por la gema que vino a buscar. Para salvarlo tiene que romper el núcleo del Guardián y sellar la gema en el brazalete que él nunca encontró.

## El juego

- **Género:** aventura 3D en tercera persona para un jugador, en el navegador (Chrome o Edge).
- **Duración:** de 15 a 20 minutos.
- **Recorrido:** la selva olvidada (exploración, cascada, puente que se derrumba) → el santuario (acertijo de los espejos, centinelas y espectros) → la cámara del sol (jefe en tres fases) → escape cronometrado y final al amanecer.
- **Mecánicas:** tres poderes del brazalete (Pulso solar, Escudo arcano y Manipulación ancestral), esquiva, checkpoints, páginas del diario de Mateo.

## Lo que lo hace distinto

- **Todo se genera con código:** personajes y escenarios con Python en Blender; música y efectos sintetizados con numpy (los personajes no tienen voz: los diálogos se leen); luz, materiales y partículas en Three.js. No hay imágenes ni sonidos descargados.
- **Una historia contada con la cámara:** diez cinemáticas diseñadas plano a plano. Cuando habla el padre, late el pecho del Guardián; cuando habla la gema, brilla la máscara. Termina con un final abierto: un ejército marcha hacia ellos.
- **Los 8 requisitos del curso**, demostrables en vivo desde un modo demostración integrado.

## Tecnología

Three.js 0.160 · cannon-es 0.20 · Vite · Blender 5.2 (Python) · numpy · 103 pruebas automáticas con `node --test`.

## Pilares de diseño

1. **Belleza procedural:** aunque todo sea código, se ve elaborado y cálido.
2. **Claridad:** cada peligro se anuncia antes de golpear.
3. **Emoción:** la historia de padre e hija, con poco texto y mucha intención.
