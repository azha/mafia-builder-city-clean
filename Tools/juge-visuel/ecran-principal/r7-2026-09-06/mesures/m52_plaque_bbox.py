# -- m52 : boite EXACTE de la plaque de fiche dans le jeu = ensemble des pixels ou c24 differe de d24 (district seul).
#    + rayon d'arrondi mesure par le retrait ligne a ligne. Canon : meme mesure par contraste avec l'art.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
s=sc('c24'); A=img('d24').load(); B=img('c24').load(); im=img('c24')
rows={}
for yp in range(int(580*s),int(790*s)):
    xs=[xp for xp in range(0,im.width) if A[xp,yp]!=B[xp,yp]]
    if xs: rows[yp]=(min(xs),max(xs))
ys=sorted(rows)
y0=ys[0]; y1=ys[-1]
x0=min(v[0] for v in rows.values()); x1=max(v[1] for v in rows.values())
print("  plaque (jeu, 2400) : x %.2f..%.2f (l=%.2f)  y %.2f..%.2f (h=%.2f)"%(x0/s,(x1+1)/s,(x1+1-x0)/s,y0/s,(y1+1)/s,(y1+1-y0)/s))
print("  ⇒ ramene au repere 1920 : y %.2f..%.2f"%(y0/s-174.222,(y1+1)/s-174.222))
print("  retrait gauche/droite sur les 12 premieres lignes (coin haut) :")
print("    "+" · ".join("%.2f/%.2f"%((rows[ys[i]][0]-x0)/s,(x1-rows[ys[i]][1])/s) for i in range(12)))
print("  retrait gauche/droite sur les 12 dernieres lignes (coin bas) :")
print("    "+" · ".join("%.2f/%.2f"%((rows[ys[-1-i]][0]-x0)/s,(x1-rows[ys[-1-i]][1])/s) for i in range(12)))
print()
print("  CANON : `.fiche` mesure au navigateur = 366,00 x 169,19 a (13,00 ; 424,52) ⇒ x 13..379, y 424,52..593,71")
