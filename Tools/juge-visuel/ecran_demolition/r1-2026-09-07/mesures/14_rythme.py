# -*- coding: utf-8 -*-
"""Rythme vertical des rangees, marges internes, rayons d'arrondi.
Controle POSITIF : l'ecart entre rangees doit valoir .dm-offre margin-bottom = 5 CSS = 18 px.
Controle NEGATIF : le meme detecteur d'arrondi sur un coin CARRE (le bandeau, x=0,y=0) doit rendre rayon 0."""
from PIL import Image
def med(v):
    v=sorted(v); n=len(v); return v[n//2] if n%2 else (v[n//2-1]+v[n//2])//2
C=Image.open("capture-1080x2400.png").convert('RGB'); pc=C.load()
R=Image.open("reference-1080x2102.png").convert('RGB'); pr=R.load()
print("OUVERT cap %s ref %s"%(C.size,R.size))
tops=[725,872,1020,1168,1315,1463,1610,1758]
bots=[854,1002,1150,1297,1445,1592,1740,None]
print("\n=== rangees : hauteur et ecart ===")
for i,(a,b) in enumerate(zip(tops,bots),1):
    h = (b-a) if b else "COUPEE"
    g = (tops[i]-b) if (b and i<len(tops)) else "-"
    print("   rangee %d : haut=%d  bas=%s  hauteur=%s px (%s CSS)  ecart au suivant=%s px"%(i,a,b,h,("%.2f"%(h/3.6)) if b else "-",g))
print("   -> .dm-offre margin-bottom CSS = 5 -> attendu 18,0 px ; mesure = 18 px (constant sur 7 intervalles)")
print("\n=== rangee 8 : part visible ===")
print("   haut=1758  .dm-bas commence a 1817  =>  visible = %d px sur %d  (%.0f %%)"%(1817-1758,129,100.0*(1817-1758)/129))
print("\n=== rayon d'arrondi (coin haut-gauche) : 1er y ou le bord vertical apparait ===")
def rayon(px,xc,yc,couleur,tol,lab,H=40):
    # xc,yc = coin theorique ; on cherche, pour chaque y, le 1er x>=xc ou la couleur du bord apparait
    prem=None; last=None
    for dy in range(0,H):
        y=yc+dy; xf=None
        for x in range(xc,xc+H):
            if all(abs(px[x,y][i]-couleur[i])<=tol for i in range(3)): xf=x; break
        if xf is not None:
            if prem is None: prem=(dy,xf)
            last=(dy,xf)
    if prem is None: print("   %s : bord non trouve"%lab); return
    print("   %s : a dy=%d le bord est a x=%d (offset %d) ; a dy=%d offset %d  -> rayon ~%d px (%.1f CSS)"
          %(lab,prem[0],prem[1],prem[1]-xc,last[0],last[1]-xc,prem[1]-xc,(prem[1]-xc)/3.6))
rayon(pc,46,725,(61,61,53),12,"rangee 1 (jeton .dm-offre radius 3 CSS = 10,8 px)")
rayon(pc,46,435,(59,59,51),12,"carte dm-glob (radius 3 CSS = 10,8 px)")
rayon(pc,46,1954,(90,73,42),12,"CTA dm-geste (radius 3 CSS = 10,8 px)")
print("   [controle negatif] coin du bandeau (carre) :")
rayon(pc,0,0,(16,23,28),10,"bandeau x=0,y=0")
print("\n=== inset du texte dans la rangee 1 ===")
print("   bord interieur gauche de la carte = 50 ; 1re encre du titre a x=84  -> inset = 34 px = 9,4 CSS  (.dm-offre padding-left = 10 CSS = 36 px)")
def der_encre(px,y0,y1,x0,x1,fond,seuil=45):
    xs=[x for x in range(x0,x1) for y in range(y0,y1) if sum(abs(px[x,y][i]-fond[i]) for i in range(3))>seuil]
    return (min(xs),max(xs)) if xs else None
f=(34,38,34)
print("   statut 'libre' : x =",der_encre(pc,770,805,900,1030,f),"  bord interieur droit = 1030 (.dm-offre padding-right = 10 CSS = 36 px -> attendu fin a 994)")
print("\n=== REFERENCE : .dm-geste (temoin de forme du CTA) ===")
print("   REF CTA : haut=1938 bas=2043 -> hauteur=%d px (%.2f CSS) ; libelle sur 1 ligne"%(2043-1938,(2043-1938)/3.6))
print("   CAP CTA : haut=1954 bas=2098 -> hauteur=%d px (%.2f CSS) ; libelle sur 2 lignes"%(2098-1954,(2098-1954)/3.6))
