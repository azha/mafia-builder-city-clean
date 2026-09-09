"""m05 — localisation des 3 boites de compteur (les .fen) par leur LISERE.
Methode : dans la bande de la rangee de compteurs, profil de luminance mediane par COLONNE ;
un lisere vertical = pic. On prend les 6 pics (2 par boite) et on erode de 3 px.
Controle positif : les 3 boites doivent avoir des largeurs egales a +-2 px dans la REFERENCE.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

def boites(im, y0, y1, nom):
    px = im.load(); W = im.size[0]
    prof = [mediane([lum(px[x, y]) for y in range(y0, y1 + 1)]) for x in range(W)]
    base = mediane(prof)
    seuil = base + 6
    runs = []; cur = None
    for x in range(W):
        if prof[x] >= seuil:
            if cur is None: cur = [x, x]
            else: cur[1] = x
        else:
            if cur is not None: runs.append(tuple(cur)); cur = None
    if cur is not None: runs.append(tuple(cur))
    print(f"\n== {nom} : y={y0}..{y1}, fond={base:.1f}, seuil={seuil:.1f} ==")
    for a, b in runs:
        print(f"   colonne claire x={a}..{b} (l={b-a+1}) pic={max(prof[a:b+1]):.1f}")
    return runs

im = ouvrir('../reference-1080x2102.png')
boites(im, 705, 812, 'REF rangee compteurs')
im = ouvrir('../capture-1080x2400.png')
boites(im, 731, 837, 'JEU2400 rangee compteurs')
im = ouvrir('../capture-1080x1920.png')
boites(im, 411, 517, 'JEU1920 rangee compteurs')
