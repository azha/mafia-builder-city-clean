#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Q3 — les compteurs : nombre de groupes, place, hauteur de chiffre, hauteur de libelle.

On segmente la bande des compteurs (entre le souligne or du titre et la bordure haute des cartes)
en bandes horizontales d'encre, puis chaque bande en GROUPES horizontaux (les blocs separes par
une gouttiere de plus de 25 px). Un groupe = un compteur.

CONTROLE POSITIF : la reference cadre-131 doit rendre TROIS groupes et la reference cadre-152 DEUX
(ce que l'oeil lit sur ces deux planches) — un instrument qui rend le meme compte sur les deux ne
discrimine pas. C'est a la fois le controle positif et le controle negatif.
"""
import os
from PIL import Image

D = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/39-dossier-nom-lieutenant/fin-ecran-2026-11-11"
X0, X1 = 55, 1025

def lum(p):
    return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]

# seuil 70 : AU-DESSUS de la bordure des boites de compteur (L~52 sur fond L~14, ecart 38)
# et EN DESSOUS des chiffres/libelles (ecart ~135). Un seuil plus bas fond les trois groupes
# en un seul (controle rate au 1er jet).
def bandes(im, y0, y1, seuil=70):
    px = im.load()
    tous = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(X0, X1, 2))
    fond = tous[len(tous)//4]
    segs, cur = [], None
    for y in range(y0, y1):
        n = sum(1 for x in range(X0, X1) if lum(px[x, y]) - fond > seuil)
        if n >= 3:
            if cur is None: cur = [y, y]
            cur[1] = y
        else:
            if cur is not None and y - cur[1] > 2:
                segs.append(cur); cur = None
    if cur: segs.append(cur)
    out = []
    for sy0, sy1 in segs:
        xs = sorted(set(x for y in range(sy0, sy1+1) for x in range(X0, X1)
                        if lum(px[x, y]) - fond > seuil))
        if not xs: continue
        groupes, g = [], [xs[0], xs[0]]
        for x in xs[1:]:
            if x - g[1] <= 25:
                g[1] = x
            else:
                groupes.append(g); g = [x, x]
        groupes.append(g)
        groupes = [t for t in groupes if t[1]-t[0] >= 12]
        out.append((sy0, sy1, sy1-sy0+1, groupes))
    return out

def rapporte(path, nom, y0, y1):
    im = Image.open(path).convert("RGB")
    print(f"\n--- {nom}  TAILLE LUE = {im.size}   bande y[{y0},{y1}]")
    for sy0, sy1, h, groupes in bandes(im, y0, y1):
        libelle = "CHIFFRES" if h >= 24 else "libelle "
        print(f"    {libelle} y[{sy0},{sy1}] h={h:3d}  {len(groupes)} groupe(s) : "
              + "  ".join(f"x[{g[0]},{g[1]}] w={g[1]-g[0]+1}" for g in groupes))

if __name__ == "__main__":
    print("=== REFERENCES (controle : 131 -> 3 groupes, 152 -> 2 groupes) ===")
    rapporte(f"{D}/reference/cadre-131.png", "REF cadre-131", 672, 790)
    rapporte(f"{D}/reference/cadre-150.png", "REF cadre-150", 672, 800)
    rapporte(f"{D}/reference/cadre-152.png", "REF cadre-152", 672, 790)
    rapporte(f"{D}/reference/cadre-153.png", "REF cadre-153", 672, 790)
    print("\n=== CAPTURES ===")
    for f in sorted(os.listdir(f"{D}/captures")):
        res = 1920 if "1920" in f else 2400
        y0, y1 = (660, 810) if res == 1920 else (770, 920)
        rapporte(f"{D}/captures/{f}", f"CAP {f}", y0, y1)
