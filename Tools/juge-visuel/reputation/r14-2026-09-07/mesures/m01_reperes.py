"""m01 — reperes structurels : filets or du cadre, rails, bandeau, dock.
Controle positif : la largeur du bandeau doit etre 1080 (pleine largeur) sur les captures.
Controle negatif : la reference n'a PAS de dock du shell (elle a une evocation a 300 CSS).
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

def lignes_or(im, nom):
    px = im.load(); W, H = im.size
    print(f"\n== {nom} : lignes a forte densite d'OR (r>130, r-b>50, g entre r et b) ==")
    runs = []
    cur = None
    for y in range(H):
        n = 0
        for x in range(W):
            r, g, b = px[x, y]
            if r > 130 and (r - b) > 50 and b < 120 and g < r and g > b:
                n += 1
        if n >= W * 0.5:
            if cur is None: cur = [y, y, n]
            else: cur[1] = y; cur[2] = max(cur[2], n)
        else:
            if cur is not None: runs.append(tuple(cur)); cur = None
    if cur is not None: runs.append(tuple(cur))
    for a, b, n in runs:
        print(f"   or pleine largeur y={a}..{b}  (h={b-a+1}, max {n}/{W} px)")
    return runs

def colonnes_or(im, nom, y0, y1):
    px = im.load(); W, H = im.size
    print(f"\n== {nom} : colonnes a forte densite d'OR sur y={y0}..{y1} ==")
    runs = []; cur = None
    n_lignes = y1 - y0 + 1
    for x in range(W):
        n = 0
        for y in range(y0, y1 + 1):
            r, g, b = px[x, y]
            if r > 130 and (r - b) > 50 and b < 120 and g < r and g > b:
                n += 1
        if n >= n_lignes * 0.6:
            if cur is None: cur = [x, x, n]
            else: cur[1] = x; cur[2] = max(cur[2], n)
        else:
            if cur is not None: runs.append(tuple(cur)); cur = None
    if cur is not None: runs.append(tuple(cur))
    for a, b, n in runs:
        print(f"   rail x={a}..{b} (l={b-a+1}, max {n}/{n_lignes})")
    return runs

for f, nom in [('../reference-1080x2102.png','REF'),
               ('../capture-1080x2400.png','JEU2400'),
               ('../capture-1080x1920.png','JEU1920')]:
    im = ouvrir(f)
    r = lignes_or(im, nom)
    if len(r) >= 2:
        colonnes_or(im, nom, r[0][1] + 40, r[-1][0] - 40)
