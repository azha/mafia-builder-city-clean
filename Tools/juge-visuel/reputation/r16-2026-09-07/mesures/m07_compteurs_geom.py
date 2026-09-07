# m07 : localisation des 3 boites de compteur + de l'encre cyan des chiffres.
# Controle positif : le jeton cyan (127,212,217) doit etre trouve dans les 3 images.
import sys; sys.path.insert(0,'.')
from lib import *

CYAN=(127,212,217)
def est_cyan(c, tol=28):
    return abs(c[0]-CYAN[0])<=tol and abs(c[1]-CYAN[1])<=tol and abs(c[2]-CYAN[2])<=tol

CAS=[('reference-1080x2102.png', 640, 830),
     ('capture-1080x2400.png',   660, 860),
     ('capture-1080x1920.png',   430, 630)]

def groupes(idx, tol=3):
    g=[]
    for v in idx:
        if g and v-g[-1][-1]<=tol: g[-1].append(v)
        else: g.append([v])
    return g

for nom,ya,yb in CAS:
    im=ouvrir(nom); px=im.load(); W,H=im.size
    ys=[y for y in range(ya,yb) if any(est_cyan(px[x,y]) for x in range(0,W))]
    xs=[x for x in range(0,W) if any(est_cyan(px[x,y]) for y in range(ya,yb))]
    print("   CONTROLE POSITIF : px cyan trouves ->", bool(ys))
    print("   bande cyan y=%d..%d (h=%d)" % (min(ys),max(ys),max(ys)-min(ys)+1))
    gx=[ (g[0],g[-1]) for g in groupes(xs, tol=12) ]
    print("   groupes cyan en x :", gx)
    # boite des compteurs : bord de la boite (liseré) - on cherche les rangees a fort contraste horizontal
    print()
