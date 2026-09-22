#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""D'où vient le fond embarqué d'une maquette ? Recherche par PIXELS, jamais par nom de fichier.

Une maquette de l'atelier embarque ses fonds en JPEG base64 dans son CSS (`.scene.<classe>{background-image:url(data:…)}`).
Ce script extrait le fond d'une classe, puis cherche dans quels rendus de l'atelier il a été découpé (échelles multiples,
recadrage libre), et vérifie la boîte trouvée au pixel près.

Contrôles, imprimés à chaque exécution :
  - POSITIF : le fond comparé à lui-même doit rendre 0,00 (sinon l'instrument ne voit rien) ;
  - NÉGATIF : le rendu de NUIT découpé dans la même boîte doit rendre un gros écart (sinon l'instrument confond tout) ;
  - VOISINS : la boîte décalée de 4 px doit être pire que la boîte trouvée (sinon le « au pixel près » est faux).

Écart = moyenne des différences absolues, sur 255 (gris pour la recherche, RVB pour la vérification). Un JPEG q≈85 ré-encodé
d'une découpe exacte rend ~1 à 3 ; deux images différentes rendent > 30.

Usage (numpy est requis : l'interpréteur système n'en a pas ; celui du 22/09 était `~/project/camping-unity/.venv/bin/python`,
utilisé en lecture seule) :
  <python-avec-numpy> apparier-fond-maquette.py <page.html> <classe> <nuit.png> <candidat.png> [candidat.png …]
Exemple (⑯, 2026-09-22, dans ~/project/atelier3d-mafia) :
  … apparier-fond-maquette.py ecrans-brennar-4.html verge-jour VERGE3_NUIT_FINAL.png VERGE3_JOUR_FINAL.png VERGE_JOUR_FINAL.png p2_fonds/VERGE_D_JOUR_FINAL.png
"""
import base64, io, os, re, sys

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from PIL import Image


def fond_embarque(page, classe):
    s = open(page, encoding='utf-8').read()
    m = re.search(r'\.scene\.' + re.escape(classe) + r'\s*\{\s*background-image:\s*url\(data:image/\w+;base64,([A-Za-z0-9+/=]+)\)', s)
    if not m:
        sys.exit(f'FAUTE : aucune règle `.scene.{classe}` à fond embarqué dans {page}')
    data = base64.b64decode(m.group(1))
    return Image.open(io.BytesIO(data)).convert('RGB'), len(data)


def chercher(ref_l, chemin):
    """Meilleur recadrage (écart gris, échelle, x, y dans l'image REDIMENSIONNÉE) sur une grille d'échelles."""
    im = Image.open(chemin).convert('L'); W, H = im.size; RH, RW = ref_l.shape; best = None
    echelles = sorted({1.0, RW / W, RH / H, max(RW / W, RH / H)} | {e / 100 for e in range(40, 101, 5)})
    for e in echelles:
        w, h = round(W * e), round(H * e)
        if w < RW or h < RH:
            continue
        a = np.asarray(im.resize((w, h), Image.BILINEAR), dtype=np.float32)
        k = 6; pr = ref_l[::k, ::k]; pa = a[::k, ::k]
        d = np.abs(sliding_window_view(pa, pr.shape) - pr).mean(axis=(2, 3))
        y, x = np.unravel_index(d.argmin(), d.shape); x0, y0 = x * k, y * k
        for dy in range(-k, k + 1):
            for dx in range(-k, k + 1):
                yy, xx = y0 + dy, x0 + dx
                if 0 <= yy <= h - RH and 0 <= xx <= w - RW:
                    v = float(np.abs(a[yy:yy + RH, xx:xx + RW] - ref_l).mean())
                    if best is None or v < best[0]:
                        best = (v, e, xx, yy, W, H)
    return best


def ecart_boite(ref_rgb, chemin, boite):
    c = Image.open(chemin).convert('RGB').crop(boite).resize(ref_rgb.size, Image.LANCZOS)
    return float(np.abs(np.asarray(c, dtype=np.float32) - np.asarray(ref_rgb, dtype=np.float32)).mean())


def main():
    page, classe, nuit, *cands = sys.argv[1:]
    ref, octets = fond_embarque(page, classe)
    ref_l = np.asarray(ref.convert('L'), dtype=np.float32)
    print(f'fond `.scene.{classe}` de {page} : {ref.size[0]}x{ref.size[1]}, {octets} octets')
    print(f'contrôle POSITIF (le fond contre lui-même) : {float(np.abs(ref_l - ref_l).mean()):.2f}/255')
    resultats = []
    for c in cands:
        b = chercher(ref_l, c)
        if b is None:
            print(f'  {c:36} plus petit que le fond'); continue
        v, e, x, y, W, H = b
        boite = (round(x / e), round(y / e), round((x + ref.size[0]) / e), round((y + ref.size[1]) / e))
        print(f'  {c:36} {W}x{H}  écart gris {v:6.2f}/255  échelle {e:.3f}  boîte source {boite}')
        resultats.append((v, c, boite))
    v, c, boite = min(resultats)
    print(f'\nmeilleur : {c}, boîte {boite} ({boite[2]-boite[0]}x{boite[3]-boite[1]})')
    print(f'  vérification RVB de la boîte         : {ecart_boite(ref, c, boite):.2f}/255')
    for d in ((-4, -4), (4, 0)):
        b2 = (boite[0] + d[0], boite[1] + d[1], boite[2] + d[0], boite[3] + d[1])
        try:
            print(f'  VOISIN décalé de {d}           : {ecart_boite(ref, c, b2):.2f}/255')
        except Exception as ex:
            print(f'  VOISIN décalé de {d} : hors image ({ex})')
    print(f'  contrôle NÉGATIF ({os.path.basename(nuit)}, même boîte) : {ecart_boite(ref, nuit, boite):.2f}/255')


if __name__ == '__main__':
    main()
