// @ts-check
/** Lógica pura del movimiento de Victoria (se prueba con node --test). */

/**
 * Mueve 'actual' hacia 'objetivo' sin pasarse de 'maxDelta'.
 * @param {number} actual @param {number} objetivo @param {number} maxDelta
 */
export function acercar(actual, objetivo, maxDelta) {
  const d = objetivo - actual;
  if (Math.abs(d) <= maxDelta) return objetivo;
  return actual + Math.sign(d) * maxDelta;
}

/** Velocidad inicial necesaria para subir 'altura' metros. @param {number} altura @param {number} g */
export function velocidadSalto(altura, g) {
  return Math.sqrt(2 * g * altura);
}

/** Diferencia de ángulos por el camino más corto, en (-π, π]. @param {number} desde @param {number} hasta */
export function anguloMasCorto(desde, hasta) {
  let d = (hasta - desde) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

export function crearEstadoSalto() {
  return { coyote: 0, memoria: 0 };
}

/**
 * Tiempo de gracia en bordes (coyote time) y memoria de la tecla de salto.
 * @param {{coyote:number, memoria:number}} estado
 * @param {number} dt
 * @param {boolean} enSuelo
 * @param {boolean} pulsoSalto
 * @param {{coyote:number, memoria_salto:number}} cfg
 * @returns {boolean} true si debe saltar en este fotograma
 */
export function actualizarSalto(estado, dt, enSuelo, pulsoSalto, cfg) {
  estado.coyote = enSuelo ? cfg.coyote : Math.max(0, estado.coyote - dt);
  estado.memoria = pulsoSalto ? cfg.memoria_salto : Math.max(0, estado.memoria - dt);
  if (estado.coyote > 0 && estado.memoria > 0) {
    estado.coyote = 0;
    estado.memoria = 0;
    return true;
  }
  return false;
}
