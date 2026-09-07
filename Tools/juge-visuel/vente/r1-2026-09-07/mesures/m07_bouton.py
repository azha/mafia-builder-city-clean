# m07 — CAPTURE : le cadre du bouton RAMASSER. Est-il CONTINU ?
# Methode : pour chaque colonne x, chercher un pixel de bord (lum>30 sur fond 13) dans la bande
# du bord HAUT (y 520..545) et du bord BAS (y 615..645) du bouton.
# Controle positif : le cadre de la CARTE (bord haut y 343..350) doit etre CONTINU sur x 60..1020.
# Controle negatif : une bande VIDE (y 700..730) doit rendre 0 colonne.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def couverture(nom, y0,y1, x0,x1, seuil=30, etiquette=''):
    im=Image.open(os.path.join(D,nom)).convert('RGB'); px=im.load()
    cols=[]
    for x in range(x0,x1):
        if any(lum(px[x,y])>seuil for y in range(y0,y1)): cols.append(x)
    trous=[]
    if cols:
        prev=cols[0]
        for c in cols[1:]:
            if c-prev>1: trous.append((prev+1,c-1))
            prev=c
    print(f'  {etiquette} bande y={y0}..{y1} x={x0}..{x1} : {len(cols)}/{x1-x0} colonnes ont un pixel lum>{seuil}')
    if cols: print(f'    couverture x={min(cols)}..{max(cols)} ; TROUS = {trous}')
    return cols,trous

for nom in ['capture-1080x2400.png','capture-planche-1080x2400.png']:
    im=Image.open(os.path.join(D,nom)); print(f'=== {nom} {im.size} ===')
    couverture(nom, 343,352, 60,1020, 30, 'CONTROLE POSITIF cadre CARTE (haut)')
    couverture(nom, 700,730, 60,1020, 30, 'CONTROLE NEGATIF bande vide')
    couverture(nom, 524,536, 60,1020, 25, 'BOUTON bord HAUT')
    couverture(nom, 630,644, 60,1020, 25, 'BOUTON bord BAS')
    # bords verticaux du bouton
    im2=Image.open(os.path.join(D,nom)).convert('RGB'); px=im2.load()
    y=580
    g=[x for x in range(40,1050) if lum(px[x,y])>25]
    print(f'  BOUTON a y={y} : colonnes lum>25 = {g[:6]} ... {g[-6:]}')
    print()
