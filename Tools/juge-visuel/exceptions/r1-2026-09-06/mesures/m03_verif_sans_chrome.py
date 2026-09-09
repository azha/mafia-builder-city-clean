# m03 — la capture "sans chrome" l'est-elle ? (le nom DÉCLARE, l'image PROUVE)
# Contrôle positif : sur la capture SOUS chrome, la bande 0..142 doit contenir de l'encre (le bandeau).
# Contrôle négatif : la même bande sur la capture déclarée sans chrome doit être vide.
from util import *
print("== m03 vérification 'sans chrome' ==")
cap=ouvrir(CAP); capsc=ouvrir(CAPSC)
FOND=(13,13,13)
def encre(im, y0,y1, seuil=25):
    px=im.load(); n=0; ymin=None; ymax=None
    for y in range(y0,y1):
        k=0
        for x in range(0,1080,2):
            c=px[x,y]
            if abs(c[0]-FOND[0])+abs(c[1]-FOND[1])+abs(c[2]-FOND[2])>seuil: k+=1
        if k>0:
            n+=k
            if ymin is None: ymin=y
            ymax=y
    return n, ymin, ymax
for nom, im in (("SOUS chrome", cap), ("déclarée SANS chrome", capsc)):
    a=encre(im,0,300); b=encre(im,2100,2400)
    print(f"  {nom:24s} : haut y0..300  px d'encre={a[0]:6d} bornes={a[1]},{a[2]}")
    print(f"  {' '*24}   bas y2100..2400 px d'encre={b[0]:6d} bornes={b[1]},{b[2]}")
# bornes exactes de l'encre sur toute l'image
for nom, im in (("SOUS chrome", cap), ("déclarée SANS chrome", capsc)):
    n,y0,y1=encre(im,0,2400)
    print(f"  {nom:24s} : encre totale={n} ; première ligne={y0} ; dernière={y1}")
