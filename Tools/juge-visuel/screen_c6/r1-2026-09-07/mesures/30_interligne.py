# -*- coding: utf-8 -*-
"""TAILLE de texte par l'INTERLIGNE (base a base) — robuste, independant de la chaine affichee.
Maquette : .pann small = 6,6px/1,4 -> 9,24 CSS ; .ct .cnd6 span = 6,3px/1,3 -> 8,19 CSS.
CONTROLE POSITIF : sur la REFERENCE, les deux conditions d'une carte (.cnd6, 2 lignes + gap 2px)
   doivent rendre un pas voisin de 8,19+2 = 10,2 CSS.
CONTROLE NEGATIF : deux lignes appartenant a des BLOCS differents (fin d'une carte -> titre de la
   suivante) doivent rendre un pas NETTEMENT plus grand."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
S=3.6
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def bandes(im,x0,y0,x1,y1,marge=24):
    px=im.load()
    e=sorted(lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1,4)); f=e[len(e)//4]; s=f+marge
    out=[];cur=None
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if lum(px[x,y])>=s)
        if n>0:
            if cur is None: cur=[y,y]
            else: cur[1]=y
        else:
            if cur: out.append(tuple(cur)); cur=None
    if cur: out.append(tuple(cur))
    return out
cap=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(R,"reference-1080x2102.png")).convert("RGB")
print("cap",cap.size,"ref",ref.size)
b=bandes(cap,80,1990,980,2075)
print("  CAPTURE .pann small : bandes", b)
if len(b)>=2:
    print("        pas base a base = %d px = %.2f CSS  (maquette .pann small = 9,24 CSS)" % (b[1][1]-b[0][1],(b[1][1]-b[0][1])/S))
b=bandes(ref,140,920,900,1000)
print("  CONTROLE POSITIF REFERENCE .cnd6 (2 conditions) : bandes", b)
if len(b)>=2:
    print("        pas base a base = %d px = %.2f CSS  (attendu ~10,2 CSS)" % (b[1][1]-b[0][1],(b[1][1]-b[0][1])/S))
b=bandes(ref,140,960,900,1120)
print("  CONTROLE NEGATIF REFERENCE (fin carte 1 -> titre carte 2) : bandes", b)
if len(b)>=2:
    print("        pas = %d px = %.2f CSS (doit etre >> 10,2)" % (b[-1][1]-b[0][1],(b[-1][1]-b[0][1])/S))
# items de la liste capture
b=bandes(cap,110,790,600,1030)
print("  CAPTURE items 'Palier n' : bandes", b)
pas=[b[i+1][1]-b[i][1] for i in range(len(b)-1)]
print("        pas successifs px :", pas, " = CSS :", ["%.2f"%(p/S) for p in pas])
