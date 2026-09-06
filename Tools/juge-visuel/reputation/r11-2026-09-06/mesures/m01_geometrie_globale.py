#!/usr/bin/env python3
"""m01 - geometrie globale : filet or du cadre, bandeau, dock.
Convention de bord declaree : un pixel est 'or' si sa distance L1 au jeton
or_filet (176,141,62) est <= 120 ET R>G>B (famille doree). On rapporte
- le PREMIER et le DERNIER y ou une rangee contient >= 400 px 'or' (= le filet
  horizontal plein largeur du cadre), au seuil NOMINAL (mi-alpha, cf rapport).
Controle positif : la largeur de l'image doit valoir 1080 partout.
"""
from PIL import Image
import os, sys

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOLD = (176,141,62)

def est_or(p):
    r,g,b = p[0],p[1],p[2]
    return abs(r-GOLD[0])+abs(g-GOLD[1])+abs(b-GOLD[2]) <= 120 and r>g>b

def profil_or(im):
    w,h = im.size
    px = im.load()
    out = []
    for y in range(h):
        n = 0
        for x in range(w):
            if est_or(px[x,y]): n += 1
        out.append(n)
    return out

for f in ['reference-1080x2102.png','capture-1080x1920.png','capture-1080x2400.png']:
    im = Image.open(os.path.join(D,f)).convert('RGB')
    w,h = im.size
    print(f'=== {f}  taille={im.size}')
    assert w == 1080, 'controle positif largeur'
    prof = profil_or(im)
    lignes = [y for y,n in enumerate(prof) if n >= 400]
    if lignes:
        # regroupe en bandes contigues
        bandes = []
        deb = lignes[0]; prev = lignes[0]
        for y in lignes[1:]:
            if y - prev > 3:
                bandes.append((deb,prev)); deb = y
            prev = y
        bandes.append((deb,prev))
        print('  bandes horizontales or (>=400 px/ligne) :', bandes)
    # colonnes du filet vertical : x ou une colonne a >=800 px or
    px = im.load()
    colonnes = []
    for x in range(w):
        n = sum(1 for y in range(h) if est_or(px[x,y]))
        if n >= 800: colonnes.append((x,n))
    print('  colonnes verticales or (>=800 px) :', colonnes[:6], '...', colonnes[-6:] if len(colonnes)>6 else '')
