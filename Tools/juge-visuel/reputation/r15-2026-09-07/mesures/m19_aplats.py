"""m19 — aplats et jetons : mediane d'une fenetre 9x9 a >=3 px de tout bord.
Controle positif : le meme jeton lu dans deux fenetres eloignees du MEME aplat doit coincider.
Controle negatif : une fenetre a cheval sur un bord doit rendre une valeur INTERMEDIAIRE
                   (donc differente des deux) -> preuve que la sonde n'est pas insensible.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
def med(im,x,y,r=4): return mediane_couleur(im,x-r,y-r,x+r,y+r)
# (nom, (x,y) ref, (x,y) jeu2400)
POINTS=[
 ("fond de cadre, bande haute (x=150)",      (150,470),  (150,500)),
 ("fond de cadre, sous le CTA",              (540,2060), (540,2050)),
 ("panneau d'enseigne (titre)",              (150,540),  (150,560)),
 ("boite de compteur (fond)",                (100,712),  (100,738)),
 ("panneau elastique (fond)",                (540,1600), (540,1530)),
 ("carte portrait (fond)",                   (110,960),  (110,990)),
 ("torse (sombre)",                          (250,1400), (250,1430)),
 ("peau",                                    (290,1160), (290,1180)),
 ("panneau bas (fond)",                      (540,1700), (540,1640)),
 ("boite du CTA (fond)",                     (540,2000), (540,1925)),
 ("tuile 1 (fond)",                          (700,1050), (700,1040)),
 ("colonne droite, entre tuiles",            (700,1110), (700,1100)),
]
r=ouvrir('reference-1080x2102.png'); j=ouvrir('capture-1080x2400.png')
print(f"{'grandeur':40s} {'REF':>18s} {'JEU':>18s}  dmax")
tot=0; n=0
for nom,(rx,ry),(jx,jy) in POINTS:
    a=med(r,rx,ry); b=med(j,jx,jy)
    d=max(abs(a[i]-b[i]) for i in range(3)); tot+=d; n+=1
    print(f"{nom:40s} {str(a):>18s} {str(b):>18s}  {d}")
print(f"  ecart max moyen = {tot/n:.1f}/255")
print()
# jetons d'accent
def bloc(im,x0,y0,x1,y1): return mediane_couleur(im,x0,y0,x1,y1)
print("  filet or du cadre (coeur)     REF", bloc(r,300,453,700,453), " JEU", bloc(j,300,483,700,483))
print("  cyan du chiffre (coeur)       REF", bloc(r,196,740,200,746), " JEU", bloc(j,196,764,200,770))
print("  vert 'Il vous ecoute'         REF", bloc(r,205,1381,215,1385), " JEU", bloc(j,180,1470,190,1474))
print("  creme du col                  REF", bloc(r,275,1265,285,1272), " JEU", bloc(j,238,1330,248,1337))
print("  [ctrl negatif] fenetre a cheval sur le filet or (ref y451..455) :", bloc(r,300,450,700,456))
