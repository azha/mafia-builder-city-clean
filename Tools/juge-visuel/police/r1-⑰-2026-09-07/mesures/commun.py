# -*- coding: utf-8 -*-
"""Helpers communs — PIL seulement, pas de numpy. Chaque script imprime la taille des images ouvertes."""
import os
from PIL import Image

DOSSIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FICHIERS = {
    'capture':   'capture-1080x2400.png',
    'reference': 'reference-⑰-1080x2102.png',
    'hud':       'hud-canon-1176.png',
    'canon2':    'etats/commissariat-canon.png',
    'vide2':     'etats/commissariat-vide.png',
}

def ouvrir(cle):
    chemin = os.path.join(DOSSIER, FICHIERS[cle])
    im = Image.open(chemin).convert('RGB')
    print('  [ouvert] %-10s %-34s %s' % (cle, FICHIERS[cle], im.size))
    return im

def lum(px):
    """Luminance relative WCAG."""
    def c(v):
        v = v / 255.0
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * c(px[0]) + 0.7152 * c(px[1]) + 0.0722 * c(px[2])

def contraste(a, b):
    la, lb = lum(a), lum(b)
    if la < lb:
        la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)

def mediane_fenetre(im, cx, cy, r=4):
    """Médiane par canal d'une fenêtre (2r+1)^2 — jamais un pixel seul."""
    px = im.load()
    W, H = im.size
    vals = [[], [], []]
    for y in range(max(0, cy - r), min(H, cy + r + 1)):
        for x in range(max(0, cx - r), min(W, cx + r + 1)):
            p = px[x, y]
            for i in range(3):
                vals[i].append(p[i])
    return tuple(sorted(v)[len(v) // 2] for v in vals)

def palette(im, n=8, taille=200):
    """Histogramme quantifie -> n couleurs dominantes avec leur %."""
    pet = im.copy()
    pet.thumbnail((taille, taille * 4))
    q = pet.quantize(colors=n, method=Image.MEDIANCUT)
    pal = q.getpalette()
    total = q.size[0] * q.size[1]
    out = []
    for cnt, idx in sorted(q.getcolors(), reverse=True):
        out.append(((pal[idx*3], pal[idx*3+1], pal[idx*3+2]), 100.0 * cnt / total))
    return out

def bbox_encre(im, x0, y0, x1, y1, seuil, mode='clair'):
    """bbox de l'encre dans une zone. mode 'clair' : pixels dont la luminance 0-255 > seuil."""
    px = im.load()
    mnx, mny, mxx, mxy, n = 10**9, 10**9, -1, -1, 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = px[x, y]
            l = (r * 299 + g * 587 + b * 114) // 1000
            ok = (l > seuil) if mode == 'clair' else (l < seuil)
            if ok:
                n += 1
                if x < mnx: mnx = x
                if y < mny: mny = y
                if x > mxx: mxx = x
                if y > mxy: mxy = y
    if n == 0:
        return None, 0
    return (mnx, mny, mxx, mxy), n

def profil_lignes(im, x0, x1, y0, y1, seuil=40):
    """Pour chaque y : nombre de pixels dont la luminance > seuil sur [x0,x1)."""
    px = im.load()
    out = []
    for y in range(y0, y1):
        n = 0
        for x in range(x0, x1):
            r, g, b = px[x, y]
            if (r * 299 + g * 587 + b * 114) // 1000 > seuil:
                n += 1
        out.append((y, n))
    return out

def profil_colonnes(im, x0, x1, y0, y1, seuil=40):
    px = im.load()
    out = []
    for x in range(x0, x1):
        n = 0
        for y in range(y0, y1):
            r, g, b = px[x, y]
            if (r * 299 + g * 587 + b * 114) // 1000 > seuil:
                n += 1
        out.append((x, n))
    return out

def hx(c):
    return '#%02x%02x%02x' % tuple(c)
