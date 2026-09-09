import sys; sys.path.insert(0,'.')
from lib import *
print("=== m14c : etendue du balayage a differents seuils (mi-hauteur incluse) ===")
def sc(c):
    r,g,b=c; return (g+b)/2 - r
for nom,f,yb in [('REF','../reference-1080x2102.png',1089),('JEU','../capture-1080x2400.png',1104)]:
    im=ouvrir(f); p=px(im)
    def exces(x,y): return sc(p[x,y]) - (sc(p[x,y-25])+sc(p[x,y+25]))/2
    prof=[exces(x,yb) for x in range(0,1080)]
    mx=max(prof)
    print(f"  {nom} y={yb} pic={mx:.1f}")
    for frac,lab in [(0.10,'10%'),(0.25,'25%'),(0.50,'mi-hauteur'),(0.75,'75%')]:
        xs=[x for x in range(1080) if prof[x]>frac*mx]
        if xs: print(f"     seuil {lab:11s} ({frac*mx:5.1f}) : x {min(xs)}..{max(xs)} = {max(xs)-min(xs)+1} px, {len(xs)} colonnes")
    # profil echantillonne tous les 60 px
    print("     profil : " + " ".join(f"{x}:{prof[x]:.0f}" for x in range(40,1060,60)))
