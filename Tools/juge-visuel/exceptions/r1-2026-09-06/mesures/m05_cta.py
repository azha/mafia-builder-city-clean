# m05 — le TAMPON / CTA : bbox, remplissage, bord, couleur du texte.
# Convention de bord : l'ÉPAISSEUR d'un trait est le nombre de lignes (ou colonnes) consécutives
# dont la couleur est dans la tolérance de la couleur du bord, mesurée sur un profil traversant le
# bord perpendiculairement, AU MILIEU du côté (jamais dans un coin arrondi).
# Contrôle positif : le jeton CSS du tampon de la référence est #d9cca9 = (217,204,169) — l'instrument
#   doit le retrouver au centre de la plaque à ≤6/255 par canal.
# Contrôle négatif : la même sonde sur la capture doit rendre une couleur ÉLOIGNÉE (sinon elle ne
#   discrimine pas).
from util import *
print("== m05 tampon / CTA ==")
ref=ouvrir(REF); cap=ouvrir(CAP)

def bbox_couleur(im, cible, tol, fen):
    px=im.load(); x0,y0,x1,y1=fen
    mnx,mny,mxx,mxy,n=10**9,10**9,-1,-1,0
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if abs(c[0]-cible[0])<=tol and abs(c[1]-cible[1])<=tol and abs(c[2]-cible[2])<=tol:
                n+=1; mnx=min(mnx,x); mxx=max(mxx,x); mny=min(mny,y); mxy=max(mxy,y)
    return (mnx,mny,mxx,mxy,n) if n else None

# --- RÉFÉRENCE : plaque crème #d9cca9
b=bbox_couleur(ref,(217,204,169),22,(0,1500,1080,2102))
print(f"  RÉF tampon (crème 217,204,169 ±22) bbox={b[:4]} n={b[4]}  -> {b[2]-b[0]+1}x{b[3]-b[1]+1} px")
cx,cy=(b[0]+b[2])//2,(b[1]+b[3])//2
print(f"  RÉF contrôle positif  médiane au centre de la plaque = {mediane_fenetre(ref,cx,cy,6)}  (attendu ≈ (217,204,169))")
# bord : profil vertical au milieu du côté gauche
px=ref.load()
print("  RÉF profil horizontal au milieu (y=%d), x de %d à %d :"%(cy,b[0]-14,b[0]+18))
print("   ", [(x,px[x,cy]) for x in range(b[0]-14,b[0]+18,2)])

# --- CAPTURE : le CTA est la bande 1831..1977 ; couleur au centre
print(f"  CAP contrôle négatif  médiane au centre de la bande CTA (540,1900) = {mediane_fenetre(cap,540,1900,6)}")
pc=cap.load()
# bbox de la bande saumon
saumon=mediane_fenetre(cap,540,1860,6)
b2=bbox_couleur(cap,saumon,18,(0,1800,1080,2010))
print(f"  CAP CTA (saumon {saumon} ±18) bbox={b2[:4]} n={b2[4]} -> {b2[2]-b2[0]+1}x{b2[3]-b2[1]+1} px")
print("  CAP profil horizontal au milieu (y=%d), x de %d à %d :"%((b2[1]+b2[3])//2, b2[0]-14, b2[0]+18))
print("   ", [(x,pc[x,(b2[1]+b2[3])//2]) for x in range(max(0,b2[0]-14),b2[0]+18,2)])
# couleur du texte du CTA
print(f"  RÉF couleur du grand texte du tampon (échantillon dans un fût de lettre) — palette de la bande :")
for pct,rgb in palette(ref,(b[0],b[1],b[2],b[3]),6): print(f"     {pct:5.1f}%  {rgb}")
print(f"  CAP couleur du grand texte du CTA — palette de la bande :")
for pct,rgb in palette(cap,(b2[0],b2[1],b2[2],b2[3]),6): print(f"     {pct:5.1f}%  {rgb}")
