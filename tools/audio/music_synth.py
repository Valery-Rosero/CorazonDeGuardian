"""Música del juego, toda sintetizada con numpy (sección 11).

Un leitmotiv pentatónico (la canción de Victoria y Mateo) recorre todas las piezas:
- musica_selva: marimba y flauta sobre un colchón suave; el motivo completo, tranquilo (bucle).
- musica_santuario: dron grave, campanas sueltas y el motivo a medias (bucle).
- musica_jefe: tambores graves y ostinato de bajo; el motivo en metales oscuros (bucle).
- musica_escape: percusión rápida y el motivo acelerado (bucle).
- musica_tema: el motivo completo en mayor, para la introducción y el amanecer (sin bucle).

Usa su propio generador aleatorio: no cambia ningún sonido anterior.
"""
import numpy as np

SR = 22050
R = np.random.default_rng(7177)

# Notas (Hz) — La menor pentatónica y Do mayor
N = {
    'A2': 110.0, 'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'G3': 196.0, 'A3': 220.0, 'C4': 261.63, 'D4': 293.66,
    'E4': 329.63, 'F4': 349.23, 'G4': 392.0, 'A4': 440.0, 'B4': 493.88, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25,
    'G5': 783.99, 'A5': 880.0, 'F3': 174.61, 'B3': 246.94, 'E2': 82.41, 'D2': 73.42, 'C2': 65.41, 'G2': 98.0, 'F2': 87.31,
}
# El leitmotiv: (nota, pulsos)
MOTIVO = [('E4', 1), ('G4', 1), ('A4', 2), ('C5', 1), ('A4', 1), ('G4', 2),
          ('E4', 1), ('D4', 1), ('E4', 1), ('G4', 1), ('A4', 4)]
MOTIVO_MAYOR = [('E4', 1), ('G4', 1), ('C5', 2), ('D5', 1), ('C5', 1), ('G4', 2),
                ('E4', 1), ('D4', 1), ('E4', 1), ('G4', 1), ('C5', 4)]


def env(n, ataque, caida):
    t = np.arange(n) / SR
    return np.clip(t / max(ataque, 1e-4), 0, 1) * np.exp(-np.maximum(t - ataque, 0) / max(caida, 1e-4))


def onda(f, n, parciales=((1, 1.0),), vibrato=0.0, desafino=0.0):
    t = np.arange(n) / SR
    fase = 2 * np.pi * f * (1 + desafino) * (t + vibrato * np.sin(2 * np.pi * 5.2 * t) / (2 * np.pi * 5.2))
    return sum(a * np.sin(fase * k) for k, a in parciales)


def pegar(buf, frag, inicio, bucle=True):
    if bucle:
        idx = (inicio + np.arange(len(frag))) % len(buf)
        np.add.at(buf, idx, frag)
    else:
        fin = min(len(buf), inicio + len(frag))
        buf[inicio:fin] += frag[:fin - inicio]


def marimba(f, dur=1.2):
    n = int(dur * SR)
    return (onda(f, n, ((1, 1.0), (3.93, 0.28), (9.2, 0.05))) * env(n, 0.003, 0.32)) * 0.6


def flauta(f, dur):
    n = int(dur * SR)
    tono = onda(f, n, ((1, 1.0), (2, 0.18), (3, 0.06)), vibrato=0.004)
    aire = R.standard_normal(n) * 0.04
    e = np.clip(np.arange(n) / (0.09 * SR), 0, 1) * np.clip((n - np.arange(n)) / (0.18 * SR), 0, 1)
    return (tono + aire) * e * 0.38


def campana(f, dur=3.5):
    n = int(dur * SR)
    return onda(f, n, ((1, 1.0), (2.76, 0.45), (5.4, 0.25), (8.9, 0.1))) * env(n, 0.002, 1.1) * 0.4


def colchon(acorde, dur, brillo=0.25):
    n = int(dur * SR)
    s = np.zeros(n)
    for f in acorde:
        for d in (-0.004, 0.0, 0.005):
            s += onda(f, n, ((1, 1.0), (2, brillo), (3, brillo * 0.4)), desafino=d)
    e = np.clip(np.arange(n) / (1.2 * SR), 0, 1) * np.clip((n - np.arange(n)) / (1.2 * SR), 0, 1)
    return s * e * 0.06


def bajo(f, dur, duro=False):
    n = int(dur * SR)
    parc = ((1, 1.0), (2, 0.5), (3, 0.3), (4, 0.15)) if duro else ((1, 1.0), (2, 0.25))
    return onda(f, n, parc) * env(n, 0.01, dur * 0.6) * 0.5


def taiko(fuerza=1.0):
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    f = 50 + 70 * np.exp(-t / 0.05)
    cuerpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.22)
    golpe = R.standard_normal(n) * env(n, 0.001, 0.02) * 0.3
    return (cuerpo + golpe) * 0.9 * fuerza


def maraca(fuerza=1.0):
    n = int(0.09 * SR)
    ruido = R.standard_normal(n)
    ruido = np.diff(ruido, prepend=0)   # más agudo
    return ruido * env(n, 0.004, 0.03) * 0.12 * fuerza


def metal_oscuro(f, dur):
    """Trompa grave sintética: parciales impares que se abren con el ataque."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    apertura = np.clip(t / 0.25, 0, 1)
    s = sum((0.9 / k) * apertura ** (k * 0.5) * np.sin(2 * np.pi * f * k * t) for k in range(1, 7))
    e = np.clip(t / 0.06, 0, 1) * np.clip((dur - t) / 0.2, 0, 1)
    return s * e * 0.22


def normalizar(s, pico=0.8):
    m = np.max(np.abs(s)) or 1
    return s / m * pico


def compases(bpm, n_compases, tiempos=4):
    pulso = 60 / bpm
    return pulso, int(round(pulso * tiempos * n_compases * SR))


def tocar_motivo(buf, motivo, pulso, inicio_pulso, instrumento, transponer=1.0, bucle=True):
    p = inicio_pulso
    for nota, dur in motivo:
        frag = instrumento(N[nota] * transponer, dur * pulso * 1.05)
        pegar(buf, frag, int(p * pulso * SR), bucle)
        p += dur
    return p


def musica_selva():
    pulso, n = compases(84, 8)
    s = np.zeros(n)
    acordes = [('A3', 'C4', 'E4'), ('F3', 'A3', 'C4'), ('C4', 'E4', 'G4'), ('G3', 'B3', 'D4')]
    for c in range(8):
        ac = acordes[c % 4]
        pegar(s, colchon([N[x] for x in ac], pulso * 4.6), int(c * 4 * pulso * SR))
        pegar(s, bajo(N[ac[0]] / 2, pulso * 2), int(c * 4 * pulso * SR))
        pegar(s, bajo(N[ac[0]] / 2, pulso * 2), int((c * 4 + 2.5) * pulso * SR))
        # Marimba en corcheas con las notas del acorde (patrón que respira)
        for k, paso in enumerate((0, 1, 2, 1, 0, 2, 1, 2)):
            if k in (3, 7) and c % 2:
                continue
            pegar(s, marimba(N[ac[paso]] * 2, 0.9) * 0.55, int((c * 4 + k * 0.5) * pulso * SR))
        for k in range(8):
            pegar(s, maraca(0.6 if k % 2 else 1.0), int((c * 4 + k * 0.5 + 0.02) * pulso * SR))
    # El leitmotiv en la flauta, en la segunda mitad
    tocar_motivo(s, MOTIVO, pulso, 16, flauta)
    return normalizar(s, 0.7)


def musica_santuario():
    pulso, n = compases(60, 6)
    s = np.zeros(n)
    t = np.arange(n) / SR
    largo = n / SR
    ciclico = lambda f: round(f * largo) / largo   # un número entero de ciclos por vuelta: sin chasquido  # noqa: E731
    dron = (np.sin(2 * np.pi * ciclico(N['D2']) * t) + 0.5 * np.sin(2 * np.pi * ciclico(N['A2']) * t)
            + 0.25 * np.sin(2 * np.pi * ciclico(N['D3'] * 1.003) * t))
    dron *= 0.18 * (0.8 + 0.2 * np.sin(2 * np.pi * t / (n / SR)))   # respira una vez por vuelta
    s += dron
    # Campanas sueltas, siempre en el mismo sitio del bucle
    for p, nota in ((0, 'A4'), (3.5, 'E5'), (7, 'D5'), (10, 'C5'), (14.5, 'A4'), (19, 'G4')):
        pegar(s, campana(N[nota]), int(p * pulso * SR))
    # El motivo a medias, muy bajo: la canción que no termina
    tocar_motivo(s, MOTIVO[:6], pulso, 2, lambda f, d: flauta(f * 0.5, d) * 0.5)
    return normalizar(s, 0.6)


def musica_jefe():
    pulso, n = compases(120, 8)
    s = np.zeros(n)
    ost = ['A2', 'A2', 'C3', 'A2', 'D3', 'C3', 'G2', 'E2']
    for c in range(8):
        base = c * 4
        for k in range(8):
            f = N[ost[k]] * (1.0 if c < 4 else 1.0)
            pegar(s, bajo(f, pulso * 0.55, duro=True) * 0.7, int((base + k * 0.5) * pulso * SR))
        for k, fz in ((0, 1.0), (1.5, 0.6), (2, 0.9), (3, 0.6), (3.5, 0.7)):
            pegar(s, taiko(fz), int((base + k) * pulso * SR))
        for k in range(8):
            pegar(s, maraca(0.8), int((base + k * 0.5 + 0.25) * pulso * SR))
    # El motivo en metales oscuros, una octava abajo: es el mismo canto, deformado
    tocar_motivo(s, MOTIVO, pulso, 16, metal_oscuro, transponer=0.5)
    return normalizar(s, 0.8)


def musica_escape():
    pulso, n = compases(150, 8)
    s = np.zeros(n)
    for c in range(8):
        base = c * 4
        for k in range(16):
            pegar(s, maraca(1.0 if k % 4 == 0 else 0.6), int((base + k * 0.25) * pulso * SR))
        for k in (0, 1, 2, 2.5, 3, 3.5):
            pegar(s, taiko(0.8), int((base + k) * pulso * SR))
        for k in range(4):
            pegar(s, bajo(N['A2'] if k % 2 == 0 else N['C3'], pulso * 0.9, duro=True) * 0.6, int((base + k) * pulso * SR))
    tocar_motivo(s, MOTIVO, pulso, 8, lambda f, d: marimba(f, 0.6))
    tocar_motivo(s, MOTIVO, pulso, 24, lambda f, d: marimba(f * 2, 0.6))
    return normalizar(s, 0.8)


def musica_tema():
    """El leitmotiv completo, en mayor, con flauta, marimba y colchón (no hace bucle)."""
    pulso = 60 / 72
    dur = pulso * 32 + 3
    n = int(dur * SR)
    s = np.zeros(n)
    acordes = [('C4', 'E4', 'G4'), ('A3', 'C4', 'E4'), ('F3', 'A3', 'C4'), ('G3', 'B3', 'D4'),
               ('C4', 'E4', 'G4'), ('A3', 'C4', 'E4'), ('F3', 'A3', 'C4'), ('C4', 'E4', 'G4')]
    for c, ac in enumerate(acordes):
        pegar(s, colchon([N[x] for x in ac], pulso * 4.8, brillo=0.3), int(c * 4 * pulso * SR), bucle=False)
        pegar(s, bajo(N[ac[0]] / 2, pulso * 3.5), int(c * 4 * pulso * SR), bucle=False)
        for k in range(4):
            pegar(s, marimba(N[ac[k % 3]] * 2, 1.0) * 0.4, int((c * 4 + k) * pulso * SR), bucle=False)
    tocar_motivo(s, MOTIVO_MAYOR, pulso, 0, marimba, bucle=False)
    tocar_motivo(s, MOTIVO_MAYOR, pulso, 16, flauta, bucle=False)
    pegar(s, campana(N['C5'], 3.0) * 0.8, int(30 * pulso * SR), bucle=False)
    cola = np.clip((n - np.arange(n)) / (2.5 * SR), 0, 1)
    return normalizar(s * cola, 0.75)


PIEZAS = {
    'musica_selva': musica_selva, 'musica_santuario': musica_santuario, 'musica_jefe': musica_jefe,
    'musica_escape': musica_escape, 'musica_tema': musica_tema,
}
