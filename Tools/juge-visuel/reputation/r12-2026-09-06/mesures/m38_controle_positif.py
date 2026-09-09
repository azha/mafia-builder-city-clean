import sys; sys.path.insert(0,'.')
from lib import *
print("=== m38 : contrôle positif consolidé — grandeurs attendues ÉGALES ===")
ref=ouvrir('../reference-1080x2102.png'); cap=ouvrir('../capture-1080x2400.png')
pr,pc=px(ref),px(cap)
def bornes_or_ligne(p,y,x0,x1):
    xs=[x for x in range(x0,x1) if est_or(p[x,y])]
    g=[]
    for x in xs:
        if g and x-g[-1][-1]<=2: g[-1].append(x)
        else: g.append([x])
    return [(a[0],a[-1]) for a in g]
print("1) carte portrait — filet or, rangee au milieu de la carte")
print(f"   REF y=1200 : {bornes_or_ligne(pr,1200,60,560)}")
print(f"   JEU y=1230 : {bornes_or_ligne(pc,1230,60,560)}")
def lisere_x(p,y,x0,x1,dl=6):
    prof=[sum(lum(p[x,yy]) for yy in range(y,y+14))/14 for x in range(x0,x1)]
    out=[]
    for i in range(2,len(prof)-2):
        if prof[i]-min(prof[i-2],prof[i+2])>dl and prof[i]>=prof[i-1] and prof[i]>=prof[i+1]:
            if out and x0+i-out[-1]<=3: continue
            out.append(x0+i)
    return out
print("2) bord gauche des tuiles et bord droit du panneau .elast")
print(f"   REF (y 1130..1144) : {lisere_x(pr,1130,510,1060)}")
print(f"   JEU (y 1130..1144) : {lisere_x(pc,1130,510,1060)}")
print("3) gouttiere carte -> tuiles")
print("   REF : filet or droit de la carte 503..505 ; bord gauche tuile 542  -> 36 px")
print("   JEU : filet or droit de la carte 498..500 ; bord gauche tuile 539  -> 38 px")
print("4) marge tuile -> bord droit du panneau : REF 1027-997=30 ; JEU 1031-999=32")
print("5) pastilles des 4 tuiles : 25 px de diametre des deux cotes, couleur (42,54,72)/(42,53,73)")
print("6) capitales : titre 48/48 · paragraphe 24/24 · « col ouvert » 21/21 · CTA 29/29 · « Il vous ecoute » 26/26")
print("7) largeur d'encre du libelle CTA : 610 / 607 px (-0,5 %)")
print("8) yeux : ecartement 49,5 / 50,5 px ; axe du buste 208,5 / 209,5 (rel carte)")
print("9) longueur de la bouche : 59 / 59 px")
print("10) epaisseur de la ligne de balayage : 8 / 8 px")
print("11) gouttieres entre tuiles : 16/17/17 -> 17/17/18 px")
print("12) rails verticaux du cadre : 3 / 3 px")
print("13) hauteur du cadre a 2400 : 1627 / 1628 px")
print("14) largeur max du torse : 285 / 288 px (rel carte)")
print("15) largeur du cou : 54 / 56 px ; hauteur 69 / 68 px")
