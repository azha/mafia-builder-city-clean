# m38 : l'INSET haut du contenu, mesure sur le TEMOIN (la liste du menu commence a l'inset) ;
#       + extension droite de l'aparte dans la REFERENCE.
import sys; sys.path.insert(0,'.')
from lib import *
T=ouvrir('temoin-menu-plus-1080x2400.png'); pt=T.load()
print("   temoin, colonne x=5 (hors des libelles), y=225..255 :", " ".join("%d:%s"%(y,pt[5,y]) for y in range(225,256)))
# 1re rangee de la 1re carte de la liste
prem=None
for y in range(150,300):
    row=[lum(pt[x,y]) for x in range(0,1080)]
    if mediane(row)>20: prem=y; break
print("   -> 1re rangee de la LISTE (fond de carte L>20) : y=%s" % prem)
print("   -> zone libre du temoin : y=%s..2151 = %s px ; la liste occupe 100 %% de la largeur" % (prem, 2151-prem+1 if prem else '?'))

R=ouvrir('reference-1080x2102.png'); pr=R.load()
print("\n   REFERENCE — aparte : extension droite de l'encre par ligne")
for (a,b) in [(899,921),(928,946),(952,972)]:
    xs=[x for x in range(780,1050) if any(lum(pr[x,y])>70 for y in range(a,b+1))]
    print("      y=%d..%d : encre x=%d..%d" % (a,b,min(xs),max(xs)))
print("   (bord droit du panneau elastique dans la reference : x=?)")
row=[lum(pr[x,1000]) for x in range(900,1060)]
print("      rangee y=1000, x=980..1040 :", " ".join("%d:%.0f"%(900+i,v) for i,v in enumerate(row) if 80<=i<=140)[:400])
