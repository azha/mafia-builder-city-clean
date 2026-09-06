# -- m54 : separateurs verticaux entre les 3 cellules de stats : position, hauteur, couleur.
#    Sonde : colonnes ou la luminance depasse de >=4 celle de ses voisines a +-3 CSS, sur une hauteur >=8 CSS.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
DY={'ref':0.0,'c19':0.0,'c24':174.222}
for key in ['ref','c19','c24']:
    s=sc(key); im=img(key); d=im.load(); dy=DY[key]
    k=int(round(3*s))
    print("=== %s ==="%key)
    for xp in range(int(125*s),int(275*s)):
        cnt=0; ys=[]
        for yp in range(int((486+dy)*s),int((532+dy)*s)):
            p=d[xp,yp]; a=d[xp-k,yp]; b=d[xp+k,yp]
            if lum(p)-max(lum(a),lum(b))>=4: cnt+=1; ys.append(yp/s-dy)
        if cnt/s>=8.0:
            print("   x=%.2f : hauteur %.2f CSS (y %.2f..%.2f)  couleur %s"%(xp/s,cnt/s,min(ys),max(ys),str(d[xp,int((505+dy)*s)])))
