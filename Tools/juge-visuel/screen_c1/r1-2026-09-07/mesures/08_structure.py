#!/usr/bin/env python3
"""Structure : extension HORIZONTALE de chaque trait detecte + boites en CSS (px/3.6).
Controle positif : le cerne de la reference doit mesurer 452 CSS de haut
(462 de .jrn6 moins 2x5 d'inset) ; c'est la valeur ECRITE dans la source."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def chaud(p): return (p[0]-p[2])>20 and lum(p)>45
FROID=(42,54,72)
def froid(p): return all(abs(p[i]-FROID[i])<=22 for i in range(3))

im=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
W,H=im.size; px=im.load()
print(f"OUVERT reference-1080x2102.png taille={W}x{H}")
def etendue(y,pred):
    xs=[x for x in range(W) if pred(px[x,y])]
    return (min(xs),max(xs),len(xs)) if xs else None
print("\n-- traits CHAUDS (laiton) --")
for y in (453,643,927,1903,1994,2077):
    a,b,n=etendue(y,chaud); print(f"  y={y:4d}  x={a}..{b}  ({b-a+1}px = {(b-a+1)/3.6:.1f} CSS)  n={n}")
print("\n-- traits FROIDS (#2a3648) --")
for y in (482,826,855,1186,1204,1309,1868):
    r=etendue(y,froid)
    if r: a,b,n=r; print(f"  y={y:4d}  x={a}..{b}  ({b-a+1}px = {(b-a+1)/3.6:.1f} CSS)  n={n}")
print("\n-- colonnes du cerne --")
xs=[x for x in range(W) if sum(1 for y in range(H) if chaud(px[x,y]))>0.25*H]
print(f"  x={xs}")
ys=[y for y in range(H) if chaud(px[0 if False else 22,y])]
print(f"  colonne x=22 : chaud de y={min(ys)} a y={max(ys)}  hauteur={max(ys)-min(ys)+1}px "
      f"= {(max(ys)-min(ys)+1)/3.6:.1f} CSS")
h=(max(ys)-min(ys)+1)/3.6
print(f"  CONTROLE POSITIF cerne : {h:.1f} CSS attendu 452.0 (462-2x5) -> "
      f"{'OK' if abs(h-452)<3 else 'ECHEC'}")

print("\n-- CAPTURE 1080x2400 : boites (bornes du profil 01) en px et en CSS(/3.6) --")
BOITES=[('enseigne',267,451),('compteurs',483,642),('carte1',674,888),('carte2',906,1121),
        ('carte3',1139,1353),('carte4',1371,1585),('carte5',1603,1752),('pann. explicatif',1784,2116)]
for n,a,b in BOITES:
    print(f"  {n:17s} y={a}-{b}  h={b-a:4d}px = {(b-a)/3.6:6.1f} CSS")
imc=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); Wc,Hc=imc.size; pc=imc.load()
print(f"  OUVERT capture-1080x2400.png taille={Wc}x{Hc}")
for n,y in (('enseigne',300),('compteur',520),('carte1',780),('pann. explicatif',1850)):
    xs=[x for x in range(Wc) if pc[x,y]!=(13,13,13) and lum(pc[x,y])<40]
    if xs: print(f"  {n:17s} y={y}: remplissage x={min(xs)}..{max(xs)} "
                 f"({max(xs)-min(xs)+1}px = {(max(xs)-min(xs)+1)/3.6:.1f} CSS)")
