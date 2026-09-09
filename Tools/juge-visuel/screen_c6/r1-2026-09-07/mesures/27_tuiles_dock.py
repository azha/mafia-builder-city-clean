# -*- coding: utf-8 -*-
"""(a) les 3 tuiles de compteurs : largeurs et ecarts (rapports INTERNES, invariants d'echelle) ;
(b) haut du dock et bas du bandeau sur la capture sous chrome.
CONTROLE POSITIF : les 3 tuiles doivent avoir des largeurs EGALES a <=2 px des deux cotes (flex:1).
CONTROLE NEGATIF : la meme detection appliquee a la boite LISTE (une seule tuile) doit rendre 1 segment."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
S=3.6
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def segments(im,y,cible,tol,x0=20,x1=1062,gap=4):
    px=im.load()
    xs=[x for x in range(x0,x1) if max(abs(px[x,y][i]-cible[i]) for i in range(3))<=tol]
    seg=[];c=None
    for x in xs:
        if c is None: c=[x,x]
        elif x-c[1]<=gap: c[1]=x
        else: seg.append(tuple(c)); c=[x,x]
    if c: seg.append(tuple(c))
    return seg
ARD=(42,54,72); OR=(176,141,61)
ref=Image.open(os.path.join(R,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
print("ref",ref.size,"cap",cap.size)
def tuiles(im,y,cible,tol,tag):
    s=segments(im,y,cible,tol)
    s=[t for t in s if t[1]-t[0]>=40]
    print("  %-28s y=%4d : %d tuiles" % (tag,y,len(s)))
    for i,(a,b) in enumerate(s):
        print("        tuile %d x=%4d..%4d  l=%3d px = %5.1f CSS = %5.2f%% ecran" % (i+1,a,b,b-a+1,(b-a+1)/S,100.0*(b-a+1)/1080))
    for i in range(len(s)-1):
        print("        ecart %d-%d = %d px = %.1f CSS" % (i+1,i+2, s[i+1][0]-s[i][1]-1, (s[i+1][0]-s[i][1]-1)/S))
    return s
# reference : le bord haut des .fen est ardoise a y=680
tuiles(ref,680,ARD,32,"REFERENCE 3 fenetres")
tuiles(cap,496,OR,32,"CAPTURE 3 fenetres")
print("  CONTROLE NEGATIF boite LISTE (1 tuile) ref y=826 :", len([t for t in segments(ref,826,ARD,32) if t[1]-t[0]>=40]),
      " cap y=680 :", len([t for t in segments(cap,680,OR,32) if t[1]-t[0]>=40]))
print()
capc=Image.open(os.path.join(R,"capture-1080x2400.png")).convert("RGB"); px=capc.load()
print("(b) profil de luminance bas de la capture sous chrome (moyenne par ligne, x=0..1080 pas 4)")
prev=None
for y in range(2100,2400,4):
    v=sum(lum(px[x,y]) for x in range(0,1080,4))/270
    if prev is None or abs(v-prev)>=1.2:
        print("     y=%4d  lum=%6.2f" % (y,v))
    prev=v
