# -*- coding: utf-8 -*-
"""Le PAVE du bas de la capture, ligne par ligne : hauteur de capitale + couleur d'encre,
compares aux JETONS que la CSS du cadre homologue #117 impose (.pann i #8a979c 5,6px ;
.pann b #eae0c8 13px DejaVu Serif ; .pann small #b9ad92 6,6px).
CONTROLE POSITIF : le 'P' de 'Palier 2' (liste) doit rendre #eae0c8 — le client POSSEDE ce jeton creme.
CONTROLE NEGATIF : le titre 'L'horizon' doit rendre une AUTRE couleur (#ffd240) — sinon la sonde
   ne distingue pas deux encres voisines."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
S=3.6
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def top(im,x0,y0,x1,y1,q=0.97):
    px=im.load(); ps=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    ps.sort(key=lum); t=ps[int(len(ps)*q):]
    return tuple(sorted(p[i] for p in t)[len(t)//2] for i in range(3))
def hexa(c): return "#%02x%02x%02x"%c
def glyf(im,x0,y0,x1,y1,marge=26,gap=3):
    px=im.load()
    e=sorted(lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)); f=e[len(e)//4]; s=f+marge
    cols=[]
    for x in range(x0,x1):
        ys=[y for y in range(y0,y1) if lum(px[x,y])>=s]
        cols.append((min(ys),max(ys)) if ys else None)
    out=[];cur=None;v=0
    for i,c in enumerate(cols):
        if c:
            v=0
            if cur is None: cur=[x0+i,x0+i,c[0],c[1]]
            else: cur[1]=x0+i; cur[2]=min(cur[2],c[0]); cur[3]=max(cur[3],c[1])
        else:
            v+=1
            if cur and v>gap: out.append(tuple(cur)); cur=None
    if cur: out.append(tuple(cur))
    return out
cap=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
print("image :", cap.size)
for tag,fen,jeton in [
  ("pave i  'CE QUE LE SERVEUR…'",(80,1880,660,1908),"#8a979c 5,6px (cap 4,08 CSS)"),
  ("pave b  'Rien a l’horizon'",  (80,1918,510,1968),"#eae0c8 13px serif (cap 9,48 CSS)"),
  ("pave small ligne 1",          (80,1995,980,2035),"#b9ad92 6,6px (cap 4,81 CSS)"),
  ("liste 'Palier 2' (ctrl pos)", (150,790,290,828),"#eae0c8"),
  ("titre 'L’horizon' (ctrl neg)",(330,325,760,382),"#f2c96b attendu par la maquette"),
]:
    g=glyf(cap,*fen)
    hs=[d-t+1 for a,b,t,d in g if b-a>=5]
    h=sorted(hs)[len(hs)//2] if hs else 0
    print("  %-30s %d glyphes  cap(mediane)=%3d px = %5.2f CSS  encre=%s  | jeton attendu %s"
          % (tag,len(g),h,h/S,hexa(top(cap,*fen)),jeton))
