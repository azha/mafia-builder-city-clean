#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""02 — Q1 : le contenu HORS interrupteur varie-t-il pendant bascule.course ?

Mesure : luminance moyenne (Rec.601 sur les octets stockés) de la zone CONTENU
(sous la barre haute, au-dessus de la barre d'onglets) en EXCLUANT le rectangle
de l'interrupteur animé (trouvé au script 01 : x 920..1020, y 925..990 en 1920 ;
y +12 en 2400). On donne aussi le RAPPORT à la capture de référence du scénario :
un fondu plein cadre ferait tomber ce rapport bien au-dessous de 1.

Et, à seuil 0 (strict), le nombre de pixels qui changent HORS de ce rectangle.

Contrôle POSITIF : la même mesure sur shell-entree t0/t80/t160 doit retrouver le
fondu connu (rapport << 1 à t0, intermédiaire à t80, 1 à t160).
Contrôle NÉGATIF : deux lectures de la MÊME image -> rapport exactement 1,000 et
0 pixel changé.
"""
import os
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "captures")

# zone contenu : sous la barre haute (y>=150 en 1920) et au-dessus de la barre d'onglets
def zone_contenu(h):
    if h == 1920:
        return (0, 150, 1080, 1680), (920, 925, 1020, 990)
    if h == 2400:
        return (0, 150, 1080, 2100), (920, 938, 1020, 1003)
    raise SystemExit("hauteur inattendue %d" % h)

def charger(nom):
    c = os.path.join(BASE, nom)
    im = Image.open(c).convert("RGB")
    print("    ouvert %-58s taille=%dx%d" % (nom, im.size[0], im.size[1]))
    return im

def lum_hors(im):
    (zx0, zy0, zx1, zy1), (ex0, ey0, ex1, ey1) = zone_contenu(im.size[1])
    p = im.load()
    s = 0.0; n = 0
    for y in range(zy0, zy1):
        dans_y = ey0 <= y < ey1
        for x in range(zx0, zx1):
            if dans_y and ex0 <= x < ex1:
                continue
            r, g, b = p[x, y]
            s += 0.299*r + 0.587*g + 0.114*b
            n += 1
    return s/n, n

def pixels_changes_hors(ia, ib):
    (zx0, zy0, zx1, zy1), (ex0, ey0, ex1, ey1) = zone_contenu(ia.size[1])
    pa, pb = ia.load(), ib.load()
    n = 0; dmax = 0
    for y in range(0, ia.size[1]):
        dans_y = ey0 <= y < ey1
        for x in range(0, ia.size[0]):
            if dans_y and ex0 <= x < ex1:
                continue
            d = max(abs(pa[x,y][0]-pb[x,y][0]), abs(pa[x,y][1]-pb[x,y][1]), abs(pa[x,y][2]-pb[x,y][2]))
            if d: n += 1
            if d > dmax: dmax = d
    return n, dmax

def serie(titre, ref, noms):
    print("== %s" % titre)
    iref = charger(ref)
    lref, n = lum_hors(iref)
    print("    reference %-50s lum_hors=%.4f (sur %d px)" % (ref, lref, n))
    for nom in noms:
        im = charger(nom)
        l, _ = lum_hors(im)
        nc, dmax = pixels_changes_hors(iref, im)
        print("    %-54s lum_hors=%.4f  rapport=%.4f  px changes HORS rect=%d (dmax=%d)"
              % (nom, l, l/lref if lref else 0, nc, dmax))
    print("")

print("### CONTROLE NEGATIF — la meme image deux fois")
serie("negatif", "bascule-course-marche-sens1_t70ms_1080x1920.png",
      ["bascule-course-marche-sens1_t70ms_1080x1920.png"])

print("### CONTROLE POSITIF — le fondu connu de shell.entree (1920)")
serie("positif shell", "shell-entree_t160ms_1080x1920.png",
      ["shell-entree_t0_1080x1920.png", "shell-entree_t80ms_1080x1920.png",
       "shell-entree_t160ms_1080x1920.png", "shell-entree_avant_1080x1920.png"])

print("### CONTROLE POSITIF — le fondu connu de shell.entree (2400)")
serie("positif shell 2400", "shell-entree_t160ms_1080x2400.png",
      ["shell-entree_t0_1080x2400.png", "shell-entree_t80ms_1080x2400.png",
       "shell-entree_t160ms_1080x2400.png"])

print("### Q1 — bascule sens1 (1920), reference = 'avant'")
serie("sens1 1920", "bascule-course-marche-sens1_avant_1080x1920.png",
      ["bascule-course-marche-sens1_t0_1080x1920.png",
       "bascule-course-marche-sens1_t70ms_1080x1920.png",
       "bascule-course-marche-sens1_t140ms_1080x1920.png"])

print("### Q1 — bascule sens1 (2400), reference = 'avant'")
serie("sens1 2400", "bascule-course-marche-sens1_avant_1080x2400.png",
      ["bascule-course-marche-sens1_t0_1080x2400.png",
       "bascule-course-marche-sens1_t70ms_1080x2400.png",
       "bascule-course-marche-sens1_t140ms_1080x2400.png"])

print("### Q1 — bascule sens2 (1920), reference = son t0")
serie("sens2 1920", "bascule-course-marche-sens2_t0_1080x1920.png",
      ["bascule-course-marche-sens2_t70ms_1080x1920.png",
       "bascule-course-marche-sens2_t140ms_1080x1920.png"])

print("### Q1 — bascule sens2 (2400), reference = son t0")
serie("sens2 2400", "bascule-course-marche-sens2_t0_1080x2400.png",
      ["bascule-course-marche-sens2_t70ms_1080x2400.png",
       "bascule-course-marche-sens2_t140ms_1080x2400.png"])
