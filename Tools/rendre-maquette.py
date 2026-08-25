#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rend une maquette HTML en PNG, et VÉRIFIE que le rendu n'a pas été rogné.

⛔ Le piège que cet outil existe pour fermer (déjà payé ici sur les bustes) : Chrome sans
tête CROPE EN SILENCE quand la fenêtre est juste à la taille du contenu. Le PNG obtenu est
présent, de la bonne palette, et AMPUTÉ — et `alpha_min/alpha_max` ne le voient pas.
Le contrôle qui mord est la BBOX comparée à celle que la géométrie source IMPOSE.
"""
import subprocess, sys, os, json, tempfile

def rendre(html, sortie, largeur_css, hauteur_css, echelle):
    attendu_w = round(largeur_css * echelle)
    attendu_h = round(hauteur_css * echelle)
    # marge délibérée : la fenêtre est PLUS GRANDE que le contenu, seule façon de
    # distinguer « le contenu s'arrête ici » de « Chrome a coupé ici ».
    marge = 80
    cmd = [
        "/usr/bin/google-chrome", "--headless=new", "--disable-gpu", "--hide-scrollbars",
        f"--force-device-scale-factor={echelle}",
        f"--window-size={largeur_css + marge},{hauteur_css + marge}",
        f"--screenshot={sortie}", f"file://{os.path.abspath(html)}",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if not os.path.exists(sortie):
        print("ÉCHEC rendu:", r.stderr[-800:]); sys.exit(1)
    from PIL import Image
    im = Image.open(sortie)
    w, h = im.size
    print(f"rendu   : {w}x{h}")
    print(f"attendu : >= {attendu_w}x{attendu_h} (contenu {largeur_css}x{hauteur_css} CSS @ {echelle}x)")
    if w < attendu_w or h < attendu_h:
        print(f"⛔ ROGNÉ — le rendu est PLUS PETIT que la géométrie source ne l'impose.")
        sys.exit(2)
    print("✅ non rogné")
    return im

if __name__ == "__main__":
    html, sortie = sys.argv[1], sys.argv[2]
    lc, hc, ech = int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
    rendre(html, sortie, lc, hc, ech)
