"""El mural vivo de la sala de los espejos: la leyenda de la gema, animada (VideoTexture, semanas 3 y 4).

Cuatro escenas pintadas sobre estuco, como el mural de piedra, que se funden una en otra:
1. el pueblo adora al sol; 2. un sacerdote toma la gema y se vuelve piedra;
3. alguien con el brazalete la sella (destello azul y dorado); 4. el sol vuelve a salir por el este.

Genera los cuadros con PIL y los codifica con ffmpeg en public/videos/leyenda.mp4 (H.264, sin sonido:
el canto del mural es un PositionalAudio aparte). Todo con código, sin imágenes descargadas.
Uso: python tools/video/video_leyenda.py
"""
import math
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SALIDA = os.path.join(RAIZ, 'public', 'videos', 'leyenda.mp4')
W, H, FPS = 640, 360, 24
ESCENA = 3.5          # segundos por escena
FUNDIDO = 0.6
TOTAL = ESCENA * 4

ESTUCO = (201, 180, 140)
ROJO, OCRE, AZUL, ORO, PIEDRA, OSCURO = (165, 69, 47), (201, 138, 58), (62, 110, 142), (232, 179, 62), (110, 104, 96), (78, 61, 46)


def textura_estuco():
    """Fondo de estuco con manchas y grietas (se dibuja una vez)."""
    img = Image.new('RGB', (W, H), ESTUCO)
    d = ImageDraw.Draw(img)
    import random
    r = random.Random(7)
    for _ in range(900):
        x, y, s = r.randint(0, W), r.randint(0, H), r.randint(2, 9)
        k = r.randint(-14, 10)
        d.ellipse((x, y, x + s, y + s), fill=tuple(max(0, min(255, c + k)) for c in ESTUCO))
    for _ in range(6):
        x, y = r.randint(0, W), r.randint(0, H)
        for _ in range(8):
            x2, y2 = x + r.randint(-30, 30), y + r.randint(5, 30)
            d.line((x, y, x2, y2), fill=(150, 130, 100), width=1)
            x, y = x2, y2
    # Marco pintado
    d.rectangle((6, 6, W - 7, H - 7), outline=OSCURO, width=6)
    d.rectangle((16, 16, W - 17, H - 17), outline=ORO, width=2)
    return img.filter(ImageFilter.SMOOTH)


def sol(d, cx, cy, r, t, color=ORO):
    for i in range(12):
        a = i * math.tau / 12 + t * 0.4
        r1, r2 = r * 1.25, r * (1.7 + 0.15 * math.sin(t * 3 + i))
        d.line((cx + math.cos(a) * r1, cy + math.sin(a) * r1, cx + math.cos(a) * r2, cy + math.sin(a) * r2), fill=color, width=5)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)
    d.ellipse((cx - r * 0.55, cy - r * 0.55, cx + r * 0.55, cy + r * 0.55), fill=(255, 226, 140))


def figura(d, cx, base, alto, color, brazos=0.0, tocado=True):
    """Persona pintada al estilo del mural: túnica trapezoidal, cabeza redonda y brazos que se levantan."""
    a = alto
    d.polygon([(cx - a * 0.22, base), (cx + a * 0.22, base), (cx + a * 0.12, base - a * 0.62), (cx - a * 0.12, base - a * 0.62)], fill=color)
    d.ellipse((cx - a * 0.11, base - a * 0.86, cx + a * 0.11, base - a * 0.64), fill=color)
    if tocado:
        d.polygon([(cx - a * 0.14, base - a * 0.8), (cx, base - a * 1.0), (cx + a * 0.14, base - a * 0.8)], fill=OSCURO)
    ang = math.radians(20 + 120 * brazos)
    for s in (-1, 1):
        x0, y0 = cx + s * a * 0.1, base - a * 0.56
        d.line((x0, y0, x0 + s * math.sin(ang) * a * 0.32, y0 + math.cos(ang) * a * 0.32 * -1 + a * 0.1), fill=color, width=max(3, int(a * 0.06)))


def templo(d, cx, base, ancho):
    for i in range(5):
        w = ancho * (1 - i * 0.16)
        d.rectangle((cx - w / 2, base - (i + 1) * ancho * 0.1, cx + w / 2, base - i * ancho * 0.1), fill=(150, 125, 95), outline=OSCURO)
    d.rectangle((cx - ancho * 0.05, base - ancho * 0.5, cx + ancho * 0.05, base), fill=OSCURO)


def escena(i, t, base_img):
    img = base_img.copy()
    d = ImageDraw.Draw(img)
    suelo = H - 70
    d.rectangle((24, suelo, W - 24, suelo + 6), fill=OSCURO)
    if i == 0:      # El pueblo adora al sol
        sol(d, W / 2, 105, 42 + 4 * math.sin(t * 4), t)
        for k, x in enumerate((150, 230, 410, 490)):
            figura(d, x, suelo, 120, ROJO, brazos=0.6 + 0.4 * math.sin(t * 3 + k))
        figura(d, 320, suelo, 140, OCRE, brazos=1.0)
    elif i == 1:    # Un sacerdote toma la gema y se vuelve piedra
        u = min(1.0, t / (ESCENA * 0.8))
        gema_y = 120 - 20 * u
        d.ellipse((300, gema_y - 18, 340, gema_y + 18), fill=ORO, outline=(255, 240, 180), width=3)
        for k in range(8):   # la gema llama
            a = k * math.tau / 8 + t * 2
            d.line((320, gema_y, 320 + math.cos(a) * (40 + 10 * math.sin(t * 5)), gema_y + math.sin(a) * (40 + 10 * math.sin(t * 5))), fill=ORO, width=2)
        col = tuple(int(OCRE[c] + (PIEDRA[c] - OCRE[c]) * u) for c in range(3))
        figura(d, 320, suelo, 150, col, brazos=0.9)
        for x in (170, 470):
            figura(d, x, suelo, 110, ROJO, brazos=0.1)
        if u > 0.6:      # grietas: ya es piedra
            for k in range(4):
                d.line((300 + k * 10, suelo - 40 - k * 15, 312 + k * 9, suelo - 70 - k * 15), fill=OSCURO, width=2)
    elif i == 2:    # Alguien con el brazalete la sella
        u = min(1.0, t / (ESCENA * 0.7))
        figura(d, 240, suelo, 140, AZUL, brazos=u)
        hx, hy = 240 + 50, suelo - 140 * 0.56 - 40 * u
        d.ellipse((hx - 9, hy - 9, hx + 9, hy + 9), outline=ORO, width=4)       # el brazalete
        gx = 430 - 140 * u
        gy = 130 + 40 * u
        d.ellipse((gx - 16, gy - 16, gx + 16, gy + 16), fill=ORO)
        if u >= 1.0:     # destello azul y dorado
            k = (t - ESCENA * 0.7) / (ESCENA * 0.3)
            r = 30 + 120 * k
            d.ellipse((hx - r, hy - r, hx + r, hy + r), outline=(120, 200, 255), width=max(1, int(8 * (1 - k))))
            d.ellipse((hx - r * 0.6, hy - r * 0.6, hx + r * 0.6, hy + r * 0.6), outline=ORO, width=max(1, int(6 * (1 - k))))
        figura(d, 470, suelo, 150, PIEDRA, brazos=0.9)   # el guardián de piedra
    else:           # El sol vuelve al este
        u = min(1.0, t / (ESCENA * 0.9))
        templo(d, 220, suelo, 260)
        sol(d, 470, 220 - 140 * u, 36, t, color=(255, 190, 90))
        for k, x in enumerate((360, 400)):
            figura(d, x, suelo, 70, ROJO if k == 0 else AZUL, brazos=0.3)
    return img


def buscar_ffmpeg():
    ruta = shutil.which('ffmpeg')
    if ruta:
        return ruta
    winget = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe')
    return winget if os.path.exists(winget) else None


def main():
    ffmpeg = buscar_ffmpeg()
    if not ffmpeg:
        print('[video] AVISO: sin ffmpeg no se puede codificar el mural vivo; se conserva el que hay', file=sys.stderr)
        return
    base = textura_estuco()
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        n = int(TOTAL * FPS)
        for f in range(n):
            t = f / FPS
            i = int(t // ESCENA) % 4
            tl = t - i * ESCENA
            img = escena(i, tl, base)
            # Fundido con la escena siguiente al final de cada una (el bucle también empalma)
            if tl > ESCENA - FUNDIDO:
                k = (tl - (ESCENA - FUNDIDO)) / FUNDIDO
                img = Image.blend(img, escena((i + 1) % 4, 0.0, base), k)
            img.save(os.path.join(tmp, f'c{f:04d}.png'))
        subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(tmp, 'c%04d.png'),
                        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', SALIDA], check=True)
    print(f'[video] {SALIDA} ({os.path.getsize(SALIDA) / 1024:.0f} KB, {TOTAL:.0f} s)')


if __name__ == '__main__':
    main()
