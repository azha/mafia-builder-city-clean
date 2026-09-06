# m01 — repères : le cadre (filets or) dans la référence et dans chaque capture.
# Contrôle positif : la largeur hors-tout du cadre doit être ~1038-1044 px (mesuré au r12) dans les deux.
# Contrôle négatif : le bandeau du chrome (hors cadre) ne doit PAS être détecté comme filet or.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def est_or(c):
    r,g,b = c
    return r > 120 and g > 90 and b < 120 and r > b + 55 and r >= g

def profil(im, nom):
    p = px(im); W,H = im.size
    print(f"\n=== {nom} ({W}x{H}) ===")
    # lignes : compte de px or par rangée
    lignes = []
    for y in range(H):
        n = sum(1 for x in range(0, W, 2) if est_or(p[x,y]))
        lignes.append(n*2)
    # rangées "filet horizontal" = > 60 % de la largeur
    seuil = int(W*0.60)
    fh = [y for y,n in enumerate(lignes) if n >= seuil]
    # groupes
    grp = []
    for y in fh:
        if grp and y == grp[-1][-1]+1: grp[-1].append(y)
        else: grp.append([y])
    print("  filets horizontaux (>=60% largeur en or) :", [(g[0],g[-1],len(g)) for g in grp])
    return lignes, grp

for nom in ['reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png',
            'capture-ecran-seul-1080x2400.png','capture-ecran-seul-1080x1920-T.png']:
    im = ouvrir(nom); profil(im, nom)
