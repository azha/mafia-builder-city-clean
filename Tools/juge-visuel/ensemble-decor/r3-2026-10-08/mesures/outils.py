"""Boîte à outils commune du juge d'ensemble r3.
Toute fonction qui ouvre une image IMPRIME sa taille (exigence du mandat).
Échelle du dossier : référence 1080 px = 300 px CSS = x3,6 ; capture 1080 px = 300 px CSS = x3,6.
=> 1 px CSS = 3,6 px d'image DES DEUX COTES. En X, rapport capture/référence = 1,000.
En Y il n'y a PAS de rapport (2102 vs 2400/1920) : on ne compare que des grandeurs invariantes.
"""
import os
from PIL import Image

REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r3-2026-10-08/reference"
CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-r2"

_ouvertes = set()


def ouvrir(chemin, taire=False):
    im = Image.open(chemin).convert("RGB")
    cle = (chemin, im.size)
    if cle not in _ouvertes and not taire:
        print("[OUVRE] %-58s %dx%d" % (os.path.basename(chemin), im.size[0], im.size[1]))
        _ouvertes.add(cle)
    return im


def ref(nom):
    return ouvrir(os.path.join(REF, nom))


def cap(nom):
    return ouvrir(os.path.join(CAP, nom))


def mediane(im, x0, y0, x1, y1):
    """Médiane par canal d'une fenêtre (aplat). Jamais un pixel seul."""
    px = im.load()
    r, g, b = [], [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = px[x, y]
            r.append(p[0]); g.append(p[1]); b.append(p[2])
    r.sort(); g.sort(); b.sort()
    n = len(r) // 2
    return (r[n], g[n], b[n])


def lum(c):
    """Luminance relative sRGB (WCAG)."""
    def f(v):
        v = v / 255.0
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])


def contraste(c1, c2):
    l1, l2 = lum(c1), lum(c2)
    if l1 < l2:
        l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)


def dist(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))


def bbox_encre(im, x0, y0, x1, y1, fond, seuil=40):
    """bbox de l'encre dans un rect : pixels qui s'écartent du fond de plus de `seuil`
    (max par canal). Renvoie None si rien. Mesure l'ENCRE, pas une boîte supposée."""
    px = im.load()
    mnx, mny, mxx, mxy = 10**9, 10**9, -1, -1
    n = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            if dist(px[x, y], fond) > seuil:
                n += 1
                if x < mnx: mnx = x
                if x > mxx: mxx = x
                if y < mny: mny = y
                if y > mxy: mxy = y
    if mxx < 0:
        return None
    return (mnx, mny, mxx, mxy, n)


def profil_lignes(im, x0, y0, x1, y1, fond, seuil=40):
    """Pour chaque ligne du rect, le nombre de px d'encre. Sert au rythme vertical
    et à la hauteur de capitale."""
    px = im.load()
    out = []
    for y in range(y0, y1):
        n = 0
        for x in range(x0, x1):
            if dist(px[x, y], fond) > seuil:
                n += 1
        out.append((y, n))
    return out


def bandes(profil, mini=1):
    """Suites de lignes consécutives porteuses d'encre => (y0, y1, hauteur)."""
    out = []
    deb = None
    for y, n in profil:
        if n >= mini and deb is None:
            deb = y
        elif n < mini and deb is not None:
            out.append((deb, y - 1, y - deb))
            deb = None
    if deb is not None:
        out.append((deb, profil[-1][0], profil[-1][0] - deb + 1))
    return out


def palette(im, boite=None, k=8):
    """Histogramme quantifié : les k couleurs qui couvrent le plus d'aire, en %."""
    im2 = im.crop(boite) if boite else im
    im2 = im2.resize((im2.width // 4, im2.height // 4))
    q = im2.quantize(colors=k, method=Image.MEDIANCUT).convert("RGB")
    cols = q.getcolors(10**7)
    total = sum(c for c, _ in cols)
    cols.sort(reverse=True)
    return [(rgb, 100.0 * c / total) for c, rgb in cols[:k]]


PX_CSS = 3.6  # px image par px CSS, des deux côtés


def css(px_image):
    return px_image / PX_CSS
