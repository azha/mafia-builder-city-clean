# -*- coding: utf-8 -*-
"""Helpers communs du juge r8. Toute grandeur est ramenee en px CSS.
Echelle : canon 1176 px = 392 CSS => x3.000 ; captures 1080 px = 392 CSS => x2.755102."""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FICHIERS = {
    'canon':    ('ecran-canon.png',                   3.000000),
    'j1920':    ('capture-fiche-1080x1920.png',       1080/392.0),
    'j2400':    ('capture-fiche-1080x2400.png',       1080/392.0),
    'd2400':    ('capture-district-1080x2400.png',    1080/392.0),
    't2400':    ('temoin-dock-famille-1080x2400.png', 1080/392.0),
}

_cache = {}

def ouvrir(cle, taire=False):
    if cle not in _cache:
        nom, f = FICHIERS[cle]
        im = Image.open(os.path.join(D, nom)).convert('RGB')
        _cache[cle] = (im, f)
        if not taire:
            print("  [ouvert] %-6s %-34s %dx%d  facteur x%.6f" % (cle, nom, im.size[0], im.size[1], f))
    return _cache[cle]

def lum(c):
    """Luminance relative WCAG."""
    def v(x):
        x = x/255.0
        return x/12.92 if x <= 0.03928 else ((x+0.055)/1.055)**2.4
    return 0.2126*v(c[0]) + 0.7152*v(c[1]) + 0.0722*v(c[2])

def contraste(a, b):
    la, lb = lum(a), lum(b)
    if la < lb: la, lb = lb, la
    return (la+0.05)/(lb+0.05)

def L(c):
    """Clarte perceptuelle 0..100 (L* de CIELAB sur D65)."""
    y = lum(c)
    return 116*(y**(1/3.0)) - 16 if y > 0.008856 else 903.3*y

def mediane(vals):
    v = sorted(vals)
    n = len(v)
    if n == 0: return None
    return v[n//2] if n % 2 else (v[n//2-1]+v[n//2])/2.0

def med_fenetre(im, cx, cy, r=3):
    """Mediane par canal d'une fenetre carree (2r+1)."""
    px = im.load()
    W, H = im.size
    canaux = [[], [], []]
    for y in range(max(0,cy-r), min(H, cy+r+1)):
        for x in range(max(0,cx-r), min(W, cx+r+1)):
            c = px[x, y]
            for k in range(3): canaux[k].append(c[k])
    return tuple(int(round(mediane(canaux[k]))) for k in range(3))

def mode_couleur(pixels):
    from collections import Counter
    c = Counter(pixels)
    if not c: return None, 0
    v, n = c.most_common(1)[0]
    return v, n/float(len(pixels))

def dist_max(a, b):
    return max(abs(a[i]-b[i]) for i in range(3))

# jetons du :root de hud-brennar.html
JETONS = {
    'encre':  (0x0b,0x10,0x16), 'panneau':(0x11,0x18,0x23), 'lisere':(0x2a,0x36,0x48),
    'creme':  (0xea,0xe0,0xc8), 'creme-2':(0xb9,0xad,0x92),
    'or':     (0xd9,0xab,0x4e), 'or-vif': (0xf2,0xc9,0x6b), 'laiton':(0xb0,0x8d,0x3e),
    'braise': (0xe0,0x66,0x4a), 'cyan':   (0x7f,0xd4,0xd9),
}
