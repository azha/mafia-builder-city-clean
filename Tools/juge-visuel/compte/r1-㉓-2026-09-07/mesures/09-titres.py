# -*- coding: utf-8 -*-
"""09 - Metriques d'encre : bbox et hauteur de CAPITALE des textes, couleur au coeur du trait.
Methode : dans une fenetre donnee, retenir les pixels dont la luminance depasse (fond + marge),
puis bbox. La hauteur de capitale se lit sur une LETTRE SANS jambage ni accent (on borne en x).
CONTROLE POSITIF : la couleur au coeur du titre de la REFERENCE doit valoir #d9ab4e (217,171,78)
a <=6/255 (valeur ECRITE dans la CSS .vitr6 .ens) -> si non, l'instrument ou la fenetre est fausse.
CONTROLE NEGATIF : une fenetre sans texte doit rendre 'aucune encre'."""
from PIL import Image
import os, statistics
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

def encre(im, box, seuil):
    px=im.load(); x0,y0,x1,y1=box
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(px[x,y])>seuil]
    if not pts: return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    return (min(xs),min(ys),max(xs),max(ys),len(pts))

def coeur(im, box, seuil):
    """couleur mediane des pixels les plus clairs (coeur du trait)"""
    px=im.load(); x0,y0,x1,y1=box
    pts=[px[x,y] for y in range(y0,y1) for x in range(x0,x1) if lum(px[x,y])>seuil]
    if not pts: return None
    pts.sort(key=lum)
    top=pts[int(len(pts)*0.85):]
    return tuple(int(statistics.median([p[k] for p in top])) for k in range(3))

R=ouvrir('../reference-㉓-1080x2102.png'); C=ouvrir('../capture-1080x2400.png')
print()
print("=== TITRE 'LA VITRINE' ===")
b=encre(R,(20,470,700,560),70); print("REF  bbox=%s  (l=%d h=%d)"%(b[:4],b[2]-b[0]+1,b[3]-b[1]+1),"px=",b[4])
print("REF  couleur au coeur :",coeur(R,(20,470,700,560),70),"  <- CP attendu (217,171,78) #d9ab4e")
b2=encre(C,(200,240,900,330),70); print("CAP  bbox=%s  (l=%d h=%d)"%(b2[:4],b2[2]-b2[0]+1,b2[3]-b2[1]+1),"px=",b2[4])
print("CAP  couleur au coeur :",coeur(C,(200,240,900,330),70))
print("CN   fenetre vide REF (20,1700,200,1750) :",encre(R,(20,1700,200,1750),70))

print()
print("=== TITRE, fenetres corrigees (x borne avant la boite de solde) ===")
b=encre(R,(20,455,620,570),70); print("REF  'LA VITRINE' bbox=%s  h_capitale=%d  l=%d"%(b[:4],b[3]-b[1]+1,b[2]-b[0]+1))
b2=encre(C,(200,240,900,330),70); print("CAP  'LA VITRINE' bbox=%s  h_capitale=%d  l=%d"%(b2[:4],b2[3]-b2[1]+1,b2[2]-b2[0]+1))
print()
print("=== BOITE DE SOLDE (reference) vs BANNIERE '0 jetons' (capture) ===")
bs=encre(R,(680,440,1060,560),60); print("REF  solde bbox=%s (l=%d h=%d)"%(bs[:4],bs[2]-bs[0]+1,bs[3]-bs[1]+1))
print("REF  '50' couleur au coeur :",coeur(R,(790,470,880,530),100)," <- CSS .solde b #f0dfc4 = (240,223,196)")
print("REF  'JETONS' couleur :",coeur(R,(890,480,1010,520),60)," <- CSS .solde small #9a8a6a = (154,138,106)")
bb=encre(C,(60,340,1030,520),60); print("CAP  banniere bbox=%s (l=%d h=%d)"%(bb[:4],bb[2]-bb[0]+1,bb[3]-bb[1]+1))
print("CAP  '0 jetons' couleur au coeur :",coeur(C,(430,380,650,440),60))
print("CAP  ligne d'avertissement couleur :",coeur(C,(90,450,990,490),40))
print("CAP  bord de la banniere (y=353, x=540) :", C.load()[540,353])
