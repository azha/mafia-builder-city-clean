#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rastérise les 3 bustes-silhouettes de la maquette « LA FAMILLE » en PNG 256×256.

POURQUOI CE SCRIPT EXISTE (mesuré 2026-08-22) : les PNG livrés par
`Tools/family-bustes-render.sh` (Chrome sans tête) étaient TRONQUÉS — bbox alpha du fedora
mesurée à (64,44,192,169) là où le viewBox 32×32 rendu à 8× impose (48,43,208,240). Les
ÉPAULES, l'élément le plus large du buste, manquaient : la silhouette se lisait comme une masse
ovale à deux bras. C'est le piège que la doc du dépôt décrit déjà pour l'autre script de rendu —
une fenêtre trop juste fait CROPPER Chrome en silence, sans erreur.

Ici, aucun navigateur : les chemins de la maquette sont aplatis et remplis directement, et le
script VÉRIFIE sa propre sortie contre la bbox attendue. Un rendu tronqué rougit au lieu de
produire un PNG plausible.

Chemins REUSE verbatim de `atelier3d-mafia/ecrans-brennar.html:184-195` (via
`Tools/family-bustes-source.html`, qui les recopie déjà). Fill `#cfc4a6` baked, même patron que
les 83 icônes W3.U-DA.
"""
from PIL import Image, ImageDraw
import sys, os

VB, TAILLE, SS = 32.0, 256, 4          # viewBox, sortie, sur-échantillonnage
FILL = (207, 196, 166, 255)            # #cfc4a6


def bez3(p0, p1, p2, p3, n=48):
    for i in range(n + 1):
        t = i / n; u = 1 - t
        yield (u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
               u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1])


def bez2(p0, p1, p2, n=32):
    for i in range(n + 1):
        t = i / n; u = 1 - t
        yield (u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0],
               u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1])


def cercle(cx, cy, r, n=72):
    import math
    return [(cx + r*math.cos(2*math.pi*i/n), cy + r*math.sin(2*math.pi*i/n)) for i in range(n)]


def rect_arrondi(x, y, w, h, rx, n=16):
    import math
    pts = []
    for cx, cy, a0 in ((x+w-rx, y+rx, -90), (x+w-rx, y+h-rx, 0), (x+rx, y+h-rx, 90), (x+rx, y+rx, 180)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + rx*math.cos(a), cy + rx*math.sin(a)))
    return pts


BUSTES = {
    "fedora": [
        list(bez3((6,30),(6,22.5),(12,20),(16,20))) + list(bez3((16,20),(20,20),(26,22.5),(26,30))),
        cercle(16, 13, 4.4),
        list(bez2((8,10.6),(16,8.2),(24,10.6))) + [(23.2,12)] + list(bez2((23.2,12),(16,10.2),(8.8,12))),
        list(bez2((11.6,9.8),(12.6,5.4),(16.6,5.6))) + list(bez2((16.6,5.6),(20.4,5.9),(20.6,9.8)))
            + list(bez2((20.6,9.8),(16,8.4),(11.6,9.8))),
    ],
    "homburg": [
        list(bez3((6,30),(6,22),(12,19),(16,19))) + list(bez3((16,19),(20,19),(26,22),(26,30))),
        cercle(16, 12.5, 4.6),
        list(bez2((8.5,9.5),(16,4.5),(23.5,9.5))) + [(23,11)] + list(bez2((23,11),(16,8.6),(9,11))),
        rect_arrondi(12.6, 5.2, 6.8, 4.4, 1.6),
    ],
    "casquette": [
        list(bez3((6.5,30),(6.5,23),(12,20.6),(16,20.6))) + list(bez3((16,20.6),(20,20.6),(25.5,23),(25.5,30))),
        cercle(16, 13.6, 4.2),
        list(bez2((10.4,10.8),(11,6.4),(16,6.4))) + list(bez2((16,6.4),(21,6.4),(21.6,10.6)))
            + [(22.8,11.4),(21.8,12.4)] + list(bez2((21.8,12.4),(16,10.4),(10.4,10.8))),
    ],
}

# Bornes ATTENDUES en unités de viewBox, dérivées des chemins ci-dessus. Le contrôle porte sur
# la sortie RENDUE : c'est ce qui distingue « le script a tourné » de « le script a produit le
# buste entier ».
ATTENDU = {"fedora": (6, 5.4, 26, 30), "homburg": (6, 4.9, 26, 30), "casquette": (6.5, 6.4, 25.5, 30)}

sortie = sys.argv[1] if len(sys.argv) > 1 else "Assets/Resources/Lieutenant"
echec = 0
for nom, formes in BUSTES.items():
    im = Image.new("RGBA", (TAILLE*SS, TAILLE*SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    k = TAILLE * SS / VB
    for pts in formes:
        d.polygon([(x*k, y*k) for x, y in pts], fill=FILL)
    im = im.resize((TAILLE, TAILLE), Image.LANCZOS)
    chemin = os.path.join(sortie, "ui_element_buste_%s.png" % nom)
    im.save(chemin)

    bb = Image.open(chemin).convert("RGBA").split()[3].getbbox()
    att = tuple(round(v * TAILLE / VB) for v in ATTENDU[nom])
    ecart = max(abs(a - b) for a, b in zip(bb, att))
    etat = "OK" if ecart <= 3 else "ÉCART"
    if ecart > 3:
        echec = 1
    print("%-10s bbox=%s attendu=%s ecart_max=%d px  %s" % (nom, bb, att, ecart, etat))

sys.exit(echec)
