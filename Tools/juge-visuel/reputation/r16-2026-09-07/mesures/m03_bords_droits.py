# m03 : bord DROIT de l'encre, rangee par rangee, a l'interieur du cadre.
# But : voir si quelque chose est coupe / masque a droite a 1920.
# Controle positif : le rail droit du cadre (x=1059..1061) sort dans les 3 images.
# Controle negatif : le bord GAUCHE de l'encre, meme methode.
import sys; sys.path.insert(0,'.')
from lib import *

def fond_rangee(px, y, x0, x1):
    return mediane([lum(px[x,y]) for x in range(x0,x1)])

def extremes_encre(im, y, x0, x1, marge=8):
    px = im.load()
    f = fond_rangee(px, y, x0, x1)
    xs = [x for x in range(x0,x1) if abs(lum(px[x,y]) - f) > marge]
    if not xs: return None
    return (min(xs), max(xs))

CAS = [('reference-1080x2102.png', 452, 2078),
       ('capture-1080x2400.png',   482, 2109),
       ('capture-1080x1920.png',   250, 1629)]

for nom, ya, yb in CAS:
    im = ouvrir(nom); px = im.load()
    print("  CONTROLE POSITIF rail droit du cadre : couleur a x=1060,y=%d -> %s" % ((ya+yb)//2, mediane_fenetre(px,1060,(ya+yb)//2,1)))
    # histogramme des bords droits
    from collections import Counter
    cd = Counter(); cg = Counter()
    for y in range(ya+6, yb-6):
        e = extremes_encre(im, y, 24, 1057)
        if e:
            cd[e[1]] += 1; cg[e[0]] += 1
    print("  bords DROITS les plus frequents :", cd.most_common(8))
    print("  bords GAUCHES les plus frequents (controle negatif) :", cg.most_common(6))
    print()
