# -*- coding: utf-8 -*-
"""10 - Les ARTICLES : geometrie des cartes, presence d'une illustration, richesse chromatique.
Indicateur d'ILLUSTRATION : nombre de TEINTES distinctes (quantifiees a 5 bits/canal) dans la
zone d'objet, et etendue de la bbox d'encre. Un aplat ou un simple disque rend peu de teintes.
CONTROLE POSITIF : la zone d'objet de la REFERENCE (art 1 = plaque emaillee) doit rendre BEAUCOUP
de teintes (>=20) -> l'instrument sait voir une illustration.
CONTROLE NEGATIF : une fenetre de fond pur doit rendre 1 teinte."""
from PIL import Image
import os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def teintes(im,box,bits=5):
    z=im.crop(box); s=set()
    q=8-bits
    for p in z.getdata(): s.add((p[0]>>q,p[1]>>q,p[2]>>q))
    return len(s)
def bbox_encre(im,box,seuil):
    px=im.load(); x0,y0,x1,y1=box
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(px[x,y])>seuil]
    if not pts: return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    return (min(xs),min(ys),max(xs),max(ys),len(pts))
R=ouvrir('../reference-㉓-1080x2102.png'); C=ouvrir('../capture-1080x2400.png')

print()
print("=== REFERENCE : la premiere planche (2 colonnes) ===")
# bord des cartes .art : border 1px #3a2530 ; on cherche les bords verticaux sur une ligne du milieu
px=R.load()
y=760
row=[(x,px[x,y]) for x in range(20,1070)]
bords=[x for x,c in row if lum(c)>28 and lum(px[x-1,y])<=28]
print("   transitions claires a y=760 (bords de carte) :",bords[:20])
print("   teintes zone-objet art1 (x 120..350, y 700..850) :",teintes(R,(120,700,350,850)),"  <- CP illustration")
print("   bbox encre  art1 zone-objet :",bbox_encre(R,(120,700,350,850),40))
print("   CN fond pur REF (x 30..60,y 1700..1730) : teintes =",teintes(R,(30,1700,60,1730)))

print()
print("=== CAPTURE : la premiere carte ===")
print("   teintes zone-objet (le disque, x 130..190, y 555..615) :",teintes(C,(130,555,190,615)))
print("   bbox encre du disque :",bbox_encre(C,(120,545,210,625),40))
print("   teintes de TOUTE la carte 1 (x 60..1020, y 535..885) :",teintes(C,(60,535,1020,885)))
print("   teintes de TOUTE la carte REF art1 (x 60..530, y 690..1000):",teintes(R,(60,690,530,1000)))
print("   CN fond pur CAP (x 30..60, y 1450..1480) : teintes =",teintes(C,(30,1450,60,1480)))
