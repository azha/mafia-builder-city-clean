#!/usr/bin/env python3
# 01 — profil vertical d'ENCRE : ou y a-t-il quelque chose, ou n'y a-t-il rien.
# Controle positif : la largeur des images doit etre celle annoncee par le dossier.
# Controle negatif : la bande du dock de la capture DOIT sortir non vide (des ronds y sont visibles).
from PIL import Image
import os, sys
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def lum(p):
    return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]

def profil(path, seuil_ecart=14):
    im = Image.open(os.path.join(D, path)).convert('RGB')
    W, H = im.size
    print(f"  OUVERT {path} -> {W}x{H}")
    px = im.load()
    # fond de reference = mediane de luminance de la ligne
    lignes = []
    for y in range(H):
        vals = [lum(px[x, y]) for x in range(0, W, 4)]
        vals_tri = sorted(vals)
        med = vals_tri[len(vals_tri)//2]
        # encre = pixels dont la luminance s'ecarte de la mediane de la ligne
        n = sum(1 for v in vals if abs(v - med) > seuil_ecart)
        lignes.append((n, med))
    return im, lignes, W, H

def bandes(lignes, W, seuil_px=2):
    # regroupe les lignes "non vides" (>seuil_px echantillons d'encre) en bandes
    ech = W // 4
    out = []
    deb = None
    for y, (n, med) in enumerate(lignes):
        vide = (n <= seuil_px)
        if not vide and deb is None:
            deb = y
        elif vide and deb is not None:
            if y - deb >= 3:
                out.append((deb, y-1))
            deb = None
    if deb is not None:
        out.append((deb, len(lignes)-1))
    return out

for f in ['capture-1080x2400.png', 'reference-1080x2102.png']:
    print(f"=== {f} ===")
    im, lignes, W, H = profil(f)
    bs = bandes(lignes, W)
    print(f"  bandes d'encre (y0-y1, hauteur) : {len(bs)}")
    for (a,b) in bs:
        print(f"    {a:5d}-{b:5d}  h={b-a+1:5d}  lum_med_fond={lignes[(a+b)//2][1]:6.1f}")
    # plus grand trou
    trous = []
    prev = 0
    for (a,b) in bs:
        if a - prev > 20:
            trous.append((prev, a-1, a-prev))
        prev = b+1
    if H - prev > 20:
        trous.append((prev, H-1, H-prev))
    trous.sort(key=lambda t: -t[2])
    print(f"  plus grands VIDES : {[(t[0],t[1],t[2]) for t in trous[:4]]}")
