"""m10 — GARDE ANTI-VACUITE de m09 : profil ABSOLU (pas de soustraction de mediane).
Un halo LARGE et uniforme ferait monter la mediane et s'annulerait dans m09 ; ici on lit la
luminance BRUTE le long d'une ligne horizontale passant par le milieu du chiffre, et d'une
ligne verticale passant par son axe, jusqu'aux bords de la boite.
Controle positif : dans la REFERENCE la luminance doit DECROITRE en s'eloignant du chiffre.
Controle negatif : la meme lecture dans une rangee sans encre doit etre PLATE.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

CAS = [
 ('reference-1080x2102.png','REF',   204, 743, (55,355),(706,815)),
 ('capture-1080x2400.png','JEU2400', 203, 767, (52,354),(732,841)),
 ('capture-1080x1920.png','JEU1920', 203, 535, (52,354),(499,609)),
]
for nom,lab,xc,yc,(cx0,cx1),(by0,by1) in CAS:
    im=ouvrir(nom); p=im.load()
    print(f"--- {lab} : rangee y={yc} (milieu du chiffre), luminance BRUTE ---")
    ligne=[(x, lum(p[x,yc])) for x in range(cx0,cx1+1)]
    # a droite du chiffre : x = 240..340 (jeu) / 245..350 (ref)
    ech=[x for x in range(xc+34, cx1-2, 6)]
    print("   " + " ".join(f"x{x}={lum(p[x,yc]):.1f}" for x in ech[:16]))
    print(f"--- {lab} : colonne x={xc}, luminance BRUTE, de haut de boite au bas du chiffre ---")
    print("   " + " ".join(f"y{y}={lum(p[xc,y]):.1f}" for y in range(by0, yc-14, 4)))
    print(f"   couleurs : haut de boite p[{xc},{by0+2}]={p[xc,by0+2]}  a 20px du chiffre p[{xc},{yc-38}]={p[xc,max(by0,yc-38)]}  a 4px p[{xc},{yc-22}]={p[xc,yc-22]}")
    # ctrl negatif : rangee sans encre (2 px sous le bord haut interieur)
    r=[lum(p[x,by0+3]) for x in range(cx0,cx1+1)]
    print(f"   [ctrl negatif] rangee sans encre y={by0+3} : min={min(r):.1f} max={max(r):.1f} (plat attendu)")
    print()
