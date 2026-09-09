#!/usr/bin/env python3
"""Le decor (art du Verge d'Or) est-il rendu dans la zone de contenu ?
Grandeur : part de la zone de contenu qui est du NOIR PUR (0,0,0), et palette
quantifiee de la zone. Controle positif : la meme mesure sur le temoin v4-1
(qui PORTE le decor) doit rendre une part de noir pur tres faible ET une palette
riche -> l'instrument discrimine."""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def zone(path, y0, y1, echelle=1.0):
    im = Image.open(os.path.join(D,path)).convert('RGB')
    print(f"  ouvert: {path} taille={im.size}")
    if echelle!=1.0:
        im=im.resize((round(im.width*echelle),round(im.height*echelle)),Image.LANCZOS)
        print(f"    -> {im.size}")
    c = im.crop((0,y0,im.width,y1))
    print(f"    zone de contenu y={y0}..{y1} -> {c.size} ({c.width*c.height} px)")
    return c

def analyse(c, nom):
    px=c.load(); w,h=c.size; n=w*h
    noir=0; somme=[0,0,0]
    for y in range(h):
        for x in range(w):
            r,g,b=px[x,y]
            if r==0 and g==0 and b==0: noir+=1
            somme[0]+=r; somme[1]+=g; somme[2]+=b
    print(f"  [{nom}] noir pur (0,0,0) = {noir}/{n} = {100*noir/n:.1f}%")
    print(f"  [{nom}] couleur moyenne = ({somme[0]//n},{somme[1]//n},{somme[2]//n})")
    q=c.quantize(colors=8, method=Image.MEDIANCUT).convert('RGB')
    cols=sorted(q.getcolors(65536), reverse=True)
    print(f"  [{nom}] palette (8 teintes dominantes) :")
    for cnt,col in cols:
        print(f"      {col}  {100*cnt/n:5.1f}%")

# capture : zone libre entre bandeau (bas=143) et dock (haut=2171)
print("=== CAPTURE 2026-09-04 : zone de contenu y=143..2171 ===")
analyse(zone('capture-1080x2400.png',143,2171), 'capture')

# temoin v4-1 x1.2 : le cadre dessine sa propre barre ; contenu sous elle.
# bas de la barre du cadre mesure au 01 : y=98 (x3,0) -> 118 (x3,6). Dock du cadre : mesure ci-dessous.
print("\n=== TEMOIN v4-1 x1.2 : zone y=143..2102 (meme haut que la capture) ===")
analyse(zone('etats/v4-1.png',143,2102,1.2), 'temoin v4-1')

print("\n=== REFERENCE nominale : zone y=143..2102 ===")
analyse(zone('reference-1080x2102.png',143,2102), 'reference')

print("\n=== CAPTURE 2026-09-02 (seuil force) : zone y=143..2171 ===")
analyse(zone('capture-seuil-force-1080x2400.png',143,2171), 'capture seuil-force')
