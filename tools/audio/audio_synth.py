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


def buscar_ffmpeg():
    ruta = shutil.which('ffmpeg')
    if ruta:
        return ruta
    winget = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe')
    return winget if os.path.exists(winget) else None


def main():
    os.makedirs(SALIDA, exist_ok=True)
    ffmpeg = buscar_ffmpeg()
    for nombre, fn in BUCLES.items():
        ruta = os.path.join(SALIDA, f'{nombre}.wav')
        guardar_wav(ruta, fn(), SR_BUCLE)
        print(f'[audio] bucle {nombre}.wav ({os.path.getsize(ruta) / 1024:.0f} KB)')
    if not ffmpeg:
        print('[audio] AVISO: ffmpeg no está instalado; los efectos quedan en .wav', file=sys.stderr)
    for nombre, fn in EFECTOS.items():
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
