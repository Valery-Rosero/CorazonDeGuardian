# Epílogo «La marcha»: guion gráfico

Después del amanecer, el juego no termina en paz: un ejército de centinelas y espectros marcha hacia Victoria y Mateo. Es un final abierto, para una segunda parte.

- **Dónde:** la cornisa del amanecer. Al este, el mar de nubes y, a 126 m, un monte de 36 m justo delante del sol.
- **Idea:** la gema está sellada en el brazalete de Victoria y llama a los guardianes del templo. Vienen por ella.
- **Duración:** 24 s, después de la cinemática final (16 s) y antes de la pantalla de victoria.
- **Código:**
  - la cinemática, en `src/cinematics/epilogo.js`;
  - el ejército, en `src/world/army.js` (con su configuración en `src/config/epilogue.js`);
  - la música `musica_amenaza`, en `tools/audio/music_synth.py`.

La música y la cinemática comparten los tiempos de `T_EPILOGO`. Una prueba comprueba que el negro coincide con el golpe final de la música (20,6 s).

## Planos

| # | Tiempo | Plano | Lente | Movimiento | Qué pasa | Sonido |
|---|---|---|---|---|---|---|
| 1 | 0–3 s | De espaldas, los dos frente al sol, entre ellos | 40 mm | Avance mínimo | Silencio del amanecer; Victoria se tensa (cara de sorpresa) | Tres tambores lejanos (0,4 · 1,6 · 2,8 s) |
| 2 | 3–7 s | Teleobjetivo entre los dos hacia la cresta, a contraluz | 120→150 mm | Zum lento | Sobre la cresta, ojos azules que se encienden del fondo hacia delante; espectros sobre la tropa | Trémolo frío y dron grave |
| 3 | 7–11,5 s | A ras de suelo, delante de la primera fila | 24 mm | Retrocede con la tropa | Los centinelas bajan hacia la cámara, pisada a pisada, al ritmo de la música | La marcha (96 por minuto), el leitmotiv deformado en metales graves |
| 4 | 11,5–14,5 s | Primer plano de Mateo, desde el lado del abismo | 65 mm | Fijo | «La gema… los está llamando.» | Solo latidos lejanos bajo la voz |
| 5 | 14,5–17,5 s | Primer plano de Victoria | 65 mm | Fijo | Mira el brazalete (la gema lanza chispas azules) y levanta la vista: «¿Cómo saldremos de aquí?» | Latidos |
| 6 | 17,5–20,6 s | Grúa detrás de los dos, sobre el borde de la cornisa | 30 mm | Sube y retrocede | Los dos, pequeños y de espaldas, frente al monte cubierto por el ejército que baja; los espectros en el cielo | Vuelve toda la marcha y crece |
| — | 20,6 s | Negro | — | Corte seco | — | Golpe final |
| — | 21,3–24 s | «Continuará…» sobre negro | — | — | Después, la pantalla de victoria | Cola del golpe y dron que se apaga |

## Reglas de cámara

- **Eje del diálogo:** los planos 4 y 5 se toman los dos desde el lado del abismo, mirando hacia la cornisa. Mateo queda a la derecha de Victoria en los dos, así que no se cruza el eje.
- **Plano 6:** primero se probó desde detrás de la tropa y desde un costado de la columna, pero la ladera es tan empinada que la tropa quedaba fuera del cuadro. Desde detrás de los dos, el ejército entero se ve encima de ellos.
- **Lentes:**
  - En el plano 2, el teleobjetivo comprime la distancia: la cresta parece encima de ellos.
  - En el plano 3, el angular a ras de suelo hace enormes a los centinelas.
- **Contraluz:** en los planos 1 y 2 el ejército aparece entre los dos y el sol, así que se ve en silueta. Los ojos llevan un brillo que atraviesa la niebla.

## El ejército

- **Tamaño:**
  - 220 centinelas, en filas de 11 al tresbolillo;
  - 36 espectros que flotan entre 3,5 y 7,5 m.
- **Modelos:** son los mismos del juego, horneados en su pose de reposo y dibujados con `InstancedMesh`. Son 5 llamadas de dibujo para todo el ejército, más 1 para el brillo de los ojos.
- **Marcha:** cada centinela rebota en cada pisada y se balancea de un pie al otro, con su propia fase y tamaño. La cadencia sigue el tempo de la música.
- **Terreno:**
  - Siguen la ladera con un mapa de alturas que se mide una vez, al cargar.
  - Donde no hay suelo (el vacío del abismo), esa criatura no se dibuja.
- **Precarga:** todo se crea al cargar, y sus sombreadores se precompilan con los demás.

## Cómo verlo

`/?debug&auto&poderes&final=epilogo` salta directamente al epílogo. `&final=amanecer` muestra el final y el epílogo seguidos.
