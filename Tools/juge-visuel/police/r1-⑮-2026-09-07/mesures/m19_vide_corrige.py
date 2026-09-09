# -*- coding: utf-8 -*-
"""m19 — CORRECTION de m03 : le plus grand vide contigu des CANONS etait fausse par le liseré
du cadre .tel (present sur TOUTES les lignes) -> il rendait 11 px partout. On borne x a l'interieur.
Contrôle positif : sur le canon VIDE, le grand vide voulu (entre le filet de tete et le message)
                   doit ressortir a plusieurs CENTAINES de px.
Contrôle negatif : sur le canon GARNI, ce meme vide doit etre BEAUCOUP plus petit.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ouvrir(rel):
    im = Image.open(os.path.join(D, rel)).convert('RGB')
    print("OUVERT %-30s taille=%s" % (rel, im.size)); return im

def plus_grand_vide(im, x0, x1, y0, y1, seuil):
    p = im.convert('L').load()
    best = (0, 0, 0); cur = None
    for y in range(y0, y1):
        vide = not any(p[x, y] > seuil for x in range(x0, x1))
        if vide:
            if cur is None: cur = y
        else:
            if cur is not None:
                if y-cur > best[0]: best = (y-cur, cur, y-1)
                cur = None
    if cur is not None and y1-cur > best[0]: best = (y1-cur, cur, y1-1)
    return best

can = ouvrir('etats/inspections-canon.png')
vid = ouvrir('etats/inspections-vide.png')
cap = ouvrir('capture-1080x2400.png')
print()
for nom, im, x0, x1, y0, y1, s, H in (
    ('canon GARNI (corps, x 30..870)', can, 30, 870, 235, 1740, 30, 1752),
    ('canon VIDE  (corps, x 30..870)', vid, 30, 870, 235, 1740, 30, 1752),
    ('CAPTURE (contenu, x 10..1070)',  cap, 10, 1070, 145, 2178, 26, 2400)):
    v = plus_grand_vide(im, x0, x1, y0, y1, s)
    print("  %-32s plus grand vide = %4d px (y %4d..%4d) = %.1f %% de la HAUTEUR D'ECRAN"
          % (nom, v[0], v[1], v[2], 100.0*v[0]/H))
print()
print("CONTROLE POSITIF canon VIDE : le vide voulu doit depasser 300 px -> voir ci-dessus")
print("CONTROLE NEGATIF canon GARNI : il doit etre nettement plus petit -> voir ci-dessus")
