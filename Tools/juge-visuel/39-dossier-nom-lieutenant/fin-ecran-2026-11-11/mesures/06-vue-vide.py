#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Q5 — la vue Vide (etat `quiet`) : structure, lignes de texte, contraste, troncature.

On segmente tout le panneau ㊴ de la vue Vide en bandes d'encre (fenetre x 60..1020, strictement
a l'interieur des montants or), aux deux resolutions et dans les deux langues, et on mesure le
contraste de chaque bande. On verifie aussi qu'aucune bande ne touche le bord de la fenetre.

CONTROLE POSITIF : les deux resolutions doivent rendre le MEME NOMBRE de bandes avec les MEMES
largeurs d'encre (la vue Vide ne deborde pas) — grandeur dont on sait qu'elle doit etre egale.
CONTROLE NEGATIF : la meme mesure sur une planche « Pistes » 1920 doit rendre un compte DIFFERENT
de son homologue 2400 (c'est le defaut deja mesure par 02- et 03-) ; sinon l'instrument est aveugle.
"""
import os
from PIL import Image

D = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/39-dossier-nom-lieutenant/fin-ecran-2026-11-11"
X0, X1 = 60, 1020

def lum(p):
    return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]

def rel(c):
    def f(v):
        v = v/255.0
        return v/12.92 if v <= 0.04045 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2])

def contraste(e, f_):
    a, b = rel(e), rel(f_)
    if a < b: a, b = b, a
    return (a+0.05)/(b+0.05)

def bandes(im, y0, y1, seuil=22):
    px = im.load()
    tous = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(X0, X1, 2))
    fond_g = tous[len(tous)//4]
    segs, cur = [], None
    for y in range(y0, y1):
        n = sum(1 for x in range(X0, X1) if lum(px[x, y]) - fond_g > seuil)
        if n >= 3:
            if cur is None: cur = [y, y]
            cur[1] = y
        else:
            if cur is not None and y - cur[1] > 2:
                segs.append(cur); cur = None
    if cur: segs.append(cur)
    out = []
    for sy0, sy1 in segs:
        pts = [(x, y) for y in range(sy0, sy1+1) for x in range(X0, X1)
               if lum(px[x, y]) - fond_g > seuil]
        ex0 = min(p[0] for p in pts); ex1 = max(p[0] for p in pts)
        best = max(pts, key=lambda p: lum(px[p[0], p[1]]))
        enc = px[best[0], best[1]]
        # fond local : mediane des pixels sombres de la bande
        fl = sorted((lum(px[x, y]), px[x, y]) for y in range(sy0, sy1+1) for x in range(X0, X1))
        fond = fl[len(fl)//8][1]
        out.append((sy0, sy1, sy1-sy0+1, ex0, ex1, ex1-ex0+1, enc, fond,
                    contraste(enc, fond), len(pts)))
    return out

def rapporte(path, nom, y0, y1):
    im = Image.open(path).convert("RGB")
    print(f"\n--- {nom}  TAILLE LUE = {im.size}  fenetre y[{y0},{y1}] x[{X0},{X1}]")
    L = bandes(im, y0, y1)
    print(f"    {len(L)} bandes d'encre")
    for sy0, sy1, h, ex0, ex1, w, enc, fond, k, n in L:
        bord = ""
        if ex0 <= X0+2 or ex1 >= X1-3:
            bord = "  <-- TOUCHE LE BORD DE LA FENETRE"
        print(f"      y[{sy0:4d},{sy1:4d}] h={h:3d} x[{ex0:4d},{ex1:4d}] w={w:4d} n={n:6d} "
              f"encre={enc} fond={fond} contraste={k:5.2f}:1{bord}")
    return len(L), [t[5] for t in L]

if __name__ == "__main__":
    print("=== VUE VIDE (quiet) ===")
    r = {}
    for lg in ("fr", "en"):
        for res in (1920, 2400):
            # fenetres HOMOLOGUES : du souligne or du titre au bas du bloc de cloture.
            # (1er jet : 530..1830 a 2400 coupait le bloc de cloture et faussait le controle)
            y0, y1 = (430, 1625) if res == 1920 else (530, 2130)
            r[(lg, res)] = rapporte(f"{D}/captures/E13_Dossier_quiet_{lg}_1080x{res}.png",
                                    f"quiet {lg} {res}", y0, y1)
    print("\n=== CONTROLE POSITIF : la vue Vide doit donner le meme compte aux deux resolutions ===")
    for lg in ("fr", "en"):
        a, b = r[(lg, 1920)], r[(lg, 2400)]
        ok = (a[0] == b[0]) and all(abs(u-v) <= 2 for u, v in zip(a[1], b[1]))
        print(f"  quiet {lg} : {a[0]} bandes a 1920 / {b[0]} a 2400 ; largeurs {a[1]} vs {b[1]} -> "
              f"{'OK (pas de debordement)' if ok else 'ECART'}")

    print("\n=== CONTROLE NEGATIF : meme mesure sur une planche Pistes (doit DIFFERER) ===")
    a = rapporte(f"{D}/captures/E13_Dossier_watched_en_1080x1920.png", "watched en 1920", 430, 1620)
    b = rapporte(f"{D}/captures/E13_Dossier_watched_en_1080x2400.png", "watched en 2400", 530, 1830)
    print(f"  watched en : {a[0]} bandes a 1920 / {b[0]} a 2400 -> "
          f"{'DIFFERENT (instrument discriminant)' if a[0] != b[0] else 'IDENTIQUE (instrument aveugle)'}")
