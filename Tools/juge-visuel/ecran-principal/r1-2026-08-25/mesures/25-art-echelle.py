# -*- coding: utf-8 -*-
"""L'art de district est-il a la MEME echelle dans les deux captures ? (appariement de lignes)"""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
C=ouvrir(D+'capture-1080x1920.png'); C2=ouvrir(D+'capture-1080x2400.png')
p1=C.load(); p2=C2.load()
X0,X1=60,1020
def ligne(px,y): return [lum(px[x,y]) for x in range(X0,X1)]
def ecart(a,b): return sum(abs(a[i]-b[i]) for i in range(len(a)))/len(a)
for y in (600, 800, 1000, 1150):
    a=ligne(p1,y); best=[]
    for d in range(150,400):
        y2=y+d
        if y2>=2380: break
        best.append((ecart(a,ligne(p2,y2)), d))
    best.sort()
    print(f"  ligne y={y} de la capture 1920 : meilleurs decalages -> "+
          ", ".join(f"d={d} (ecart moyen {e:.2f} L)" for e,d in best[:3]))
    print(f"      pire decalage teste : ecart {max(best)[0]:.2f} L  (controle: l instrument discrimine)")
print("\n  => si l art etait a des ECHELLES differentes, aucun decalage constant ne donnerait un ecart faible")
print("     sur des lignes eloignees. Un MEME d pour toutes les lignes = simple translation, meme echelle.")
print("\n### dimensions du conteneur d'art ###")
print("  colonne d art : x 54..1025 = 972 px dans les DEUX captures")
print("  1920 : art de y=240 a >1920 (clip ecran)   2400 : art de y=480 a y=2207 -> hauteur 1728 px")
print("  972 / 1080 = %.4f   1728 / 1920 = %.4f" % (972/1080, 1728/1920))
