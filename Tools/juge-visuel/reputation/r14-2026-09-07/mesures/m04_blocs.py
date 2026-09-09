"""m04 — bornes des 5 blocs du cadre, par le FOND des panneaux (pas par les liseres).
Methode : sur une colonne de sonde interieure a chaque panneau mais hors texte,
la mediane de luminance change de palier entre 'fond de cadre' et 'fond de panneau'.
On detecte les paliers par derivee sur la mediane lissee (fenetre 3).
Controle positif : la borne haute du panneau d'enseigne doit tomber juste au-dessus du titre.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

def paliers(im, xa, xb, y0, y1, nom, ref_y, delta=1.5):
    px = im.load()
    prof = [mediane([lum(px[x, y]) for x in range(xa, xb + 1)]) for y in range(y0, y1 + 1)]
    liss = [mediane(prof[max(0,i-1):i+2]) for i in range(len(prof))]
    print(f"\n== {nom} : sauts de palier > {delta} sur x{xa}..{xb} (offsets / y={ref_y}) ==")
    for i in range(1, len(liss)):
        d = liss[i] - liss[i-1]
        if abs(d) >= delta:
            print(f"   y={y0+i:5d}  off={y0+i-ref_y:5d}   {liss[i-1]:6.1f} -> {liss[i]:6.1f}  ({d:+.1f})")

im = ouvrir('../reference-1080x2102.png')
paliers(im, 40, 62, 456, 2074, 'REF  (marge int. gauche)', 452)
im = ouvrir('../capture-1080x2400.png')
paliers(im, 37, 59, 487, 2104, 'JEU2400', 482)
im = ouvrir('../capture-1080x1920.png')
paliers(im, 37, 59, 167, 1624, 'JEU1920', 162)
