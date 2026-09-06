#!/usr/bin/env python3
"""m06 - le titre 'Le miroir' : bbox d'encre, hauteur de capitale, contraste.
Encre du titre = pixel dore (r>g>b) de luminance > 60 dans la fenetre du titre.
Contraste WCAG mesure entre la MEDIANE des 10% de pixels les plus clairs de
l'encre et la MEDIANE du fond local (fenetre elargie, pixels non-encre).
Controle positif : au 2400 le titre doit sortir avec un contraste > 8 (il est
sur le fond propre du bandeau du cadre) ; c'est la valeur de reference r10 (11,55).
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lin(c):
    c/=255.0
    return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
def L(p): return 0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2])
def contraste(a,b):
    la,lb=L(a),L(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)

def mesure(f, y0,y1, x0=200,x1=880, nom=''):
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    enc=[]; fond=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            l=0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
            if p[0]>p[1]>p[2] and l>70: enc.append((l,p,x,y))
            elif l<40: fond.append((l,p))
    if not enc:
        print(f'  {nom}: AUCUNE encre'); return
    enc.sort(key=lambda t:-t[0])
    top=enc[:max(1,len(enc)//10)]
    cenc=tuple(int(statistics.median([t[1][i] for t in top])) for i in range(3))
    cfond=tuple(int(statistics.median([t[1][i] for t in fond])) for i in range(3)) if fond else (0,0,0)
    xs=[t[2] for t in enc]; ys=[t[3] for t in enc]
    print(f'  {nom}: n_encre={len(enc)}  bbox x {min(xs)}..{max(xs)} y {min(ys)}..{max(ys)} '
          f'(l={max(xs)-min(xs)+1} h={max(ys)-min(ys)+1})  encre={cenc} fond={cfond} '
          f'contraste={contraste(cenc,cfond):.2f}')

print('=== titre "Le miroir"')
mesure('reference-1080x2102.png', 495, 575, nom='reference  (y 495..575)')
mesure('capture-1080x2400.png',   530, 610, nom='capture2400 (y 530..610)')
mesure('capture-1080x1920.png',    50, 130, nom='capture1920 (y  50..130)')
