#!/usr/bin/env python3
# m01 — frontieres horizontales (bandes) de la reference et de la capture.
# Methode : mediane de la ligne (sur x=30..1050), puis frontiere la ou la
# distance L1 entre deux lignes consecutives depasse un seuil.
# Controle positif : la largeur des deux images DOIT etre 1080 (echelle x3,6 des deux cotes).
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def med(vals):
    v = sorted(vals); n = len(v)
    return v[n//2]

def profil(path, x0=30, x1=1050):
    im = Image.open(path).convert('RGB')
    print(f"  OUVERT {os.path.basename(path)} taille={im.size}")
    W,H = im.size
    px = im.load()
    lignes = []
    for y in range(H):
        r = med([px[x,y][0] for x in range(x0,x1,7)])
        g = med([px[x,y][1] for x in range(x0,x1,7)])
        b = med([px[x,y][2] for x in range(x0,x1,7)])
        lignes.append((r,g,b))
    return im, lignes

def frontieres(lignes, seuil=14):
    out = []
    for y in range(1,len(lignes)):
        a,b = lignes[y-1], lignes[y]
        d = abs(a[0]-b[0])+abs(a[1]-b[1])+abs(a[2]-b[2])
        if d >= seuil:
            out.append((y,d,a,b))
    # fusionner les frontieres adjacentes (garder la plus forte d'un groupe)
    grp = []
    for f in out:
        if grp and f[0] - grp[-1][-1][0] <= 3:
            grp[-1].append(f)
        else:
            grp.append([f])
    return [max(g, key=lambda t:t[1]) for g in grp]

print("=== m01 frontieres horizontales ===")
for nom, rel in (("REFERENCE","reference-1080x2102.png"), ("CAPTURE","capture-1080x2400.png")):
    p = os.path.join(D, rel)
    im, lg = profil(p)
    W,H = im.size
    assert W == 1080, f"CONTROLE POSITIF ECHOUE : largeur {W} != 1080"
    print(f"  CONTROLE POSITIF ok : largeur=1080 (=300 CSS x3,6)")
    fr = frontieres(lg)
    print(f"  {nom} : {len(fr)} frontieres (seuil L1>=14)")
    for y,d,a,b in fr:
        print(f"    y={y:4d}  ({y/3.6:7.1f} CSS)  d={d:3d}  {a} -> {b}")
    print()
