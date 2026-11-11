#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Q4 / temps 5 — ce qui s'affiche SOUS la rangee des cartes, et jusqu'ou va la fenetre des pistes.

La maquette (cadre-152, cadre-150) ecrit, sous la rangee des trois cartes, une ligne en italique
(« Les livres : personne ne regarde par la. Pour l'instant. »). On segmente la bande comprise
entre le bas de la rangee de cartes et la traverse du panneau suivant, en reference et dans les
captures, aux deux resolutions.

Methode : fenetre x strictement interieure au panneau et SANS montant vertical (x 60..1020) ;
fond = mediane de la fenetre ; encre = pixels plus clairs que le fond de plus de 12.

CONTROLE POSITIF : en 2400, la ligne italique doit etre trouvee dans les 8 planches « Pistes »
(4 etats x 2 langues ne s'appliquent pas : 4 planches Pistes en 2400) avec une largeur d'encre
du meme ordre que la reference. C'est la grandeur dont on sait qu'elle existe.
CONTROLE NEGATIF : la meme fenetre, prise 300 px PLUS HAUT (en plein milieu des barres), doit
rendre un resultat DIFFERENT (des bandes pleines) ; sinon l'instrument ne localise rien.
"""
import os
from PIL import Image

D = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/39-dossier-nom-lieutenant/fin-ecran-2026-11-11"
X0, X1 = 60, 1020

def lum(p):
    return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]

def segmente(im, y0, y1, seuil=12):
    px = im.load()
    tous = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(X0, X1, 2))
    fond = tous[len(tous)//2]
    segs, cur = [], None
    for y in range(y0, y1):
        n = sum(1 for x in range(X0, X1) if lum(px[x, y]) - fond > seuil)
        if n >= 4:
            if cur is None: cur = [y, y]
            cur[1] = y
        else:
            if cur is not None and y - cur[1] > 2:
                segs.append(cur); cur = None
    if cur: segs.append(cur)
    out = []
    for sy0, sy1 in segs:
        pts = [(x, y) for y in range(sy0, sy1+1) for x in range(X0, X1)
               if lum(px[x, y]) - fond > seuil]
        ex0 = min(p[0] for p in pts); ex1 = max(p[0] for p in pts)
        best = max(pts, key=lambda p: lum(px[p[0], p[1]]))
        out.append((sy0, sy1, sy1-sy0+1, ex0, ex1, ex1-ex0+1, px[best[0], best[1]], len(pts)))
    return fond, out

def montre(path, nom, y0, y1, titre):
    im = Image.open(path).convert("RGB")
    print(f"\n--- {nom}  TAILLE LUE = {im.size}")
    print(f"    {titre} : y[{y0},{y1}]")
    fond, segs = segmente(im, y0, y1)
    print(f"    fond median L={fond:.1f} ; {len(segs)} bande(s) d'encre")
    for sy0, sy1, h, ex0, ex1, w, col, n in segs:
        print(f"      y[{sy0:4d},{sy1:4d}] h={h:3d}  x[{ex0:4d},{ex1:4d}] w={w:4d}  "
              f"n_px={n:5d}  clair={col}")
    return segs

if __name__ == "__main__":
    # bas de la rangee de cartes : REF 1198 (152) / 1219 (150) ; CAP 1289 (2400) ; CAP ~1136 (1920)
    print("=== REFERENCE : sous la rangee des cartes ===")
    montre(f"{D}/reference/cadre-152.png", "REF cadre-152", 1200, 1330, "sous les cartes")
    montre(f"{D}/reference/cadre-150.png", "REF cadre-150", 1221, 1360, "sous les cartes")

    print("\n\n=== CAPTURES 2400 : sous la rangee des cartes (bas de carte y=1289) ===")
    for e in ("noticed_fr", "noticed_en", "watched_fr", "watched_en"):
        montre(f"{D}/captures/E13_Dossier_{e}_1080x2400.png", f"CAP {e} 2400", 1291, 1420,
               "sous les cartes")

    print("\n\n=== CAPTURES 1920 : meme bande relative (bas de carte theorique y=1189) ===")
    for e in ("noticed_fr", "noticed_en", "watched_fr", "watched_en"):
        montre(f"{D}/captures/E13_Dossier_{e}_1080x1920.png", f"CAP {e} 1920", 1100, 1180,
               "fin de la fenetre des pistes")

    print("\n\n=== CONTROLE NEGATIF : la meme fenetre 300 px plus haut (en plein dans les barres) ===")
    montre(f"{D}/captures/E13_Dossier_watched_fr_1080x2400.png", "CAP watched_fr 2400 (controle -)",
           991, 1120, "en plein dans les barres")
