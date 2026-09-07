# m37 : la bande juste sous le rail haut du cadre (lueur) : teinte chaude/froide + la bande morte au-dessus du cadre.
import sys; sys.path.insert(0,'.')
from lib import *
IMS={n:ouvrir(n) for n in ('reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png')}
PX={n:IMS[n].load() for n in IMS}
print("\n== bande sous le rail haut du cadre (entre le rail et le panneau de titre) ==")
for tag,f,ya,yb in (('ref','reference-1080x2102.png',458,478),('2400','capture-1080x2400.png',489,509),('1920','capture-1080x1920.png',257,277)):
    px=PX[f]
    med=[(x, tuple(int(mediane([px[x,y][k] for y in range(ya,yb)])) for k in range(3))) for x in range(30,1050,10)]
    bord=med[0][1]; pic=max(med,key=lambda t: lum(t[1]))
    print("   %-5s bord x=%d %s (R-B=%+d) | pic x=%d %s (R-B=%+d)" % (tag,med[0][0],bord,bord[0]-bord[2],pic[0],pic[1],pic[1][0]-pic[1][2]))

print("\n== bande morte au-dessus du cadre a 2400 (y=232..481) : contenu ou seulement un fond ? ==")
px=PX['capture-1080x2400.png']
fortes=0
for y in range(232,482):
    row=[lum(px[x,y]) for x in range(30,1050)]
    m=mediane(row)
    fortes+=1 if sum(1 for v in row if abs(v-m)>14)>4 else 0
print("   rangees portant un ecart > 14 pts a la mediane de rangee : %d / 250  (=> aucun texte, aucune boite)" % fortes)
print("   profil du fond, colonne x=540 :", " ".join("%d:%s"%(y,px[540,y]) for y in range(240,482,30)))
print("   profil du fond, rangee y=350   :", " ".join("x%d:%s"%(x,px[x,350]) for x in range(40,1041,120)))
