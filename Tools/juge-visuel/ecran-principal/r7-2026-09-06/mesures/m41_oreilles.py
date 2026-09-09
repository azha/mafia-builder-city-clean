# -- m41 : « oreilles » du bouton OR = remplissage dore PRESENT en dehors du trace arrondi.
#    Mesure : retrait du bord dore par rapport au bord de la boite, ligne par ligne, aux 4 coins.
#    Controle positif : le canon doit rendre un retrait DECROISSANT (coin arrondi) ; le jeu, un retrait NUL.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
DOR = lambda p: (p[0]-p[2])>60 and p[0]>120
def bordure(key, box, nlig=9):
    s=sc(key); im=img(key); d=im.load()
    X0,Y0,X1,Y1=[int(round(v*s)) for v in box]
    # boite du dore
    xs=[];ys=[]
    for yp in range(Y0,Y1):
        for xp in range(X0,X1):
            if DOR(d[xp,yp]): xs.append(xp); ys.append(yp)
    bx0,bx1,by0,by1=min(xs),max(xs),min(ys),max(ys)
    print("  %s : boite doree x %.2f..%.2f  y %.2f..%.2f  (%.2f x %.2f CSS)"%(key,bx0/s,(bx1+1)/s,by0/s,(by1+1)/s,(bx1+1-bx0)/s,(by1+1-by0)/s))
    for lbl,rows in [("HAUT",range(by0,by0+nlig)),("BAS",range(by1,by1-nlig,-1))]:
        out=[]
        for yp in rows:
            r=[xp for xp in range(bx0,bx1+1) if DOR(d[xp,yp])]
            if r: out.append("%.2f/%.2f"%((min(r)-bx0)/s,(bx1-max(r))/s))
            else: out.append("-")
        print("     retrait gauche/droite, %-4s (%d lignes) : %s"%(lbl,nlig," · ".join(out)))
print("=== CANON ===")
bordure('ref',(24,534,145,586))
print("=== JEU 1920 ===")
bordure('c19',(24,534,145,586))
print("=== JEU 2400 ===")
bordure('c24',(24,708,145,760))
