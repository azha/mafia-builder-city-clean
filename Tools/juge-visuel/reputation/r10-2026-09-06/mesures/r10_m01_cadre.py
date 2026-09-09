# r10-m01 : localiser le filet dore du CADRE (bbox) dans reference et captures.
# Controle positif : largeur des images = 1080 des trois cotes (imprime).
# Controle negatif : le meme detecteur sur une bande de FOND (hors cadre) doit rendre 0 ligne.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"

def gold(p):
    r,g,b=p
    return r>110 and g>85 and b<120 and (r-b)>50 and (g-b)>20

def scan(path):
    im=Image.open(D+path).convert("RGB"); W,H=im.size
    px=im.load()
    rows=[0]*H; cols=[0]*W
    for y in range(H):
        c=0
        for x in range(W):
            if gold(px[x,y]):
                c+=1; cols[x]+=1
        rows[y]=c
    hor=[y for y in range(H) if rows[y]>0.70*W]
    ver=[x for x in range(W) if cols[x]>0.30*H]
    print(f"{path}  taille={W}x{H}")
    print(f"   filets HORIZONTAUX (>70% de la largeur) : {hor}")
    print(f"   filets VERTICAUX  (>30% de la hauteur)  : {ver}")
    return hor,ver,rows,cols,W,H

for f in ["reference-1080x2102.png","capture-1080x2400.png","capture-1080x1920.png"]:
    scan(f); print()
