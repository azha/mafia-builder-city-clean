#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Q1 (titre nomme), Q3 (compteurs) et contrastes.

Q1 : bbox d'encre des deux lignes du titre de la carte 3, marges a la boite de texte (prise egale
     a l'emprise des barres, seule reference interne fiable), hauteur d'encre (hauteur de
     capitale : le titre est tout en capitales, sans jambage).
Q3 : rangee des compteurs — nombre de boites, bbox de chacune, boite mise en avant (bord or).
Contraste : rapport WCAG entre l'encre et son fond, mesure sur les pixels REELS.

CONTROLE POSITIF Q1 : la ligne 1 du titre de la carte 2 (« CE QUI SORT DES ») est HORS lot ;
     sa bbox d'encre doit etre la MEME en reference (x430..646) et en capture (x431..647).
CONTROLE POSITIF contraste : le blanc du titre « Le dossier » sur son fond doit sortir > 7:1
     dans la reference comme dans les captures.
CONTROLE NEGATIF contraste : le tiret « — » fondu a 1920 doit sortir PLUS BAS qu'a 2400.
"""
import os
from PIL import Image

D = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/39-dossier-nom-lieutenant/fin-ecran-2026-11-11"
HAUT = {1920: 875, 2400: 976}      # bordure haute des cartes (01-cartes-pistes.py)
C3 = (707, 1004)                   # carte 3 en capture
C3_REF = (705, 997)                # carte 3 en reference
BARRES_CAP = (729, 982)            # emprise des barres de C3 en capture = boite de texte
BARRES_REF = (729, 973)            # idem en reference

def lum(p):
    return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]

def rel(c):
    def f(v):
        v = v/255.0
        return v/12.92 if v <= 0.04045 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2])

def contraste(encre, fond):
    a, b = rel(encre), rel(fond)
    if a < b: a, b = b, a
    return (a+0.05)/(b+0.05)

def bandes(im, x0, x1, y0, y1, seuil=16):
    px = im.load()
    tous = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(x0, x1))
    fond = tous[len(tous)//4]
    segs, cur = [], None
    for y in range(y0, y1):
        n = sum(1 for x in range(x0, x1) if lum(px[x, y]) - fond > seuil)
        if n >= 3:
            if cur is None: cur = [y, y]
            cur[1] = y
        else:
            if cur is not None and y - cur[1] > 2:
                segs.append(cur); cur = None
    if cur: segs.append(cur)
    out = []
    for sy0, sy1 in segs:
        pts = [(x, y) for y in range(sy0, sy1+1) for x in range(x0, x1)
               if lum(px[x, y]) - fond > seuil]
        ex0 = min(p[0] for p in pts); ex1 = max(p[0] for p in pts)
        best = max(pts, key=lambda p: lum(px[p[0], p[1]]))
        out.append((sy0, sy1, sy1-sy0+1, ex0, ex1, ex1-ex0+1, px[best[0], best[1]]))
    return out

def fond_carte(im, x0, yb, dy):
    px = im.load()
    v = [px[x, yb+dy+k] for x in range(x0+8, x0+22) for k in range(0, 4)]
    r = sorted(c[0] for c in v); g = sorted(c[1] for c in v); b = sorted(c[2] for c in v)
    m = len(r)//2
    return (r[m], g[m], b[m])

print("########## Q1 — titre nomme de la carte 3 (et controle sur la carte 2, hors lot)")
print(f"{'planche':34s} {'ligne':6s} {'bbox encre':>22s} {'h':>3s} {'w':>4s} {'marge G':>8s} {'marge D':>8s}")
for f in ["cadre-152.png", "cadre-153.png"]:
    im = Image.open(f"{D}/reference/{f}").convert("RGB")
    print(f"  (REF {f} TAILLE LUE = {im.size})")
    for i, b in enumerate(bandes(im, C3_REF[0]+5, C3_REF[1]-4, 882, 970), 1):
        print(f"{'REF '+f:34s} L{i:<5d} x[{b[3]:4d},{b[4]:4d}] y[{b[0]}] {b[2]:3d} {b[5]:4d} "
              f"{b[3]-BARRES_REF[0]:8d} {BARRES_REF[1]-b[4]:8d}")
for f in sorted(os.listdir(f"{D}/captures")):
    if "quiet" in f: continue
    res = 1920 if "1920" in f else 2400
    im = Image.open(f"{D}/captures/{f}").convert("RGB")
    yb = HAUT[res]
    for i, b in enumerate(bandes(im, C3[0]+5, C3[1]-4, yb+8, yb+70), 1):
        print(f"{f:34s} L{i:<5d} x[{b[3]:4d},{b[4]:4d}] y[{b[0]}] {b[2]:3d} {b[5]:4d} "
              f"{b[3]-BARRES_CAP[0]:8d} {BARRES_CAP[1]-b[4]:8d}   (TAILLE {im.size})")

print("\n########## CONTROLE POSITIF Q1 — carte 2, ligne 1 « CE QUI SORT DES » (hors lot)")
im = Image.open(f"{D}/reference/cadre-152.png").convert("RGB")
b = bandes(im, 398, 682, 882, 930)[0]
print(f"  REF cadre-152 TAILLE={im.size} : x[{b[3]},{b[4]}] w={b[5]} h={b[2]}")
for res in (2400, 1920):
    im = Image.open(f"{D}/captures/E13_Dossier_watched_fr_1080x{res}.png").convert("RGB")
    yb = HAUT[res]
    b = bandes(im, 396, 684, yb+8, yb+45)[0]
    print(f"  CAP watched_fr {res} TAILLE={im.size} : x[{b[3]},{b[4]}] w={b[5]} h={b[2]}")

print("\n########## Q3 — rangee des compteurs")
def compteurs(im, nom):
    px = im.load(); H = im.size[1]
    for y in range(int(H*0.25), int(H*0.45)):
        clair = [x for x in range(40, 1045) if lum(px[x, y]) > 30]
        if len(clair) < 780: continue
        x0, x1 = min(clair), max(clair)
        trous, cur = [], None
        for x in range(x0, x1+1):
            if lum(px[x, y]) <= 30:
                if cur is None: cur = [x, x]
                cur[1] = x
            else:
                if cur is not None: trous.append(cur); cur = None
        trous = [t for t in trous if t[1]-t[0]+1 >= 8]
        if len(trous) in (1, 2):
            boites = []
            prev = x0
            for t in trous:
                boites.append((prev, t[0]-1)); prev = t[1]+1
            boites.append((prev, x1))
            ors = []
            for bx0, bx1 in boites:
                c = px[(bx0+bx1)//2, y]
                ors.append("OR" if c[0] > c[2]+40 and c[0] > 110 else "gris")
            print(f"  {nom:38s} TAILLE={im.size} y={y} : {len(boites)} compteurs "
                  f"{[(b[0], b[1], b[1]-b[0]+1) for b in boites]} bord={ors}")
            return
    print(f"  {nom:38s} TAILLE={im.size} : rangee de compteurs NON TROUVEE")

for f in ["cadre-131.png", "cadre-150.png", "cadre-152.png"]:
    compteurs(Image.open(f"{D}/reference/{f}").convert("RGB"), f"REF {f}")
for f in sorted(os.listdir(f"{D}/captures")):
    compteurs(Image.open(f"{D}/captures/{f}").convert("RGB"), f"CAP {f}")

print("\n########## Contrastes (encre reelle / fond reel)")
print("  -- controle positif : titre « Le dossier » (or sur fond de plaque)")
for lib, path, box in [("REF cadre-152", f"{D}/reference/cadre-152.png", (300, 490, 740, 540)),
                       ("CAP watched_fr 2400", f"{D}/captures/E13_Dossier_watched_fr_1080x2400.png", (290, 540, 700, 580))]:
    im = Image.open(path).convert("RGB"); px = im.load()
    pts = [px[x, y] for y in range(box[1], box[3]) for x in range(box[0], box[2])]
    enc = max(pts, key=lum)
    fonds = sorted(pts, key=lum)
    fond = fonds[len(fonds)//8]
    print(f"    {lib:24s} TAILLE={im.size} encre={enc} fond={fond} -> {contraste(enc, fond):.2f}:1")

print("  -- mot de gravite de la piste vivante (carte 3) et ligne « pas encore sur la table » (carte 1)")
for e in ("watched_fr", "watched_en", "noticed_fr", "noticed_en"):
    for res in (2400, 1920):
        im = Image.open(f"{D}/captures/E13_Dossier_{e}_1080x{res}.png").convert("RGB")
        yb = HAUT[res]
        bs = bandes(im, C3[0]+5, C3[1]-4, yb+215, min(yb+300, im.size[1]-1))
        fond = fond_carte(im, C3[0], yb, 215)
        if bs:
            for i, b in enumerate(bs, 1):
                print(f"    {e:11s} {res} C3 mot L{i} y[{b[0]},{b[1]}] w={b[5]:3d} encre={b[6]} "
                      f"fond={fond} -> {contraste(b[6], fond):.2f}:1   (TAILLE {im.size})")
        else:
            print(f"    {e:11s} {res} C3 mot : AUCUNE ENCRE   (TAILLE {im.size})")
    for res in (2400, 1920):
        im = Image.open(f"{D}/captures/E13_Dossier_{e}_1080x{res}.png").convert("RGB")
        yb = HAUT[res]
        bs = bandes(im, 80, 367, yb+230, min(yb+300, im.size[1]-1))
        fond = fond_carte(im, 75, yb, 230)
        lib = f"{e} {res} C1 sous-bande"
        if bs:
            for b in bs:
                print(f"    {lib:28s} y[{b[0]},{b[1]}] w={b[5]:3d} encre={b[6]} fond={fond} "
                      f"-> {contraste(b[6], fond):.2f}:1")
        else:
            print(f"    {lib:28s} AUCUNE ENCRE")
