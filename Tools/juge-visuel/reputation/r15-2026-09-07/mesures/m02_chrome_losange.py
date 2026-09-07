"""m02 — TD-659 : le losange du chrome et le filet HAUT du cadre.
Grandeur : garde verticale = (filet haut du cadre, mi-alpha) - (bas du losange, mi-alpha).
Controle positif : le losange DOIT etre trouve sur le temoin (18) ou il est declare present.
Controle negatif : la meme sonde sur une bande vide (y 300..340) doit rendre 0 pixel.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

def est_or(c):
    r,g,b = c
    return r > 110 and (r-b) > 45 and g > 70 and g < r

def objets_or(im, y0, y1, xlo=0, xhi=1079, maxlarg=400, nom=""):
    """rangees ou il y a de l'or, limite en largeur (donc pas un filet pleine largeur)"""
    p = im.load()
    print(f"  [{nom}] balayage y{y0}..{y1}, x{xlo}..{xhi}")
    rows=[]
    for y in range(y0,y1+1):
        xs=[x for x in range(xlo,xhi+1) if est_or(p[x,y])]
        if xs and len(xs) <= maxlarg:
            rows.append((y, min(xs), max(xs), len(xs)))
    if not rows:
        print("    aucun objet or"); return None
    ys=[r[0] for r in rows]
    # regrouper en blocs contigus
    blocs=[]; cur=[rows[0]]
    for r in rows[1:]:
        if r[0]-cur[-1][0] <= 2: cur.append(r)
        else: blocs.append(cur); cur=[r]
    blocs.append(cur)
    for b in blocs:
        y0b,y1b = b[0][0], b[-1][0]
        xmin=min(r[1] for r in b); xmax=max(r[2] for r in b)
        larg=max(r[3] for r in b)
        print(f"    bloc y{y0b}..{y1b} (h={y1b-y0b+1})  x{xmin}..{xmax} (w={xmax-xmin+1})  n_max={larg}")
    return blocs

for nom, ycadre_hint in (('capture-1080x2400.png',482),('capture-1080x1920.png',250),
                         ('temoin-menu-plus-1080x2400.png',None)):
    print("="*70)
    im = ouvrir(nom)
    # le losange vit sous le bandeau (filet y141..142) et au-dessus du cadre
    ymax = (ycadre_hint-1) if ycadre_hint else 400
    objets_or(im, 145, ymax, nom=nom+" / losange")
    # controle negatif : bande vide
    print("  [ctrl negatif] bande y300..340 :")
    objets_or(im, 300, 340, nom="ctrl-neg")
