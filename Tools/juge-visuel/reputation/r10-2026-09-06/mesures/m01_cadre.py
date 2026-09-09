# m01 - localiser le cadre dore (bbox) dans reference et capture.
# Controle positif : la largeur de l'image doit etre 1080 des deux cotes.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"

def gold(p):
    r,g,b=p
    return r>120 and g>90 and b<110 and r-b>60 and g-b>25

def scan(path):
    im=Image.open(path).convert("RGB"); W,H=im.size
    print(f"{path.split('/')[-1]}  taille={W}x{H}")
    px=im.load()
    rows=[]; cols=[0]*W
    for y in range(H):
        c=0
        for x in range(W):
            if gold(px[x,y]): c+=1; cols[x]+=1
        rows.append(c)
    # lignes ou le dore couvre >60% de la largeur => filet horizontal du cadre
    big=[y for y,c in enumerate(rows) if c>0.6*W]
    print("  lignes a >60% de dore :", big[:6], "...", big[-6:] if len(big)>6 else "")
    bigc=[x for x,c in enumerate(cols) if c>0.3*H]
    print("  colonnes a >30% de dore :", bigc[:8], "...", bigc[-8:] if len(bigc)>8 else "")
    return rows,cols,W,H

for f in ["reference-1080x2102.png","capture-1080x2400.png"]:
    scan(D+f); print()
