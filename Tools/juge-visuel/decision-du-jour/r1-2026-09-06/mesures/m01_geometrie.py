#!/usr/bin/env python3
"""m01 - profils de luminance par ligne + reperage des bandes (chrome / contenu / vide).
Controle positif : la largeur des deux images est 1080 (echelle contenu x3,6 des deux cotes).
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, 'reference-1080x2102.png')
CAP = os.path.join(D, 'capture-1080x2400.png')

def lum(p):
    return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]

def profil(path, label):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    print(f"[{label}] fichier={os.path.basename(path)} taille={W}x{H}")
    px = im.load()
    rows = []
    for y in range(H):
        s = 0.0; mx = 0.0
        for x in range(0, W, 4):
            l = lum(px[x, y]); s += l
            if l > mx: mx = l
        rows.append((s/(W/4), mx))
    return im, W, H, rows

for path, label in ((REF, 'REF'), (CAP, 'CAP')):
    im, W, H, rows = profil(path, label)
    print(f"[{label}] CONTROLE POSITIF largeur = {W} (attendu 1080) -> {'OK' if W==1080 else 'ECHEC'}")
    # bandes : lignes dont la luminance moyenne depasse un plancher
    print(f"[{label}] profil (1 ligne sur 40) : y, lum_moy, lum_max")
    for y in range(0, H, 40):
        print(f"   y={y:5d}  moy={rows[y][0]:7.2f}  max={rows[y][1]:6.1f}")
    print()
