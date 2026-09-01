# -*- coding: utf-8 -*-
"""01 — REPÈRES : bornes des grands blocs, dans les deux images, par détection de bord.
Toutes les coordonnées sont ABSOLUES dans l'image.
Contrôle positif  : largeur intérieure du cerne = 290 px CSS des deux côtés (300 - 2x5 d'inset).
Contrôle négatif  : la HAUTEUR du cerne DOIT différer (452 vs 523 px CSS) — un instrument qui
                    les trouverait égales ne mesurerait pas ce qu'on croit."""
from PIL import Image

REF = '/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png'
CAP = '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png'

def gold(p):
    r, g, b = p[:3]
    return r > 110 and r - b > 55 and g > 80 and b < 120

def lisere(p):
    r, g, b = p[:3]
    return b - r > 10 and 25 < b < 95 and 12 < r < 65

def runs(vals, y0):
    out, s = [], None
    for i, v in enumerate(vals):
        if v and s is None: s = i
        elif not v and s is not None:
            out.append((s + y0, i - 1 + y0)); s = None
    if s is not None: out.append((s + y0, len(vals) - 1 + y0))
    return out

def scan_col(im, x, y0, y1, pred):
    px = im.load(); return runs([pred(px[x, y]) for y in range(y0, y1)], y0)

def scan_row(im, y, x0, x1, pred):
    px = im.load(); return runs([pred(px[x, y]) for x in range(x0, x1)], x0)

def thin(rs, m=9): return [r for r in rs if r[1] - r[0] < m]

for nom, path, sc, ytop in (('REF', REF, 3.0, 360), ('CAP', CAP, 3.6, 0)):
    im = Image.open(path).convert('RGB'); W, H = im.size
    print('=' * 76); print(nom, path.split('/')[-1], 'taille=', im.size, 'echelle x%.1f' % sc)
    ymid = (ytop + H) // 2
    rg = thin(scan_row(im, ymid, 0, W, gold))
    x0, x1 = rg[0][0], rg[-1][1]
    print(' cerne x: %d..%d  = %d px = %.1f CSS' % (x0, x1, x1 - x0 + 1, (x1 - x0 + 1) / sc))
    cg = thin(scan_col(im, x0 + 30, ytop, H, gold))
    print(' bandes or colonne x=%d :' % (x0 + 30), cg)
    cy0, cy1 = cg[0][0], cg[-1][1]
    print(' cerne y: %d..%d = %d px = %.1f CSS' % (cy0, cy1, cy1 - cy0 + 1, (cy1 - cy0 + 1) / sc))
    xmid = W // 2
    print(' bandes or colonne x=%d :' % xmid, scan_col(im, xmid, ytop, H, gold))
    print(' bords lisere colonne x=%d :' % (x0 + 45), thin(scan_col(im, x0 + 45, ytop, H, lisere), 12))
    print(' bords lisere colonne x=%d :' % (x1 - 45), thin(scan_col(im, x1 - 45, ytop, H, lisere), 12))
