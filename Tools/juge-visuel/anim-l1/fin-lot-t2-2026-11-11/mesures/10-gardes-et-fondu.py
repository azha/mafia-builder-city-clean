#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""10 — gardes du dossier et contrôles transverses.

A. GARDE ANTI-VIDE : part de pixels NON noirs (> 16/255 sur un canal) de chaque
   capture. Le dossier demande >= 5 %, sauf `shell-entree_t0` ou alpha = 0 rend
   legitimement l'image presque vide.
B. FONDU de `shell.entree` : « encre » = somme de |L - L(t0)| en luminance LINEAIRE
   sur la zone contenu. Doit etre 0 a t0, 1,000 a t160, et monotone entre.
C. Les BARRES ne s'estompent pas : pixels differents entre t0 / t80 / t160 dans la
   barre haute (y < 143) et la barre d'onglets (y >= 1740 en 1920).
D. CONTRASTE du texte du bandeau A L'ETAT FINAL (t200ms) : encre la plus claire du
   texte contre le fond du panneau, en rapport WCAG.

Controles : B porte son propre positif (t160 -> 1,000) et negatif (t0 -> 0,000) ;
C a pour negatif la zone contenu, ou le meme calcul doit rendre des millions de px.
"""
import os
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "captures")

def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def L(p):
    return 0.2126*lin(p[0]) + 0.7152*lin(p[1]) + 0.0722*lin(p[2])

def ouvrir(rel):
    im = Image.open(os.path.join(BASE, rel)).convert("RGB")
    print("   ouvert %-56s taille=%dx%d" % (rel, im.size[0], im.size[1]))
    return im

print("### A. garde anti-vide (pixels non noirs, seuil 16/255)")
tous = sorted(f for f in os.listdir(BASE) if f.endswith(".png"))
tous += ["reduit/" + f for f in sorted(os.listdir(os.path.join(BASE, "reduit")))]
for rel in tous:
    im = Image.open(os.path.join(BASE, rel)).convert("RGB")
    p = im.load(); w, h = im.size
    n = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if max(p[x, y]) > 16: n += 1
    part = 100.0 * n / ((w//2 + (w % 2)) * (h//2 + (h % 2)))
    drapeau = "OK" if part >= 5 else ("alpha 0 : attendu" if "shell-entree_t0" in rel else "!! SOUS 5 %")
    print("   %-56s %dx%d  non noirs = %5.2f %%  %s" % (rel, w, h, part, drapeau))

print("\n### B. fondu de shell.entree — encre relative (luminance lineaire)")
for res, zone in (("1080x1920", (150, 1680)), ("1080x2400", (150, 2100))):
    noms = ["shell-entree_t0_%s.png" % res, "shell-entree_t80ms_%s.png" % res,
            "shell-entree_t160ms_%s.png" % res]
    ims = [ouvrir(n) for n in noms]
    p0 = ims[0].load()
    encres = []
    for im in ims:
        p = im.load(); s = 0.0
        for y in range(zone[0], zone[1], 2):
            for x in range(0, 1080, 2):
                s += abs(L(p[x, y]) - L(p0[x, y]))
        encres.append(s)
    for n, e in zip(noms, encres):
        print("   %-46s encre=%9.2f  alpha_apparent=%.3f" % (n, e, e/encres[-1]))
    print("   (journal : 0,000 / 0,685 / 1,000 ; ease-out a 80/160 = 0,6846)")

print("\n### C. les barres ne s'estompent pas (1080x1920)")
a = ouvrir("shell-entree_t0_1080x1920.png"); b = ouvrir("shell-entree_t160ms_1080x1920.png")
pa, pb = a.load(), b.load()
for nom, y0, y1 in (("barre haute  y<143", 0, 143), ("barre onglets y>=1740", 1740, 1920),
                    ("CONTROLE NEGATIF : contenu y 150..1680", 150, 1680)):
    n = 0
    for y in range(y0, y1):
        for x in range(1080):
            if pa[x, y] != pb[x, y]: n += 1
    print("   %-40s pixels differents entre t0 et t160 = %d" % (nom, n))

print("\n### D. contraste du texte du bandeau a l'etat final (t200ms, 1080x1920)")
im = ouvrir("bandeau-entree_t200ms_1080x1920.png"); p = im.load()
# fond du panneau : mediane d'une fenetre sans texte, a 3 px des bords
fonds = sorted(L(p[x, y]) for y in range(222, 230) for x in range(200, 300))
Lf = fonds[len(fonds)//2]
# encre : le 99e centile de la bande de texte
textes = sorted(L(p[x, y]) for y in range(240, 275) for x in range(200, 880))
Le = textes[int(len(textes)*0.995)]
print("   fond du panneau L=%.4f ; encre du texte (centile 99,5) L=%.4f" % (Lf, Le))
print("   contraste WCAG = %.2f : 1  (plancher petit texte 4,5 ; grand texte 3,0)"
      % ((max(Lf, Le) + 0.05) / (min(Lf, Le) + 0.05)))
