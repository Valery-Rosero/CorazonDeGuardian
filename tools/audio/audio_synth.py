"""Síntesis de todos los sonidos del juego (sección 11). Sin muestras descargadas: osciladores,
ruido filtrado y envolventes. Semilla fija, así que cada ejecución produce los mismos archivos.

- Los bucles (cascada, antorcha, ambiente) se sintetizan en el dominio de la frecuencia: la
  transformada inversa es periódica, así que el final empalma exactamente con el principio.
  Se guardan en .wav porque el .mp3 añade silencio al inicio y se oiría un corte al repetir.
- Los efectos cortos se convierten a .mp3 con ffmpeg si está disponible (si no, quedan en .wav
  y se avisa).

Uso: python tools/audio/audio_synth.py
"""
import os
import shutil
import subprocess
import sys
import wave

import numpy as np

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SALIDA = os.path.join(RAIZ, 'public', 'sounds')
RNG = np.random.default_rng(2026)
SR = 44100
SR_BUCLE = 22050


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def guardar_wav(ruta, senal, sr):
    senal = np.clip(senal, -1.0, 1.0)
    datos = (senal * 32767).astype(np.int16)
    with wave.open(ruta, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(datos.tobytes())


def normalizar(s, pico=0.85):
    m = np.max(np.abs(s))
    return s * (pico / m) if m > 0 else s


def ruido_espectral(n, sr, forma):
    """Ruido con el espectro 'forma(frecuencias)' y fases aleatorias: periódico de longitud n."""
    f = np.fft.rfftfreq(n, 1 / sr)
    amp = forma(np.maximum(f, 1.0))
    fase = RNG.uniform(0, 2 * np.pi, len(f))
    espectro = amp * np.exp(1j * fase)
    espectro[0] = 0
    return np.fft.irfft(espectro, n)


def filtrar(s, sr, forma):
    """Filtro en frecuencia: multiplica el espectro por forma(f)."""
    f = np.fft.rfftfreq(len(s), 1 / sr)
    return np.fft.irfft(np.fft.rfft(s) * forma(np.maximum(f, 1.0)), len(s))


def paso_banda(centro, ancho):
    return lambda f: np.exp(-((np.log2(f) - np.log2(centro)) ** 2) / (2 * ancho ** 2))


def paso_bajo(corte, orden=2):
    return lambda f: 1 / (1 + (f / corte) ** (2 * orden))


def paso_alto(corte, orden=2):
    return lambda f: 1 / (1 + (corte / f) ** (2 * orden))


def envolvente(n, sr, ataque, caida, forma='exp'):
    t = np.arange(n) / sr
    a = np.clip(t / max(ataque, 1e-4), 0, 1)
    if forma == 'exp':
        d = np.exp(-np.maximum(t - ataque, 0) / max(caida, 1e-4))
    else:
        d = np.clip(1 - np.maximum(t - ataque, 0) / max(caida, 1e-4), 0, 1)
    return a * d


def tono(frec, dur, sr, armonicos=(1.0,), vibrato=0.0):
    t = np.arange(int(round(dur * sr))) / sr
    f = frec if np.isscalar(frec) else frec
    fase = 2 * np.pi * np.cumsum(np.broadcast_to(f, t.shape) * (1 + vibrato * np.sin(2 * np.pi * 5.5 * t))) / sr
    return sum(a * np.sin(fase * (i + 1)) for i, a in enumerate(armonicos))


def pegar_circular(destino, fragmento, inicio):
    """Suma un fragmento en un bucle dando la vuelta al final (mantiene la periodicidad)."""
    n = len(destino)
    idx = (inicio + np.arange(len(fragmento))) % n
    np.add.at(destino, idx, fragmento)


# ---------------------------------------------------------------------------
# Bucles
# ---------------------------------------------------------------------------

def cascada():
    n = SR_BUCLE * 6
    rugido = ruido_espectral(n, SR_BUCLE, lambda f: f ** -0.35 * paso_bajo(4200)(f) * paso_alto(60)(f))
    grave = ruido_espectral(n, SR_BUCLE, lambda f: paso_banda(110, 0.9)(f))
    t = np.arange(n) / n
    modulacion = 1 + 0.08 * np.sin(2 * np.pi * 3 * t) + 0.05 * np.sin(2 * np.pi * 7 * t + 1)
    return normalizar((normalizar(rugido) + 0.6 * normalizar(grave)) * modulacion, 0.8)


def antorcha():
    n = SR_BUCLE * 3
    soplo = normalizar(ruido_espectral(n, SR_BUCLE, lambda f: paso_bajo(380)(f) * paso_alto(40)(f)), 0.35)
    chasquidos = np.zeros(n)
    for _ in range(38):
        largo = int(SR_BUCLE * RNG.uniform(0.004, 0.02))
        golpe = RNG.normal(0, 1, largo) * np.exp(-np.arange(largo) / (largo / 4))
        golpe = filtrar(golpe, SR_BUCLE, paso_banda(RNG.uniform(1500, 4500), 0.8))
        pegar_circular(chasquidos, golpe * RNG.uniform(0.3, 1.0), int(RNG.uniform(0, n)))
    return normalizar(soplo + normalizar(chasquidos, 0.7), 0.75)


def ambiente_selva():
    n = SR_BUCLE * 16
    t = np.arange(n) / n
    viento = ruido_espectral(n, SR_BUCLE, lambda f: f ** -0.8 * paso_bajo(900)(f) * paso_alto(80)(f))
    viento = normalizar(viento, 0.4) * (0.7 + 0.3 * np.sin(2 * np.pi * 2 * t))
    insectos = ruido_espectral(n, SR_BUCLE, lambda f: paso_banda(6200, 0.15)(f))
    insectos = normalizar(insectos, 0.05) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * t) ** 2)
    aves = np.zeros(n)
    for _ in range(22):
        dur = RNG.uniform(0.07, 0.18)
        m = int(dur * SR_BUCLE)
        tt = np.arange(m) / SR_BUCLE
        f0 = RNG.uniform(2200, 3800)
        glide = f0 * (1 + RNG.uniform(-0.35, 0.45) * tt / dur)
        canto = np.sin(2 * np.pi * np.cumsum(glide * (1 + 0.04 * np.sin(2 * np.pi * 35 * tt))) / SR_BUCLE)
        canto *= np.sin(np.pi * tt / dur) ** 2
        inicio = int(RNG.uniform(0, n))
        for r in range(RNG.integers(1, 4)):
            pegar_circular(aves, canto * RNG.uniform(0.15, 0.4), inicio + int(r * dur * 1.3 * SR_BUCLE))
    return normalizar(viento + insectos + aves, 0.7)


# ---------------------------------------------------------------------------
# Efectos
# ---------------------------------------------------------------------------

def portal():
    dur = 1.7
    n = int(dur * SR)
    t = np.arange(n) / SR
    barrido = np.sin(2 * np.pi * np.cumsum(220 + 900 * (t / dur) ** 1.6) / SR)
    brillo = sum(np.sin(2 * np.pi * f * t) * (0.5 + 0.5 * np.sin(2 * np.pi * (6 + i) * t)) for i, f in enumerate((880, 1320, 1760, 2640)))
    soplo = filtrar(RNG.normal(0, 1, n), SR, paso_banda(1800, 0.7))
    s = 0.5 * barrido + 0.25 * brillo + 0.25 * normalizar(soplo)
    return normalizar(s * envolvente(n, SR, 0.25, 0.9))


def campana(notas, dur, separacion, decaimiento=0.7):
    n = int(dur * SR)
    s = np.zeros(n)
    for i, f in enumerate(notas):
        m = n - int(i * separacion * SR)
        nota = tono(f, m / SR, SR, armonicos=(1.0, 0.35, 0.15, 0.08)) * envolvente(m, SR, 0.005, decaimiento)
        s[int(i * separacion * SR):] += nota
    return normalizar(s)


def checkpoint():
    return campana((523.25, 659.25, 783.99, 1046.5), 2.2, 0.12, 0.8)


def flor():
    return campana((783.99, 1174.66), 1.0, 0.09, 0.45) * 0.8


def tabla_cruje():
    dur = 0.55
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 95 + 40 * np.sin(2 * np.pi * 3.1 * t) + RNG.normal(0, 6, n).cumsum() / 200
    sierra = 2 * ((np.cumsum(f) / SR) % 1) - 1
    s = filtrar(sierra, SR, paso_banda(650, 0.9)) + 0.3 * filtrar(RNG.normal(0, 1, n), SR, paso_banda(1200, 0.5))
    return normalizar(s * envolvente(n, SR, 0.05, 0.25))


def tabla_cae():
    dur = 0.4
    n = int(dur * SR)
    golpe = filtrar(RNG.normal(0, 1, n), SR, paso_banda(500, 0.8)) * envolvente(n, SR, 0.002, 0.05)
    cuerpo = tono(140, dur, SR, (1.0, 0.4)) * envolvente(n, SR, 0.002, 0.12)
    return normalizar(golpe + 0.7 * cuerpo)


def derrota():
    dur = 1.8
    n = int(dur * SR)
    t = np.arange(n) / SR
    caida = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (-t / dur)) / SR)
    pad = filtrar(caida + 0.5 * np.sin(2 * np.pi * np.cumsum(330 * 2 ** (-t / dur)) / SR), SR, paso_bajo(900))
    viento = filtrar(RNG.normal(0, 1, n), SR, paso_bajo(500)) * 0.3
    return normalizar((pad + viento) * envolvente(n, SR, 0.05, 0.8))


def salto():
    n = int(0.22 * SR)
    s = filtrar(RNG.normal(0, 1, n), SR, paso_banda(900, 0.6))
    return normalizar(s * envolvente(n, SR, 0.03, 0.07), 0.5)


def aterrizaje():
    n = int(0.25 * SR)
    golpe = tono(70, 0.25, SR, (1.0, 0.3)) * envolvente(n, SR, 0.002, 0.07)
    tierra = filtrar(RNG.normal(0, 1, n), SR, paso_bajo(700)) * envolvente(n, SR, 0.002, 0.05)
    return normalizar(golpe + 0.6 * tierra, 0.7)


def paso(superficie):
    n = int(0.09 * SR)
    base = RNG.normal(0, 1, n)
    if superficie == 'tierra':
        s = filtrar(base, SR, paso_bajo(650)) * envolvente(n, SR, 0.003, 0.025)
    elif superficie == 'piedra':
        s = filtrar(base, SR, paso_banda(2400, 0.7)) * envolvente(n, SR, 0.001, 0.012)
        s += 0.4 * filtrar(base, SR, paso_bajo(400)) * envolvente(n, SR, 0.002, 0.02)
    else:  # madera
        s = tono(230, n / SR, SR, (1.0, 0.5, 0.2)) * envolvente(n, SR, 0.001, 0.03)
        s += 0.3 * filtrar(base, SR, paso_banda(1400, 0.6)) * envolvente(n, SR, 0.001, 0.015)
    return normalizar(s, 0.45)


def pulso_disparo():
    dur = 0.42
    n = int(dur * SR)
    t = np.arange(n) / SR
    zumbido = np.sin(2 * np.pi * np.cumsum(1400 * np.exp(-t * 7) + 300) / SR)
    brillo = sum(np.sin(2 * np.pi * f * t) for f in (1760, 2637)) * np.exp(-t * 14)
    soplo = filtrar(RNG.normal(0, 1, n), SR, paso_banda(2500, 0.6)) * np.exp(-t * 18)
    return normalizar((0.6 * zumbido + 0.25 * brillo + 0.3 * soplo) * envolvente(n, SR, 0.004, 0.16))


def pulso_impacto():
    dur = 0.5
    n = int(dur * SR)
    t = np.arange(n) / SR
    golpe = filtrar(RNG.normal(0, 1, n), SR, paso_bajo(1800)) * np.exp(-t * 22)
    campanilla = sum(np.sin(2 * np.pi * f * t) for f in (987.77, 1318.5, 1975.5)) * np.exp(-t * 9)
    return normalizar(0.8 * golpe + 0.35 * campanilla)


def escudo_activar():
    dur = 0.8
    n = int(dur * SR)
    t = np.arange(n) / SR
    barrido = np.sin(2 * np.pi * np.cumsum(300 + 500 * np.sqrt(t / dur)) / SR)
    cristal = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate((659.25, 987.77, 1318.5, 1760))) * 0.3
    s = (barrido + cristal) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))
    return normalizar(s * envolvente(n, SR, 0.06, 0.35))


def escudo_bloquear():
    dur = 0.35
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t) for f in (1174.66, 1567.98, 2349.3)) * np.exp(-t * 12)
    s += filtrar(RNG.normal(0, 1, n), SR, paso_banda(3200, 0.5)) * np.exp(-t * 30)
    return normalizar(s)


def manipular():
    dur = 0.6
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (5 + i)) for i, f in enumerate((523.25, 783.99, 1046.5)))
    s *= 1 + 0.3 * np.sin(2 * np.pi * 14 * t)
    return normalizar(s * envolvente(n, SR, 0.02, 0.3), 0.7)


def chisporroteo():
    n = int(0.3 * SR)
    s = np.zeros(n)
    for _ in range(12):
        largo = int(SR * RNG.uniform(0.002, 0.008))
        golpe = filtrar(RNG.normal(0, 1, largo), SR, paso_banda(RNG.uniform(3000, 6000), 0.5)) * np.exp(-np.arange(largo) / (largo / 3))
        inicio = int(RNG.uniform(0, n - largo))
        s[inicio:inicio + largo] += golpe
    return normalizar(s, 0.5)


def brazalete():
    """Desbloqueo de poderes: arpegio ascendente y un acorde que se sostiene."""
    s = campana((392.0, 523.25, 659.25, 783.99, 1046.5), 2.8, 0.1, 1.2)
    n = len(s)
    t = np.arange(n) / SR
    pad = sum(np.sin(2 * np.pi * f * t) for f in (261.63, 392.0, 523.25)) * envolvente(n, SR, 0.6, 1.4) * 0.35
    return normalizar(s + pad)


def pagina():
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    papel = filtrar(RNG.normal(0, 1, n), SR, paso_banda(3500, 0.9)) * (np.abs(np.sin(2 * np.pi * 6 * t)) * np.exp(-t * 5))
    tono_suave = np.sin(2 * np.pi * 880 * t) * envolvente(n, SR, 0.2, 0.3) * 0.25
    return normalizar(papel + tono_suave, 0.6)


def losa_mover():
    dur = 1.7
    n = int(dur * SR)
    t = np.arange(n) / SR
    roce = filtrar(RNG.normal(0, 1, n), SR, paso_bajo(450)) * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t))
    grave = np.sin(2 * np.pi * 48 * t) * 0.6
    return normalizar((roce + grave) * envolvente(n, SR, 0.15, 1.2, forma='lineal'))


def esquiva():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    s = filtrar(RNG.normal(0, 1, n), SR, paso_banda(1200, 0.5)) * np.sin(np.pi * t / t[-1]) ** 2
    return normalizar(s, 0.55)


# ---------------------------------------------------------------------------

BUCLES = {'cascada': cascada, 'antorcha': antorcha, 'ambiente_selva': ambiente_selva}
EFECTOS = {
    'portal': portal, 'checkpoint': checkpoint, 'flor': flor, 'tabla_cruje': tabla_cruje, 'tabla_cae': tabla_cae,
    'derrota': derrota, 'salto': salto, 'aterrizaje': aterrizaje,
    'paso_tierra': lambda: paso('tierra'), 'paso_piedra': lambda: paso('piedra'), 'paso_madera': lambda: paso('madera'),
    'pulso_disparo': pulso_disparo, 'pulso_impacto': pulso_impacto, 'escudo_activar': escudo_activar,
    'escudo_bloquear': escudo_bloquear, 'manipular': manipular, 'chisporroteo': chisporroteo,
    'brazalete': brazalete, 'pagina': pagina, 'losa_mover': losa_mover, 'esquiva': esquiva,
}

# ---------------------------------------------------------------------------
# Día 4: enemigos y santuario. Van después de los anteriores para no cambiar los sonidos que ya
# existen (el generador de números al azar es uno solo y avanza en orden).
# ---------------------------------------------------------------------------

def ambiente_santuario():
    """Penumbra del templo: zumbido grave que respira, aire en los pasillos y gotas lejanas."""
    n = SR_BUCLE * 12
    t = np.arange(n) / n
    dron = sum(np.sin(2 * np.pi * f * np.arange(n) / SR_BUCLE) * a for f, a in ((55.0, 1.0), (82.5, 0.5), (110.0, 0.3)))
    dron *= 0.6 + 0.4 * np.sin(2 * np.pi * 2 * t) ** 2
    aire = normalizar(ruido_espectral(n, SR_BUCLE, lambda f: paso_banda(500, 0.8)(f)), 0.25) * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * t))
    gotas = np.zeros(n)
    for _ in range(9):
        m = int(0.25 * SR_BUCLE)
        tt = np.arange(m) / SR_BUCLE
        gota = np.sin(2 * np.pi * RNG.uniform(1400, 2200) * tt * (1 + 0.6 * tt)) * np.exp(-tt * 28)
        pegar_circular(gotas, gota * RNG.uniform(0.15, 0.35), int(RNG.uniform(0, n)))
    return normalizar(normalizar(dron, 0.35) + aire + gotas, 0.7)


def centinela_despierta():
    dur = 1.6
    n = int(dur * SR)
    t = np.arange(n) / SR
    roce = filtrar(RNG.normal(0, 1, n), SR, paso_bajo(600)) * (0.7 + 0.3 * np.sin(2 * np.pi * 11 * t))
    zumbido = np.sin(2 * np.pi * np.cumsum(60 + 50 * t / dur) / SR)
    ojo = sum(np.sin(2 * np.pi * f * t) for f in (440, 660)) * envolvente(n, SR, 1.0, 0.4) * 0.3
    return normalizar((roce + zumbido) * envolvente(n, SR, 0.2, 1.0, forma='lineal') + ojo)


def centinela_aviso():
    dur = 0.6
    n = int(dur * SR)
    t = np.arange(n) / SR
    roce = filtrar(RNG.normal(0, 1, n), SR, paso_banda(320, 0.7)) * (t / dur)
    sube = np.sin(2 * np.pi * np.cumsum(90 + 140 * (t / dur) ** 2) / SR) * 0.6
    return normalizar((roce + sube) * envolvente(n, SR, 0.05, 0.6, forma='lineal'))


def centinela_golpe():
    dur = 0.9
    n = int(dur * SR)
    t = np.arange(n) / SR
    golpe = filtrar(RNG.normal(0, 1, n), SR, paso_bajo(300)) * np.exp(-t * 9)
    grave = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t * 2.5) + 30) / SR) * np.exp(-t * 4)
    piedritas = filtrar(RNG.normal(0, 1, n), SR, paso_banda(2600, 0.6)) * np.exp(-t * 14) * 0.3
    return normalizar(golpe + grave + piedritas)


def centinela_rompe():
    dur = 1.5
    n = int(dur * SR)
    s = np.zeros(n)
    for _ in range(26):
        largo = int(SR * RNG.uniform(0.03, 0.12))
        g = filtrar(RNG.normal(0, 1, largo), SR, paso_banda(RNG.uniform(250, 1600), 0.7)) * np.exp(-np.arange(largo) / (largo / 4))
        inicio = int(RNG.uniform(0, n * 0.75))
        fin = min(n, inicio + largo)
        s[inicio:fin] += g[:fin - inicio] * RNG.uniform(0.3, 1.0)
    t = np.arange(n) / SR
    s += np.sin(2 * np.pi * 45 * t) * np.exp(-t * 3) * 0.8
    return normalizar(s)


def espectro_carga():
    dur = 0.8
    n = int(dur * SR)
    t = np.arange(n) / SR
    sube = np.sin(2 * np.pi * np.cumsum(300 + 900 * (t / dur) ** 1.5) / SR)
    aire = filtrar(RNG.normal(0, 1, n), SR, paso_banda(1800, 0.5)) * (t / dur)
    return normalizar((sube * 0.6 + aire * 0.4) * envolvente(n, SR, 0.3, 0.6, forma='lineal'), 0.7)


def orbe_disparo():
    dur = 0.5
    n = int(dur * SR)
    t = np.arange(n) / SR
    soplo = filtrar(RNG.normal(0, 1, n), SR, paso_banda(900, 0.6)) * np.exp(-t * 6)
    tono_frio = sum(np.sin(2 * np.pi * f * t) for f in (587.33, 880)) * np.exp(-t * 8) * 0.4
    return normalizar(soplo + tono_frio, 0.75)


def orbe_impacto():
    dur = 0.45
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = filtrar(RNG.normal(0, 1, n), SR, paso_banda(1300, 0.8)) * np.exp(-t * 16)
    s += sum(np.sin(2 * np.pi * f * t) for f in (440, 698.46)) * np.exp(-t * 10) * 0.5
    return normalizar(s, 0.75)


def espectro_muere():
    dur = 1.6
    n = int(dur * SR)
    t = np.arange(n) / SR
    baja = np.sin(2 * np.pi * np.cumsum(880 * 2 ** (-2 * t / dur)) / SR)
    brillo = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate((1318.5, 1760, 2349.3))) * 0.2
    aire = filtrar(RNG.normal(0, 1, n), SR, paso_banda(3000, 0.6)) * 0.3
    return normalizar((baja + brillo + aire) * envolvente(n, SR, 0.02, 0.9))


def dano():
    dur = 0.35
    n = int(dur * SR)
    t = np.arange(n) / SR
    golpe = filtrar(RNG.normal(0, 1, n), SR, paso_bajo(700)) * np.exp(-t * 18)
    grave = np.sin(2 * np.pi * 110 * t) * np.exp(-t * 12)
    return normalizar(golpe + grave, 0.8)


def espejo_girar():
    dur = 0.55
    n = int(dur * SR)
    t = np.arange(n) / SR
    roce = filtrar(RNG.normal(0, 1, n), SR, paso_bajo(900)) * envolvente(n, SR, 0.02, 0.2)
    despues = t > 0.28
    clic = filtrar(RNG.normal(0, 1, n), SR, paso_banda(2500, 0.4)) * np.exp(-np.maximum(t - 0.28, 0) * 60) * despues
    campanilla = np.sin(2 * np.pi * 1567.98 * t) * np.exp(-np.maximum(t - 0.28, 0) * 7) * despues * 0.3
    return normalizar(roce * 0.6 + clic + campanilla, 0.7)


def acertijo_resuelto():
    s = campana((392.0, 493.88, 587.33, 783.99, 987.77, 1174.66), 3.4, 0.11, 1.5)
    n = len(s)
    t = np.arange(n) / SR
    pad = sum(np.sin(2 * np.pi * f * t) for f in (196.0, 293.66, 392.0)) * envolvente(n, SR, 0.5, 1.8) * 0.4
    return normalizar(s + pad)


BUCLES_DIA4 = {'ambiente_santuario': ambiente_santuario}
EFECTOS_DIA4 = {
    'centinela_despierta': centinela_despierta, 'centinela_aviso': centinela_aviso, 'centinela_golpe': centinela_golpe,
    'centinela_rompe': centinela_rompe, 'espectro_carga': espectro_carga, 'orbe_disparo': orbe_disparo,
    'orbe_impacto': orbe_impacto, 'espectro_muere': espectro_muere, 'dano': dano, 'espejo_girar': espejo_girar,
    'acertijo_resuelto': acertijo_resuelto,
}

# ---------------------------------------------------------------------------
# Día 5: el Guardián, el escape y las voces (murmullo sintetizado, opción A del guion).
# Van al final para no cambiar ningún sonido anterior.
# ---------------------------------------------------------------------------

# Copia de src/config/dialogues.js (una prueba comprueba que cada línea tiene su voz)
LINEAS = {
    'mat_despertar_01': ('mateo', '¿Victoria…? No… vete… no me deja soltarla…', 5.9, True),
    'gem_despertar_01': ('gema', 'Otra mano que quiere robar el sol.', 2.7, False),
    'gem_fase2_01': ('gema', '¡Nadie saldrá de este templo con mi luz!', 3.2, False),
    'vic_fase2_01': ('victoria', '¡Papá, resiste!', 1.6, False),
    'mat_fase3_01': ('mateo', 'Hija… el núcleo… rómpelo… no tengas miedo.', 5.1, True),
    'mat_derrota_01': ('mateo', 'Victoria… viniste.', 2.1, False),
    'vic_derrota_01': ('victoria', 'Te dije que llegaría antes que tú.', 2.7, False),
    'mat_escape_01': ('mateo', '¡Corre! Estoy justo detrás de ti.', 2.9, False),
    # Aprobadas el 11/11 (al final: las voces anteriores no cambian)
    'vic_brazalete_01': ('victoria', 'Así que esto buscabas, papá.', 2.4, False),
    'vic_cascada_01': ('victoria', '«Detrás del agua hay un camino». Como siempre, tenías razón.', 5.2, False),
    'vic_puente_01': ('victoria', 'Te aguantó a ti… ojalá me aguante a mí.', 3.7, False),
    'vic_voz_01': ('victoria', '¿Papá? ¿Eres tú?', 1.8, False),
}

# Formantes (F1, F2) de las vocales del español
FORMANTES = {'a': (780, 1300), 'e': (480, 1850), 'i': (300, 2250), 'o': (500, 900), 'u': (330, 780)}
SIN_TILDE = str.maketrans('áéíóúü', 'aeiouu')
VOCES = {'victoria': 235.0, 'mateo': 112.0, 'gema': 196.0}


def silabas(texto):
    """Sílabas aproximadas (una por grupo de vocales) y pausas: '…' larga, ',' y '.' cortas."""
    t = texto.lower().translate(SIN_TILDE)
    salida = []
    i = 0
    while i < len(t):
        c = t[i]
        if c in 'aeiou':
            j = i
            while j < len(t) and t[j] in 'aeiou':
                j += 1
            # La vocal que suena es la más abierta del grupo
            grupo = t[i:j]
            vocal = max(grupo, key=lambda v: 'iueoa'.index(v))
            salida.append(('s', vocal))
            i = j
            continue
        if c == '…' or t[i:i + 3] == '...':
            salida.append(('p', 0.42))
        elif c in ',;':
            salida.append(('p', 0.18))
        elif c in '.!?':
            salida.append(('p', 0.12))
        i += 1
    return salida


def murmullo(texto, dur, quien, dentro=False):
    """Voz sin palabras: cada sílaba es un pulso de voz con los formantes de su vocal y una melodía
    que baja al final de la frase (y sube en las preguntas)."""
    f0 = VOCES[quien]
    partes = silabas(texto)
    pausas = sum(x for k, x in partes if k == 'p')
    n_sil = max(1, sum(1 for k, _ in partes if k == 's'))
    d_sil = max(0.07, (dur * 0.92 - pausas) / n_sil)
    pregunta = '?' in texto
    exclamacion = '!' in texto
    trozos = []
    k = 0
    for tipo, valor in partes:
        if tipo == 'p':
            trozos.append(np.zeros(int(valor * SR)))
            continue
        n = int(d_sil * SR)
        t = np.arange(n) / SR
        avance = k / n_sil
        melodia = 1.0 + 0.12 * np.sin(np.pi * avance) - 0.1 * avance + (0.18 * avance ** 3 if pregunta else 0)
        melodia *= 1.08 if exclamacion else 1.0
        f = f0 * melodia * (1 + 0.02 * RNG.normal()) * (1 + 0.015 * np.sin(2 * np.pi * 5.2 * t))
        fase = 2 * np.pi * np.cumsum(f) / SR
        fuente = sum(np.sin(fase * h) / h ** 1.1 for h in range(1, 28))
        if quien == 'gema':
            # Susurro: ruido filtrado por los mismos formantes, con un hilo de voz cantada
            fuente = RNG.normal(0, 1, n) * 1.4 + 0.25 * fuente
        f1, f2 = FORMANTES[valor]
        filtro = lambda fr, f1=f1, f2=f2: (paso_banda(f1, 0.22)(fr) + 0.7 * paso_banda(f2, 0.18)(fr) +
                                            0.25 * paso_banda(2900, 0.2)(fr)) * paso_alto(90)(fr)
        silaba = filtrar(fuente, SR, filtro) * envolvente(n, SR, 0.018, d_sil * 0.45)
        trozos.append(silaba * (0.85 + 0.3 * RNG.random()))
        k += 1
    s = np.concatenate(trozos)
    n_total = int(dur * SR)
    s = np.pad(s, (0, max(0, n_total - len(s))))[:n_total]
    if quien == 'gema':
        # Coro: la misma voz un poco antes, un poco después y más grave
        coro = s.copy()
        for retraso, g in ((0.017, 0.55), (0.031, 0.45), (0.046, 0.35)):
            d = int(retraso * SR)
            coro[d:] += s[:-d] * g
        s = coro
    if dentro:
        # Mateo atrapado en el Guardián: suena lejano, con eco de piedra
        s = filtrar(s, SR, paso_bajo(2200))
        eco = s.copy()
        for retraso, g in ((0.11, 0.5), (0.23, 0.32), (0.37, 0.2)):
            d = int(retraso * SR)
            eco[d:] += s[:-d] * g
        s = eco
    return normalizar(s, 0.8)


def guardian_rugido():
    dur = 1.8
    n = int(dur * SR)
    t = np.arange(n) / SR
    grave = sum(np.sin(2 * np.pi * np.cumsum(f * (1 - 0.25 * t / dur) * (1 + 0.04 * np.sin(2 * np.pi * 7 * t))) / SR) / i
                for i, f in enumerate((55, 82, 110), start=1))
    roca = filtrar(RNG.normal(0, 1, n), SR, paso_bajo(500)) * 0.7
    return normalizar((grave + roca) * envolvente(n, SR, 0.25, 1.0))


def guardian_sismico():
    dur = 1.6
    n = int(dur * SR)
    t = np.arange(n) / SR
    golpe = filtrar(RNG.normal(0, 1, n), SR, paso_bajo(220)) * np.exp(-t * 3.5)
    grave = np.sin(2 * np.pi * np.cumsum(45 * np.exp(-t * 0.8) + 20) / SR) * np.exp(-t * 2)
    return normalizar(golpe + grave)


def guardian_barrido():
    dur = 0.9
    n = int(dur * SR)
    t = np.arange(n) / SR
    # Barrido: el roce pasa de grave a agudo (dos bandas que se cruzan)
    ruido = RNG.normal(0, 1, n)
    s = (filtrar(ruido, SR, paso_banda(350, 0.6)) * (1 - t / dur) + filtrar(ruido, SR, paso_banda(1200, 0.6)) * (t / dur))
    s *= np.sin(np.pi * t / dur) ** 1.5
    return normalizar(s)


def guardian_rayo():
    dur = 2.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    zumbido = sum(np.sin(2 * np.pi * f * t * (1 + 0.6 * t / dur)) for f in (220, 330, 440)) * (t / dur)
    chispa = filtrar(RNG.normal(0, 1, n), SR, paso_banda(4000, 0.5)) * (t > 1.5) * 0.8
    return normalizar((zumbido + chispa) * envolvente(n, SR, 0.1, 1.6, forma='lineal'))


def guardian_aviso():
    """El zumbido grave que acompaña el círculo dorado del golpe sísmico."""
    dur = 1.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(70 + 60 * t) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 8 * t))
    return normalizar(s * envolvente(n, SR, 0.05, 0.9, forma='lineal'), 0.75)


def roca_cae():
    dur = 0.8
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = filtrar(RNG.normal(0, 1, n), SR, paso_bajo(900)) * np.exp(-t * 7)
    s += np.sin(2 * np.pi * 70 * t) * np.exp(-t * 6) * 0.8
    return normalizar(s)


def pilar_enciende():
    return campana((659.25, 987.77, 1318.5), 1.6, 0.06, 1.0)


def nucleo_latido():
    """Bucle del latido del núcleo (el juego lo acelera en cada fase cambiando la velocidad)."""
    n = int(SR_BUCLE * 1.2)
    t = np.arange(n) / SR_BUCLE
    s = np.zeros(n)
    for inicio in (0.0, 0.28):
        tt = np.maximum(t - inicio, 0)
        s += np.sin(2 * np.pi * 52 * tt) * np.exp(-tt * 14) * (t >= inicio)
    return normalizar(s, 0.8)


def derrumbe():
    """Bucle del escape: rumor de piedra y crujidos."""
    n = SR_BUCLE * 8
    rumor = normalizar(ruido_espectral(n, SR_BUCLE, lambda f: paso_bajo(180)(f) * paso_alto(25)(f)), 0.6)
    crujidos = np.zeros(n)
    for _ in range(30):
        largo = int(SR_BUCLE * RNG.uniform(0.03, 0.15))
        g = filtrar(RNG.normal(0, 1, largo), SR_BUCLE, paso_banda(RNG.uniform(200, 1200), 0.7)) * np.exp(-np.arange(largo) / (largo / 3))
        pegar_circular(crujidos, g * RNG.uniform(0.2, 0.6), int(RNG.uniform(0, n)))
    return normalizar(rumor + crujidos, 0.75)


def victoria():
    """Fanfarria cálida de la pantalla de victoria."""
    s = campana((392.0, 523.25, 659.25, 783.99, 1046.5, 1318.5), 4.0, 0.16, 1.8)
    n = len(s)
    t = np.arange(n) / SR
    pad = sum(np.sin(2 * np.pi * f * t) for f in (261.63, 329.63, 392.0, 523.25)) * envolvente(n, SR, 0.8, 2.4) * 0.35
    return normalizar(s + pad)


BUCLES_DIA5 = {'nucleo_latido': nucleo_latido, 'derrumbe': derrumbe}
EFECTOS_DIA5 = {
    'guardian_rugido': guardian_rugido, 'guardian_sismico': guardian_sismico, 'guardian_barrido': guardian_barrido,
    'guardian_rayo': guardian_rayo, 'guardian_aviso': guardian_aviso, 'roca_cae': roca_cae,
    'pilar_enciende': pilar_enciende, 'victoria': victoria,
}
VOCES_DIA5 = {f'voz/{c}': (lambda c=c: murmullo(LINEAS[c][1], LINEAS[c][2], LINEAS[c][0], LINEAS[c][3])) for c in LINEAS}


import music_synth  # noqa: E402  (la música: su propio azar, no cambia nada de lo anterior)

# Día 6: la voz que se oye detrás de la puerta de los espejos (la gema susurra, sin subtítulo)
VOCES_DIA6 = {'voz/gem_susurro_puerta': lambda: murmullo('Vi… to… ri… a…', 3.0, 'gema', True)}


def buscar_ffmpeg():
    ruta = shutil.which('ffmpeg')
    if ruta:
        return ruta
    winget = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe')
    return winget if os.path.exists(winget) else None


def main():
    os.makedirs(SALIDA, exist_ok=True)
    ffmpeg = buscar_ffmpeg()
    if not ffmpeg:
        print('[audio] AVISO: ffmpeg no está instalado; los efectos quedan en .wav', file=sys.stderr)
    # El orden importa: primero lo de los días 1 a 3 (los mismos sonidos de siempre), después lo nuevo
    os.makedirs(os.path.join(SALIDA, 'voz'), exist_ok=True)
    for bucles, efectos in ((BUCLES, EFECTOS), (BUCLES_DIA4, EFECTOS_DIA4), (BUCLES_DIA5, {**EFECTOS_DIA5, **VOCES_DIA5}), ({}, VOCES_DIA6)):
        generar(bucles, efectos, ffmpeg)
    # Música: los bucles en .wav (un .mp3 añade silencio al empezar y el bucle se oiría cortado)
    for nombre, fn in music_synth.PIEZAS.items():
        ruta = os.path.join(SALIDA, f'{nombre}.wav')
        guardar_wav(ruta, fn(), music_synth.SR)
        print(f'[audio] música {nombre}.wav ({os.path.getsize(ruta) / 1024:.0f} KB)')


def generar(bucles, efectos, ffmpeg):
    for nombre, fn in bucles.items():
        ruta = os.path.join(SALIDA, f'{nombre}.wav')
        guardar_wav(ruta, fn(), SR_BUCLE)
        print(f'[audio] bucle {nombre}.wav ({os.path.getsize(ruta) / 1024:.0f} KB)')
    for nombre, fn in efectos.items():
        wav = os.path.join(SALIDA, f'{nombre}.wav')
        guardar_wav(wav, fn(), SR)
        if ffmpeg:
            mp3 = os.path.join(SALIDA, f'{nombre}.mp3')
            subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '4', mp3], check=True)
            os.remove(wav)
            print(f'[audio] efecto {nombre}.mp3 ({os.path.getsize(mp3) / 1024:.0f} KB)')
        else:
            print(f'[audio] efecto {nombre}.wav')


if __name__ == '__main__':
    main()
