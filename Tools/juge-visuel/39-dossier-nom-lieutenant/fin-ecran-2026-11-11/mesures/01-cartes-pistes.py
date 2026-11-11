#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 1+2 — inventaire structurel des TROIS CARTES de pistes, reference et captures.

Pour chaque image : localise la bordure haute des cartes (ligne claire coupee par exactement
deux gouttieres interieures), donne la bbox de chaque carte, puis segmente l'interieur de chaque
carte en bandes d'encre (titre, barres, mot de gravite, sous-ligne) avec bbox d'encre exacte,
hauteur d'encre et couleur mediane de l'encre.

CONTROLE POSITIF : la largeur de chaque image doit etre 1080 px, et les DEUX GOUTTIERES entre
cartes doivent mesurer 18 px partout (reference comme captures) — grandeur dont on sait qu'elle
est egale. Si une gouttiere n'est pas 18, l'instrument ne lit pas les bonnes cartes.
CONTROLE NEGATIF : la carte 1 de `quiet` ne doit PAS etre trouvee (la vue Vide n'a pas de cartes) ;
un instrument qui "trouve" trois cartes dans la vue Vide ne discrimine pas.
"""
import os, sys
from PIL import Image

D = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/39-dossier-nom-lieutenant/fin-ecran-2026-11-11"

def lum(p):
    return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]

def trouve_cartes(im):
    """Renvoie (y_bordure, [(x0,x1),(x0,x1),(x0,x1)]) ou None."""
    px = im.load(); W, H = im.size
    for y in range(int(H*0.30), int(H*0.70)):
        clair = [x for x in range(70, 1010) if lum(px[x, y]) > 34]
        if len(clair) < 820:
            continue
        x0, x1 = min(clair), max(clair)
        trous = []
        cur = None
        for x in range(x0, x1+1):
            if lum(px[x, y]) <= 34:
                if cur is None: cur = [x, x]
                cur[1] = x
            else:
                if cur is not None:
                    trous.append(cur); cur = None
        trous = [t for t in trous if t[1]-t[0]+1 >= 10]
        if len(trous) == 2:
            a, b = trous
            boites = [(x0, a[0]-1), (a[1]+1, b[0]-1), (b[1]+1, x1)]
            larg = [p[1]-p[0]+1 for p in boites]
            # les TROIS cartes de pistes sont de largeur egale ; la rangee des COMPTEURS ne
            # l'est pas (le compteur du milieu est plus large) -> discrimine les deux rangees
            if max(larg) - min(larg) > 6:
                continue
            return y, boites, [a[1]-a[0]+1, b[1]-b[0]+1]
    return None

def bas_carte(im, y_haut, x0, x1):
    px = im.load(); H = im.size[1]
    for y in range(y_haut+60, min(H, y_haut+700)):
        clair = sum(1 for x in range(x0+4, x1-3) if lum(px[x, y]) > 34)
        if clair > (x1-x0-8)*0.92:
            return y
    return None

def segmente(im, x0, x1, y0, y1, seuil=16):
    px = im.load()
    tous = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(x0, x1))
    fond = tous[len(tous)//2]
    rows = []
    for y in range(y0, y1):
        rows.append(sum(1 for x in range(x0, x1) if abs(lum(px[x, y]) - fond) > seuil))
    segs, cur = [], None
    for i, n in enumerate(rows):
        y = y0 + i
        if n >= 3:
            if cur is None: cur = [y, y]
            cur[1] = y
        else:
            if cur is not None and y - cur[1] > 3:
                segs.append(cur); cur = None
    if cur: segs.append(cur)
    out = []
    for sy0, sy1 in segs:
        pts = [(x, y) for y in range(sy0, sy1+1) for x in range(x0, x1)
               if abs(lum(px[x, y]) - fond) > seuil]
        if not pts: continue
        ex0 = min(p[0] for p in pts); ex1 = max(p[0] for p in pts)
        enc = sorted(((lum(px[x, y]), px[x, y]) for x, y in pts), key=lambda t: -t[0])
        top = enc[:max(1, len(enc)//10)]
        rs = sorted(c[1][0] for c in top); gs = sorted(c[1][1] for c in top); bs = sorted(c[1][2] for c in top)
        m = len(rs)//2
        out.append(dict(y0=sy0, y1=sy1, h=sy1-sy0+1, x0=ex0, x1=ex1, w=ex1-ex0+1,
                        col=(rs[m], gs[m], bs[m]), plein=(ex1-ex0+1) > (x1-x0)*0.8))
    return out

def rapporte(path, nom):
    im = Image.open(path).convert("RGB")
    print(f"\n######## {nom}")
    print(f"  fichier={path}")
    print(f"  TAILLE LUE = {im.size}")
    t = trouve_cartes(im)
    if t is None:
        print("  AUCUNE carte de piste trouvee (vue Vide ?)")
        return None
    yb, cartes, gout = t
    print(f"  bordure haute des cartes y={yb}  gouttieres={gout} px (attendu 18/18)")
    res = []
    for i, (cx0, cx1) in enumerate(cartes, 1):
        yb2 = bas_carte(im, yb, cx0, cx1)
        print(f"  --- carte C{i}  x[{cx0},{cx1}] w={cx1-cx0+1}  y[{yb},{yb2}] h={(yb2-yb+1) if yb2 else '?'}")
        segs = segmente(im, cx0+5, cx1-4, yb+5, (yb2 or yb+400)-4)
        for s in segs:
            kind = "BARRE " if s['plein'] else "texte "
            print(f"      {kind} y[{s['y0']},{s['y1']}] h={s['h']:3d}  encre x[{s['x0']},{s['x1']}] w={s['w']:3d}"
                  f"  dy/haut={s['y0']-yb:3d}  couleur={s['col']}")
        res.append((cx0, cx1, yb, yb2, segs))
    return res

if __name__ == "__main__":
    print("=== REFERENCES ===")
    for f in ["cadre-131.png", "cadre-150.png", "cadre-152.png", "cadre-153.png"]:
        rapporte(f"{D}/reference/{f}", f"REF {f}")
    print("\n\n=== CAPTURES ===")
    for f in sorted(os.listdir(f"{D}/captures")):
        rapporte(f"{D}/captures/{f}", f"CAP {f}")
