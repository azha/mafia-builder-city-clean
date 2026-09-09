# m05 — CAPTURE : blocs internes, detectes par sauts de luminance sur colonnes/lignes choisies.
# Controle positif : la colonne x=2 (hors de tout) doit rester au fond (~13) sur la zone de contenu.
# Controle negatif : la colonne x=540 doit rencontrer AU MOINS 2 frontieres (haut/bas de la carte).
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

for nom in ['capture-1080x2400.png','capture-planche-1080x2400.png']:
    im = Image.open(os.path.join(D,nom)).convert('RGB'); px=im.load(); w,h=im.size
    print(f'=== {nom} taille={im.size} ===')
    # 1) colonnes : frontieres horizontales de la carte
    for x in [60, 540, 1000]:
        fr=[]
        for y in range(310, 760):
            a=lum(px[x,y-1]); b=lum(px[x,y])
            if abs(b-a)>6: fr.append((y, round(a,1), round(b,1)))
        print(f'  colonne x={x} : frontieres y (|dL|>6) = {[f[0] for f in fr]}')
    # 2) bord gauche/droit de la carte a mi-hauteur
    y=500
    g=None;d=None
    for xx in range(w):
        if lum(px[xx,y])-13.0>6: g=xx;break
    for xx in range(w-1,-1,-1):
        if lum(px[xx,y])-13.0>6: d=xx;break
    print(f'  a y={y} : carte x={g}..{d} largeur={d-g+1} rgb_g={px[g,y]} rgb_d={px[d,y]}')
    # 3) fond a l'interieur de la carte (mediane fenetre)
    vals=[]
    for yy in range(560,600):
        for xx in range(760,900):
            vals.append(px[xx,yy])
    vals.sort(key=lambda p:lum(p)); med=vals[len(vals)//2]
    print(f'  fond INTERIEUR carte (mediane 140x40 @ x760..900 y560..600) = {med}')
    # 4) fond hors carte
    vals=[]
    for yy in range(1200,1240):
        for xx in range(400,600):
            vals.append(px[xx,yy])
    vals.sort(key=lambda p:lum(p)); med2=vals[len(vals)//2]
    print(f'  fond HORS carte (mediane 200x40 @ y1200) = {med2}')
    # 5) zone vide : y du dernier pixel de contenu avant le dock
    dernier=None
    for y in range(700, 2200):
        mx=max(lum(px[x,y]) for x in range(0,w,3))
        if mx>40: dernier=y
    print(f'  dernier y<2200 avec un pixel lum>40 : {dernier}')
    # 6) dock : haut du dock (premiere ligne >=2100 avec un pixel lum>40)
    premier=None
    for y in range(2100, h):
        mx=max(lum(px[x,y]) for x in range(0,w,3))
        if mx>40: premier=y; break
    print(f'  premiere ligne du dock (lum>40) : {premier}')
    # 7) fond du dock vs fond de l'ecran
    vals=[]
    for yy in range(2360,2390):
        for xx in range(20,120):
            vals.append(px[xx,yy])
    vals.sort(key=lambda p:lum(p)); print(f'  fond dock bas (mediane) = {vals[len(vals)//2]}')
    print(f'  CONTROLE POSITIF colonne x=2 y=1000..1100 lum max = {max(lum(px[2,y]) for y in range(1000,1100)):.1f} (attendu ~13)')
    print()
