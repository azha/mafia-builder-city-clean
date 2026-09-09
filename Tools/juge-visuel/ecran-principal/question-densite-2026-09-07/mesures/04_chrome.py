#!/usr/bin/env python3
"""04 - Geometrie du CHROME (bandeau, medaillon, bandeau de lieu, dock).
Le chrome n'est pas la scene : il faut le borner AVANT de mesurer la scene,
sinon on compte du noir d'interface comme du 'vide de ville'."""
from PIL import Image
import os
D = os.path.dirname(__file__)
im = Image.open(os.path.join(D,'..','capture-nuit-1080x1920.png')).convert('RGB')
W,H = im.size; p = im.load()
print("taille source : %d x %d" % (W,H))

# --- 1. bas du bandeau : la regle orange (pixels franchement orange, ligne pleine)
print("\n-- bandeau haut : recherche de la regle orange (R-B>40 et R>90) --")
for y in range(120,170):
    n = sum(1 for x in range(0,W,2) if p[x,y][0]-p[x,y][2] > 40 and p[x,y][0] > 90)
    if n > 100: print("  y=%d : %d/%d colonnes oranges" % (y, n, W//2))

# --- 2. medaillon : bbox des pixels de l'anneau orange
print("\n-- medaillon : bbox de l'anneau orange dans y<260 --")
xs=[];ys=[]
for y in range(0,260):
    for x in range(380,700):
        r,g,b=p[x,y]
        if r>120 and r-b>55: xs.append(x); ys.append(y)
if xs: print("  bbox anneau = x[%d..%d] y[%d..%d]  centre=(%.0f,%.0f) rayon~%.0f"
              % (min(xs),max(xs),min(ys),max(ys),(min(xs)+max(xs))/2,(min(ys)+max(ys))/2,(max(xs)-min(xs))/2))

# --- 3. bandeau de lieu "La Lisiere" : chute de luminance sur une colonne sans texte
print("\n-- bandeau de lieu : colonne x=900, y 200..300 --")
prev=None
for y in range(200,300):
    r,g,b=p[900,y]; L=0.2126*r+0.7152*g+0.0722*b
    if prev is not None and abs(L-prev)>4: print("  y=%d  L %.1f -> %.1f" % (y,prev,L))
    prev=L

# --- 4. dock : debut du voile et opacite pleine, sur 2 colonnes hors boutons
print("\n-- dock : voile puis panneau opaque (x=20 et x=1060) --")
def band(xc):
    start=None; full=None
    ref=[p[xc,y] for y in range(1600,1680)]
    r0=sum(c[0] for c in ref)/len(ref); g0=sum(c[1] for c in ref)/len(ref); b0=sum(c[2] for c in ref)/len(ref)
    for y in range(1650,1920):
        r,g,b=p[xc,y]
        if start is None and (b0-b) > 6: start=y
        if full is None and abs(r-14)<3 and abs(g-25)<3 and abs(b-37)<3: full=y
    print("  x=%4d : eau de reference RGB=(%.0f,%.0f,%.0f)  debut du voile y=%s  opacite pleine y=%s"%(xc,r0,g0,b0,start,full))
band(20); band(1060)
