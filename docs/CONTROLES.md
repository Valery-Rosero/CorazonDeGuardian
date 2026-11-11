# Controles

## Juego

| Acción | Tecla |
|---|---|
| Moverse | W A S D o flechas |
| Correr | Shift |
| Saltar | Espacio |
| Esquivar | C |
| Apuntar | Mantener clic derecho: la cámara va sobre el hombro, Victoria mira hacia donde apuntas y camina de lado sin dejar de apuntar; la mira se pone roja sobre un enemigo |
| Pulso solar | Clic izquierdo (apuntando va justo a la mira; sin apuntar, Victoria se gira y dispara) |
| Escudo arcano | Q |
| Manipulación ancestral, leer páginas, usar pilares | E |
| Mirar | Ratón (la vista queda capturada al hacer clic en el juego). La cámara se queda donde la dejas |
| Cámara detrás de Victoria | R o botón central del ratón |
| Pausa | P o Esc |
| Modo foto | F (o el botón de la pausa); F o Esc para volver |
| Saltar una cinemática | Mantener Espacio 1 segundo |

Los poderes se desbloquean en orden. El Pulso solar y la Manipulación se obtienen al tomar el brazalete del altar del claro. El Escudo llega en el altar del santuario.

## Opciones (menú principal)

Volumen general, de música, de efectos y de voces; sensibilidad del ratón; sacudida de cámara; subtítulos; que la cámara vuelva sola detrás de Victoria (apagado por defecto); calidad gráfica (automática, baja, media o alta). La calidad se aplica al volver a cargar la página.

## Depuración (en `npm run dev` o con `?debug` en la dirección)

| Tecla | Acción |
|---|---|
| 1, 2, 3 | Ir a la entrada, la cornisa del puente o las ruinas del pórtico |
| 4, 5 | Ir a la sala de columnas o a la sala de los espejos del santuario |
| 6 | Invulnerabilidad |
| 7 | Desbloquear los tres poderes |
| 8 | Ir a la arena con el Guardián en la fase 3 |
| 9 | Mostrar u ocultar los FPS y las llamadas de dibujo (arriba a la derecha) |
| 0 | Mostrar u ocultar los triggers y los colisionadores |

## Direcciones útiles (con el servidor en marcha)

| Dirección | Qué abre |
|---|---|
| `/?demo` | El modo demostración directamente |
| `/?debug&auto&poderes&ir=santuario` | El vestíbulo del santuario con los tres poderes |
| `/?debug&auto&poderes&ir=arena` | La entrada de la arena (camina hacia el trono para despertar al Guardián) |
| `/?debug&auto&poderes&final=derrota` | La cinemática de la derrota del Guardián |
| `/?debug&auto&poderes&final=amanecer` | La cinemática final |
| `&stats` | Añadido a cualquier dirección: llamadas, triángulos y luces en pantalla |
| `&calidad=baja`, `media` o `alta` | Fuerza una calidad gráfica |

En `npm run dev` no hace falta añadir `debug`.
