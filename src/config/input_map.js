// @ts-check
/**
 * Único lugar donde se definen las teclas (se leen con event.code).
 * No se usa Ctrl (Ctrl+W cierra la pestaña) ni teclas F (funciones del navegador).
 */
export const INPUT_MAP = Object.freeze({
  adelante: ['KeyW', 'ArrowUp'],
  atras: ['KeyS', 'ArrowDown'],
  izquierda: ['KeyA', 'ArrowLeft'],
  derecha: ['KeyD', 'ArrowRight'],
  correr: ['ShiftLeft', 'ShiftRight'],
  saltar: ['Space'],
  esquivar: ['KeyC'],
  escudo: ['KeyQ'],
  manipular: ['KeyE'],
  pausa: ['KeyP'],
  recentrar: ['KeyR', 'Mouse1'],   // la cámara vuelve detrás de Victoria
  apuntar: ['Mouse2'],             // mantener: cámara sobre el hombro y Victoria mira hacia donde apuntas
});

/** Teclas que el navegador no debe procesar mientras se juega (desplazar la página, etc.). */
export const TECLAS_BLOQUEADAS = Object.freeze(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
