"""m01 — geometrie d'ensemble : filets OR du cadre, rails, bandeau, dock.
Convention de bord DECLAREE : mi-alpha (mi-hauteur entre plateau de fond et plateau d'objet).
Controle positif : la largeur de l'image (1080) doit sortir des rails + marges.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

def est_or(c):
    r,g,b = c
    return r > 110 and (r-b) > 45 and g > 70 and g < r

def rangees_or(im, nom):
    p = im.load(); W,H = im.size
    print(f"\n--- {nom} : rangees a forte densite OR ---")
    res=[]
    for y in range(H):
        n = sum(1 for x in range(W) if est_or(p[x,y]))
        res.append((y,n))
    # bandes ou n > 40% de la largeur
    seuil = int(0.40*W)
    b = bandes(res, seuil)
    for c0,c1,pic in b:
        print(f"   y {c0}..{c1}  (n_max={int(pic)}, {100*pic/W:.0f}% de la largeur)")
    return res, b

def colonnes_or(im, y0, y1, nom):
    p = im.load(); W,_ = im.size
    res=[]
    for x in range(W):
        n = sum(1 for y in range(y0,y1+1) if est_or(p[x,y]))
        res.append((x,n))
    seuil = int(0.5*(y1-y0+1))
    b = bandes(res, seuil)
    print(f"--- {nom} : colonnes OR sur y{y0}..{y1} ---")
    for c0,c1,pic in b:
        print(f"   x {c0}..{c1}  (n_max={int(pic)})")
    return b

for nom in ('reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png'):
    im = ouvrir(nom)
    res, b = rangees_or(im, nom)
