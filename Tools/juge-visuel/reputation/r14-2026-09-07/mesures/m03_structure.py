"""m03 — structure verticale interne du cadre : bords des panneaux, en OFFSET depuis le filet haut.
Methode : profil de luminance mediane par ligne sur une bande de colonnes qui traverse
les liseres des panneaux mais evite le texte (x 30..70 = marge interieure gauche + lisere).
Un lisere de panneau = pic local de la mediane.
Controle positif : le filet or sous l'enseigne doit ressortir aux offsets deja connus (m01).
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

def bords_panneaux(im, y0, y1, xa, xb, nom, ref_y, seuil):
    px = im.load()
    prof = []
    for y in range(y0, y1 + 1):
        prof.append(mediane([lum(px[x, y]) for x in range(xa, xb + 1)]))
    # runs au-dessus du seuil
    runs = []; cur = None
    for i, v in enumerate(prof):
        if v >= seuil:
            if cur is None: cur = [i, i]
            else: cur[1] = i
        else:
            if cur is not None: runs.append(tuple(cur)); cur = None
    if cur is not None: runs.append(tuple(cur))
    print(f"\n== {nom} : bandes claires (mediane>{seuil}) sur colonnes x{xa}..{xb}, offsets depuis y={ref_y} ==")
    for a, b in runs:
        ya, yb = y0 + a, y0 + b
        print(f"   y={ya}..{yb}  off={ya-ref_y}..{yb-ref_y}  h={b-a+1}  pic={max(prof[a:b+1]):.1f}")
    return runs

im = ouvrir('../reference-1080x2102.png')
bords_panneaux(im, 455, 2075, 30, 70, 'REF', 452, 33)
im = ouvrir('../capture-1080x2400.png')
bords_panneaux(im, 486, 2105, 27, 67, 'JEU2400', 482, 33)
im = ouvrir('../capture-1080x1920.png')
bords_panneaux(im, 165, 1625, 27, 67, 'JEU1920', 162, 33)
