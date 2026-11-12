# Guion del video (60 segundos)

Video corto que muestra los 8 requisitos del curso **con el audio activado**. Lo graba el equipo; este guion dice qué mostrar en cada momento y qué decir.

**Antes de grabar**

- Usar una computadora con tarjeta gráfica dedicada si es posible (calidad media o alta: se ve el bloom).
- Grabar a 1920 × 1080 y con el sonido del sistema (por ejemplo, la barra de juegos de Windows: Win + G).
- Abrir el juego con `npm run dev`. Para los saltos entre lugares, usar el modo demostración (`/?demo`).
- Desactivar las notificaciones del sistema.

| Tiempo | En pantalla | Qué hacer | Voz en off (opcional) |
|---|---|---|---|
| 0–6 s | La introducción: vuelo sobre la selva, la cima dorada en la niebla, Victoria con el mapa, el título | Pulsar **Jugar** y dejar correr la introducción | «El Corazón del Guardián: una aventura 3D en el navegador, hecha toda con código.» |
| 6–12 s | **1 · Escenario y sombras.** Las ruinas del pórtico con sombras de sol | Demostración → requisito 1; mover un poco la cámara | «Escenarios generados en Blender con Python, con luz y sombras.» |
| 12–18 s | **2 · Navegación.** Girar la cámara; después la cámara libre | Mover el ratón; marcar «Cámara libre» y orbitar | «Cámara en tercera persona y cámara libre con OrbitControls.» |
| 18–25 s | **3 · Audio 3D y 5 · Partículas.** Caminar hacia la cascada | Demostración → requisito 3; caminar hacia el agua y alejarse | «El sonido de la cascada sube al acercarse; el agua son partículas con gravedad.» |
| 25–31 s | **4 · Triggers.** Las cajas visibles; entrar en la cueva y cruzar el portal | Demostración → requisito 4; entrar en el portal | «Triggers por caja y por distancia: el portal teletransporta y espera tres segundos.» |
| 31–37 s | **6 · Físicas.** Disparar a las esferas de piedra | Demostración → requisito 6; clic sobre las esferas | «Física con cannon-es: masa, gravedad y rebote.» |
| 37–41 s | **7 · HUD.** El cuaderno de la cartógrafa resaltado | Demostración → requisito 7; caminar unos pasos | «El cuaderno de la cartógrafa muestra la zona y las coordenadas en tiempo real.» |
| 41–52 s | El combate: el Guardián en la fase 3, brasas, un golpe sísmico | Tecla **8** (en `npm run dev`): fase 3; esquivar y disparar | «El jefe final: tres fases, ataques anunciados y una historia que se cuenta sin texto.» |
| 52–60 s | **8 · Optimización.** El panel con FPS, llamadas y triángulos; cierre con el amanecer | Demostración → requisito 8; terminar en el final (`/?auto&poderes&final=amanecer`) | «Todo se crea al cargar: sesenta cuadros por segundo. Gracias.» |

Si el video tiene que durar 30 segundos, se conservan los tramos de 6–41 s acortando cada uno a la mitad y se cierra con el plano del amanecer.
