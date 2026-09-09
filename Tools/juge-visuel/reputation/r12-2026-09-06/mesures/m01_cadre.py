import sys; sys.path.insert(0,'.')
from lib import *

FICHIERS = [
 ('REF   ', '../reference-1080x2102.png'),
 ('C2400 ', '../capture-1080x2400.png'),
 ('C1920 ', '../capture-1080x1920.png'),
 ('S2400 ', '../capture-ecran-seul-1080x2400.png'),
 ('S1920T', '../capture-ecran-seul-1080x1920-T.png'),
]
print("=== m01 : rail OR du cadre (colonnes et lignes a forte densite d'or) ===")
for nom, f in FICHIERS:
    im = ouvrir(f); W,H = im.size
    col = colonnes_or(im)
    lig = lignes_or(im)
    # rails verticaux : colonnes dont la densite depasse 40% de H
    seuilc = 0.30*H
    cands = [x for x,v in enumerate(col) if v > seuilc]
    seuill = 0.55*W
    candl = [y for y,v in enumerate(lig) if v > seuill]
    def grouper(idx):
        g=[]; 
        for i in idx:
            if g and i-g[-1][-1] <= 3: g[-1].append(i)
            else: g.append([i])
        return [(x[0],x[-1]) for x in g]
    print(f"  {nom} colonnes-rail: {grouper(cands)}")
    print(f"  {nom} lignes-rail  : {grouper(candl)}")
    print(f"  {nom} max col={max(col)} (sur H={H}) max lig={max(lig)} (sur W={W})")
