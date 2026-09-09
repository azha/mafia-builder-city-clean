# m02 : colonnes d'or verticales -> rails du cadre + tout element vertical dore (ascenseur ?)
# Controle positif : les deux rails du cadre doivent sortir dans les 3 images.
# Controle negatif  : la moitie GAUCHE ne doit porter qu'UN rail (le gauche).
import sys; sys.path.insert(0,'.')
from lib import *

def groupes(idx, tol=2):
    g=[]
    for v in idx:
        if g and v-g[-1][-1] <= tol: g[-1].append(v)
        else: g.append([v])
    return g

CAS = [('reference-1080x2102.png', 455, 2075),
       ('capture-1080x2400.png',   486, 2105),
       ('capture-1080x1920.png',   254, 1625)]

for nom, y0, y1 in CAS:
    im = ouvrir(nom); px = im.load(); W,H = im.size
    haut = y1-y0
    print("  bande verticale y=%d..%d (%d rangees)" % (y0,y1,haut))
    cols=[]
    for x in range(W):
        n = sum(1 for y in range(y0,y1) if est_or(px[x,y]))
        cols.append(n)
    forts = [x for x in range(W) if cols[x] >= 0.30*haut]
    for g in groupes(forts):
        c = g[len(g)//2]
        print("     colonne or x=%4d..%-4d (l=%d px)  couverture=%.1f%%  couleur=%s"
              % (g[0], g[-1], len(g), 100.0*max(cols[x] for x in g)/haut, mediane_fenetre(px, c, (y0+y1)//2, 1)))
    print()
