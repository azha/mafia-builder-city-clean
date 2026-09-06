# -- m46 : y a-t-il un VOILE (scrim) sous le dock ? profil vertical a x=20 (hors ronds et libelles).
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
DY={'ref':0.0,'c19':0.0,'c24':174.222}
for key in ['ref','c19','c24']:
    s=sc(key); im=img(key); d=im.load(); dy=DY[key]
    print("=== %s : x=20 CSS, y de %.0f a %.0f (bord du dock a %.1f) ==="%(key,580+dy,697+dy,605.7+dy))
    xp=int(round(20*s)); out=[]
    for yc in [580+i*4 for i in range(0,30)]:
        yy=yc+dy
        if yy*s>=im.height: break
        p=d[xp,int(round(yy*s))]; out.append("%.0f:%.0f"%(yc,lum(p)))
    print("   L(y) :"," ".join(out))
    # ecart moyen entre juste au-dessus et juste en-dessous du bord du dock
    a=[lum(d[xp,int(round((y+dy)*s))]) for y in [596,598,600,602,604]]
    b=[lum(d[xp,int(round((y+dy)*s))]) for y in [608,610,612,614,616]]
    print("   moyenne L juste AU-DESSUS du bord (596..604) = %.1f ; juste EN-DESSOUS (608..616) = %.1f ⇒ marche = %+.1f"%(sum(a)/5,sum(b)/5,sum(b)/5-sum(a)/5))
