# -*- coding: utf-8 -*-
"""m06 — y a-t-il des PANNEAUX (cartes .dist) dans la capture ? seuil BAS pour attraper un bord #ffffff24.
Le canon de serie 2 dessine 2 cartes + 1 bandeau pointille + 1 CTA, tous a bord clair sur toute leur largeur.
Contrôle positif : sur le CANON, la ligne y=265 (bord haut de la carte Verge-A) doit rendre un long segment.
Contrôle negatif : sur le CANON, la ligne y=660 (entre les deux cartes) doit rendre un segment court/nul.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ouvrir(rel):
    im = Image.open(os.path.join(D, rel)).convert('RGB')
    print("OUVERT %-30s taille=%s" % (rel, im.size)); return im

def plus_long_segment(px, y, x0, x1, seuil, trou=4):
    best = 0; cur = 0; gap = 0
    for x in range(x0, x1+1):
        if px[x, y] > seuil:
            cur += 1 + gap; gap = 0
        else:
            gap += 1
            if gap > trou:
                best = max(best, cur); cur = 0; gap = 0
    return max(best, cur)

can = ouvrir('etats/inspections-canon.png'); gc = can.convert('L'); pc = gc.load()
cap = ouvrir('capture-1080x2400.png');       gk = cap.convert('L'); pk = gk.load()

# --- fond de reference de chaque image (mediane d'une fenetre franchement vide)
def med(px, x0, y0, x1, y1):
    v = sorted(px[x, y] for y in range(y0, y1) for x in range(x0, x1))
    return v[len(v)//2]
fc = med(pc, 700, 1150, 860, 1190)
fk = med(pk, 700, 1300, 1000, 1500)
print("fond canon(L)=%d  fond capture(L)=%d" % (fc, fk))
SC = fc + 8; SK = fk + 8
print("seuils bas : canon>%d  capture>%d" % (SC, SK))
print()
print("CONTROLE POSITIF canon y=265 (bord haut carte Verge-A) : segment le plus long = %d px (sur 822 possibles)"
      % plus_long_segment(pc, 265, 30, 870, SC))
print("CONTROLE NEGATIF canon y=660 (entre les deux cartes)    : segment le plus long = %d px"
      % plus_long_segment(pc, 660, 30, 870, SC))
print()
print("== CANON : lignes ou un segment >= 400 px (0,44 largeur) existe (bords de panneaux) ==")
n = 0
for y in range(240, 1740, 1):
    L = plus_long_segment(pc, y, 30, 870, SC)
    if L >= 400: n += 1
print("   %d lignes sur 1500 portent un segment >= 400 px" % n)
print()
print("== CAPTURE (zone de contenu y=150..2200) : lignes ou un segment >= 480 px (0,44 largeur) ==")
m = 0; exemples = []
for y in range(150, 2200, 1):
    L = plus_long_segment(pk, y, 20, 1060, SK)
    if L >= 480:
        m += 1
        if len(exemples) < 12: exemples.append((y, L))
print("   %d lignes sur 2050 portent un segment >= 480 px" % m)
for y, L in exemples: print("     y=%4d L=%d" % (y, L))
print()
print("== CAPTURE : le plus long segment de CHAQUE ligne, resume par tranche de 100 px ==")
for y0 in range(150, 2200, 100):
    mx = max(plus_long_segment(pk, y, 20, 1060, SK) for y in range(y0, min(y0+100, 2200)))
    print("   y %4d..%-4d  max segment = %4d px" % (y0, y0+99, mx))
