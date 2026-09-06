# m23 — boîtes d'encre des lignes de texte et alignement par rapport à leur pavé/colonne.
# Contrôle positif : la largeur totale mesurée de la ligne de titre doit être < 1080 (sinon la
#   sonde ramasse le fond). Contrôle négatif : une bande de fond pur doit rendre "aucune encre".
from util import *
print("== m23 alignements ==")
def bbox_encre_couleur(im,fen,fond,seuil=25):
    px=im.load(); x0,y0,x1,y1=fen; mnx,mny,mxx,mxy,n=10**9,10**9,-1,-1,0
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if abs(c[0]-fond[0])+abs(c[1]-fond[1])+abs(c[2]-fond[2])>seuil:
                n+=1;mnx=min(mnx,x);mxx=max(mxx,x);mny=min(mny,y);mxy=max(mxy,y)
    return (mnx,mny,mxx,mxy,n) if n else None
cap=ouvrir(CAP)
print("  contrôle négatif (bande vide y600..700) :", bbox_encre_couleur(cap,(0,600,1080,700),(13,13,13)))
PAVES={"1":(36,381),"2":(418,712),"3":(749,1043)}
for k,(a,b) in PAVES.items():
    nom=bbox_encre_couleur(cap,(max(0,a-40),1525,min(1080,b+40),1570),(13,13,13))
    tag=bbox_encre_couleur(cap,(max(0,a-40),1571,min(1080,b+40),1605),(13,13,13))
    cxp=(a+b)/2
    print(f"  colonne {k} : pavé x{a}..{b} (centre {cxp:.1f}, largeur {b-a+1})")
    for lbl,t in (("nom",nom),("tag",tag)):
        if t is None: print(f"     {lbl}: aucune encre"); continue
        c=(t[0]+t[2])/2
        print(f"     {lbl}: x{t[0]}..{t[2]} (l={t[2]-t[0]+1}) y{t[1]}..{t[3]} (h={t[3]-t[1]+1}) centre={c:.1f} "
              f"décalage/centre du pavé={c-cxp:+.1f} px ; dépasse à gauche={a-t[0]:+d} à droite={t[2]-b:+d}")
# titre
t=bbox_encre_couleur(cap,(0,1288,1080,1335),(13,13,13))
print(f"  titre : x{t[0]}..{t[2]} (l={t[2]-t[0]+1}) y{t[1]}..{t[3]} (h={t[3]-t[1]+1}) centre={(t[0]+t[2])/2:.1f} (centre écran 539,5)")
# CTA lignes
t=bbox_encre_couleur(cap,(40,1860,1040,1915),(255,90,77))
print(f"  CTA ligne 1 : x{t[0]}..{t[2]} (l={t[2]-t[0]+1}) y{t[1]}..{t[3]} (h={t[3]-t[1]+1}) centre={(t[0]+t[2])/2:.1f}")
t=bbox_encre_couleur(cap,(40,1916,1040,1960),(255,90,77))
print(f"  CTA ligne 2 : x{t[0]}..{t[2]} (l={t[2]-t[0]+1}) y{t[1]}..{t[3]} (h={t[3]-t[1]+1}) centre={(t[0]+t[2])/2:.1f}")
# filet archives : deux lignes centrées ; y a-t-il un chiffre à droite ?
t=bbox_encre_couleur(cap,(40,2020,1040,2068),(22,22,28))
print(f"  archives l.1 : x{t[0]}..{t[2]} y{t[1]}..{t[3]} centre={(t[0]+t[2])/2:.1f}")
t=bbox_encre_couleur(cap,(40,2069,1040,2110),(22,22,28))
print(f"  archives l.2 : x{t[0]}..{t[2]} y{t[1]}..{t[3]} centre={(t[0]+t[2])/2:.1f}")
print(f"  archives : encre dans le tiers DROIT (x750..1043) ? "
      f"{bbox_encre_couleur(cap,(750,2010,1043,2114),(22,22,28))}  (réf : '1' + '›' en or)")
