# -- m40 : coin haut-gauche du bouton OR. Profil du remplissage (or) et du trace (contour plus sombre).
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
for key,y0 in [('ref',538.0),('c19',537.0)]:
    s=sc(key); im=img(key); d=im.load()
    print("=== %s : coin haut-gauche du bouton COLLECTER (colonnes 27..44, lignes %.0f..%.0f) ==="%(key,y0,y0+12))
    print("      " + "".join("%6.1f"%(27+i*1.0) for i in range(0,17)))
    for yy in [y0+i*0.5 for i in range(0,26)]:
        yp=int(round(yy*s)); row=[]
        for i in range(17):
            xp=int(round((27+i)*s)); p=d[xp,yp]
            row.append("%6d"%(p[0]-p[2]))
        print("  y=%6.1f%s"%(yy,"".join(row)))
