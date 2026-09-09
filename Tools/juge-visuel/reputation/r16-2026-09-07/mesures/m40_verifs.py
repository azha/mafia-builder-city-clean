# m40 : verifications finales des chiffres cites dans le rapport.
import sys; sys.path.insert(0,'.')
from lib import *
R=ouvrir('reference-1080x2102.png'); pr=R.load()
A=ouvrir('capture-1080x2400.png'); pa=A.load()
B=ouvrir('capture-1080x1920.png'); pb=B.load()

print("\n1) bornes X du panneau de titre et du panneau elastique (reference et 2400)")
def bornes_x(px,y,ya):
    row=[lum(px[x,y]) for x in range(24,1057)]
    f=mediane(row)
    xs=[24+i for i,v in enumerate(row) if v-f>2]
    return (min(xs),max(xs)) if xs else None
print("   ref  panneau de titre  y=560 :", bornes_x(pr,560,0), "| panneau elastique y=1600 :", bornes_x(pr,1600,0))
print("   2400 panneau de titre  y=590 :", bornes_x(pa,590,0), "| panneau elastique y=1540 :", bornes_x(pa,1540,0))

print("\n2) ecarts entre tuiles (fin de tuile n -> debut de tuile n+1)")
print("   ref  : tuiles 1000..1100, 1115..1215, 1231..1330, 1346..1446 -> ecarts", [1115-1100-1,1231-1215-1,1346-1330-1])
print("   2400 : tuiles 997..1089, 1104..1196, 1211..1303, 1319..1411  -> ecarts", [1104-1089-1,1211-1196-1,1319-1303-1])
print("   hauteurs ref/jeu :", [101,101,100],"/",[93,93,93,93])

print("\n3) couleur du tiret ENFREINTES (compteur 3, capture)")
xs=[x for x in range(840,910) if lum(pa[x,772])>60]
print("   2400 y=772 : encre x=%d..%d couleur mediane=%s" % (min(xs),max(xs), mediane_fenetre(pa,(min(xs)+max(xs))//2,772,1)))
print("   comparaison : coeur du chiffre du compteur 1 =", mediane_fenetre(pa,200,760,2))

print("\n4) 1920 : y a-t-il de l'OR entre le rail bas du cadre (1629) et le dock (1672) ?")
for y in range(1630,1673):
    n=sum(1 for x in range(0,1080) if est_or(pb[x,y]))
    if n>0: print("   y=%d : %d px d'or" % (y,n))
print("   (aucune ligne imprimee = 0 px d'or : la boite CTA n'est pas rendue sous le cadre)")
n1920=sum(1 for y in range(1630,1673) for x in range(0,1080) if est_or(pb[x,y]))
print("   total or entre 1630 et 1672 :", n1920, "px")

print("\n5) reflet : bornes verticales a mi-hauteur")
for tag,px,ya,yb in (('ref',pr,1070,1100),('2400',pa,1090,1120)):
    base=mediane([sum(lum(px[x,y]) for x in range(90,1030))/940.0 for y in list(range(ya,ya+6))+list(range(yb-6,yb))])
    prof=[(y, sum(lum(px[x,y]) for x in range(90,1030))/940.0-base) for y in range(ya,yb)]
    pic=max(prof,key=lambda t:t[1]); d=[y for y,v in prof if v>=0.5*pic[1]]
    print("   %-5s pic y=%d ; mi-hauteur y=%d..%d" % (tag,pic[0],min(d),max(d)))

print("\n6) liseré des tuiles et des panneaux (couleurs)")
print("   ref  liseré de tuile (x=970,y=1098) :", pr[970,1098], "| liseré du panneau elastique (x=1028,y=1000) :", pr[1028,1000])
print("   2400 liseré de tuile (x=975,y=1104) :", pa[975,1104], "| liseré du panneau elastique (x=1033,y=1000) :", pa[1033,1000])
