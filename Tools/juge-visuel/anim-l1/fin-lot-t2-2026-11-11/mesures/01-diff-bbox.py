#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""01 — Où DEUX captures diffèrent-elles ? (bbox du diff, nb de pixels, delta max)

Sert Q1 : pendant bascule.course, le reste de l'écran bouge-t-il ?
Si la bbox du diff t0->t70->t140 est confinée à l'interrupteur, le reste est STABLE.

Contrôle POSITIF (l'instrument SAIT voir un changement plein cadre) :
    shell-entree_t0 vs t80ms  -> bbox doit couvrir presque tout le contenu.
Contrôle NÉGATIF (l'instrument ne fabrique pas de différence) :
    une image contre elle-même -> 0 pixel.
"""
import os, sys
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "captures")

def ouvrir(nom):
    c = os.path.join(BASE, nom)
    im = Image.open(c).convert("RGB")
    print("    ouvert %-58s taille=%dx%d" % (nom, im.size[0], im.size[1]))
    return im

def diff(a, b, seuil=2):
    """bbox des pixels dont un canal diffère de > seuil ; renvoie (n, bbox, dmax)"""
    ia, ib = ouvrir(a), ouvrir(b)
    if ia.size != ib.size:
        print("    !! tailles différentes, pas de diff")
        return None
    pa, pb = ia.load(), ib.load()
    w, h = ia.size
    n = 0; dmax = 0
    x0, y0, x1, y1 = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            ra, ga, ba = pa[x, y]; rb, gb, bb = pb[x, y]
            d = max(abs(ra-rb), abs(ga-gb), abs(ba-bb))
            if d > dmax: dmax = d
            if d > seuil:
                n += 1
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
    bbox = None if x1 < 0 else (x0, y0, x1, y1)
    print("    -> pixels>seuil(%d) = %d / %d (%.3f %%) ; delta max canal = %d ; bbox = %s"
          % (seuil, n, w*h, 100.0*n/(w*h), dmax, bbox))
    if bbox:
        print("       bbox largeur=%d hauteur=%d" % (bbox[2]-bbox[0]+1, bbox[3]-bbox[1]+1))
    return n, bbox, dmax

PAIRES = [
    ("CONTROLE NEGATIF (identite)", "bascule-course-marche-sens1_t0_1080x1920.png",
                                    "bascule-course-marche-sens1_t0_1080x1920.png"),
    ("CONTROLE POSITIF (fondu shell t0->t80)", "shell-entree_t0_1080x1920.png",
                                    "shell-entree_t80ms_1080x1920.png"),
    ("CONTROLE POSITIF (fondu shell t80->t160)", "shell-entree_t80ms_1080x1920.png",
                                    "shell-entree_t160ms_1080x1920.png"),
    ("Q1 sens1 avant -> t0", "bascule-course-marche-sens1_avant_1080x1920.png",
                             "bascule-course-marche-sens1_t0_1080x1920.png"),
    ("Q1 sens1 t0 -> t70", "bascule-course-marche-sens1_t0_1080x1920.png",
                           "bascule-course-marche-sens1_t70ms_1080x1920.png"),
    ("Q1 sens1 t70 -> t140", "bascule-course-marche-sens1_t70ms_1080x1920.png",
                             "bascule-course-marche-sens1_t140ms_1080x1920.png"),
    ("Q1 sens1 t0 -> t140", "bascule-course-marche-sens1_t0_1080x1920.png",
                            "bascule-course-marche-sens1_t140ms_1080x1920.png"),
    ("Q1 sens2 t0 -> t70", "bascule-course-marche-sens2_t0_1080x1920.png",
                           "bascule-course-marche-sens2_t70ms_1080x1920.png"),
    ("Q1 sens2 t70 -> t140", "bascule-course-marche-sens2_t70ms_1080x1920.png",
                             "bascule-course-marche-sens2_t140ms_1080x1920.png"),
    ("Q1 sens1 t0 -> t70 (2400)", "bascule-course-marche-sens1_t0_1080x2400.png",
                                  "bascule-course-marche-sens1_t70ms_1080x2400.png"),
    ("Q1 sens2 t0 -> t70 (2400)", "bascule-course-marche-sens2_t0_1080x2400.png",
                                  "bascule-course-marche-sens2_t70ms_1080x2400.png"),
    ("Q1 sens1 t70 -> t140 (2400)", "bascule-course-marche-sens1_t70ms_1080x2400.png",
                                    "bascule-course-marche-sens1_t140ms_1080x2400.png"),
    ("Q1 sens2 t70 -> t140 (2400)", "bascule-course-marche-sens2_t70ms_1080x2400.png",
                                    "bascule-course-marche-sens2_t140ms_1080x2400.png"),
]

for titre, a, b in PAIRES:
    print("== %s" % titre)
    diff(a, b)
    print("")
