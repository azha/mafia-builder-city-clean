#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Boite a outils commune aux mesures du juge r5. Aucune mesure ici : seulement
les primitives (profils de lignes d'encre, hauteur de capitale, couleur de coeur
de glyphe, epaisseur de hampe). Tout script appelant IMPRIME la taille des images
qu'il ouvre via ouvrir()."""
from PIL import Image

DOSSIER = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r5-2026-10-09/"
ECHELLE = 3.6  # px image par px CSS -- IDENTIQUE reference et capture (dossier.md)


def ouvrir(rel):
    im = Image.open(DOSSIER + rel).convert("RGB")
    print(f"  [ouvre] {rel}  taille={im.size}  mode={im.mode}")
    return im


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def profil_lignes(im, x0, y0, x1, y1, seuil):
    """Compte par rangee les pixels d'encre claire (lum > seuil) dans la fenetre."""
    px = im.load()
    return [(y, sum(1 for x in range(x0, x1) if lum(px[x, y]) > seuil))
            for y in range(y0, y1)]


def bandes(prof, mini=1):
    """Decoupe un profil en bandes contigues de rangees a >= mini pixels d'encre."""
    out, deb = [], None
    for y, n in prof:
        if n >= mini and deb is None:
            deb = y
        elif n < mini and deb is not None:
            out.append((deb, y - 1))
            deb = None
    if deb is not None:
        out.append((deb, prof[-1][0]))
    return out


def profil_colonnes(im, x0, y0, x1, y1, seuil):
    px = im.load()
    return [(x, sum(1 for y in range(y0, y1) if lum(px[x, y]) > seuil))
            for x in range(x0, x1)]


def couleur_coeur(im, x0, y0, x1, y1, part=0.10):
    """Mediane RGB des pixels du coeur des glyphes : la fraction `part` la plus
    lumineuse de la fenetre. Evite la frange d'anti-crenelage (mandat, temps 3)."""
    px = im.load()
    pts = [px[x, y] for y in range(y0, y1) for x in range(x0, x1)]
    pts.sort(key=lum, reverse=True)
    n = max(1, int(len(pts) * part))
    coeur = pts[:n]
    med = tuple(sorted(c[k] for c in coeur)[len(coeur) // 2] for k in range(3))
    return med, len(coeur)


def fond_median(im, x0, y0, x1, y1):
    px = im.load()
    pts = [px[x, y] for y in range(y0, y1) for x in range(x0, x1)]
    return tuple(sorted(c[k] for c in pts)[len(pts) // 2] for k in range(3))


def contraste(c1, c2):
    def lin(v):
        v /= 255.0
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    def L(c):
        return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
    a, b = L(c1), L(c2)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)
