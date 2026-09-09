# -- m07 : coupes brutes du medaillon. Convention de bord : NOMINAL = mi-alpha entre fond local et pic ; COEUR = >=95 %.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *

def cut_v(key,xc,y0,y1):
    s=sc(key); im=img(key); d=im.load(); xp=int(round(xc*s))
    print("  coupe VERTICALE %s  x=%.2f CSS (px %d)  image %s"%(key,xc,xp,im.size))
    for yp in range(int(y0*s),int(y1*s)+1):
        p=d[xp,yp]; print("    y=%7.3f  %-16s L=%6.1f"%(yp/s,str(p),lum(p)))

def cut_h(key,yc,x0,x1):
    s=sc(key); im=img(key); d=im.load(); yp=int(round(yc*s))
    print("  coupe HORIZONTALE %s  y=%.2f CSS (px %d)"%(key,yc,yp))
    for xp in range(int(x0*s),int(x1*s)+1):
        p=d[xp,yp]; print("    x=%7.3f  %-16s L=%6.1f"%(xp/s,str(p),lum(p)))

print("=== canon : coupe verticale au sommet du medaillon (x=195.83) ===")
cut_v('ref',195.83,4.0,12.0)
print("=== c19 : idem ===")
cut_v('c19',195.83,3.0,12.0)
print()
print("=== canon : coupe horizontale a mi-hauteur (y=40) — bords gauche/droit ===")
cut_h('ref',40.0,160.0,170.0)
print("  ... (droite)")
cut_h('ref',40.0,222.0,232.0)
print("=== c19 : idem (y=39.85) ===")
cut_h('c19',39.85,159.0,169.0)
print("  ... (droite)")
cut_h('c19',39.85,222.0,232.0)
