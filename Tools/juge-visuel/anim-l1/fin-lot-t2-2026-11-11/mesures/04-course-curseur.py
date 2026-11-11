#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""04 — Q1 (2e partie) : la COURSE du curseur de la ligne « Marche ».

Repères posés au script 03 (lecture brute des pixels) :
  piste  : x 930..1008 (79 px) , y 935..977 (43 px) en 1080x1920 ; y +12 en 1080x2400
  teinte : piste Or (217,171,77) / piste Eteinte (119,119,119) / curseur (234,224,200)
Échelle du dossier : 1 u = 0,84375 px. Piste 93,9 u = 79,2 px. Curseur 42,7 u = 36,03 px.
Course attendue = 42,67 u = 36,00 px.

Mesure SOUS-PIXEL : sur les lignes centrales de la piste, on calcule la couverture
« curseur » de chaque pixel par interpolation linéaire du canal VERT entre la
couleur de piste (locale, lue à 2 px du bord gauche de la piste... non : lue sur la
partie de piste NON couverte) et la couleur du curseur. La LARGEUR = somme des
couvertures ; le CENTRE = barycentre.

Contrôle POSITIF : largeur du curseur mesurée ≈ 36,0 px (valeur du dossier) et
largeur de piste ≈ 79,2 px, sur TOUTES les captures.
Contrôle NÉGATIF : le centre mesuré sur `avant` et sur `t140ms` doit différer
d'environ 36 px — un instrument qui rendrait le même centre ne mesure rien.
"""
import os
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "captures")
PX_PAR_U = 0.84375

def bande(h):
    if h == 1920: return 935, 977
    if h == 2400: return 947, 989
    raise SystemExit("hauteur %d" % h)

def mesurer(chemin, nom):
    im = Image.open(chemin).convert("RGB")
    print("  ouvert %-58s taille=%dx%d" % (nom, im.size[0], im.size[1]))
    p = im.load()
    y0, y1 = bande(im.size[1])
    yc0, yc1 = y0 + 12, y1 - 12          # lignes centrales : le curseur y est à pleine largeur
    # bord de piste : premier/dernier x (sur la ligne centrale) qui n'est pas le fond (13,13,13)
    ymid = (y0 + y1) // 2
    xs = [x for x in range(900, 1050) if p[x, ymid] != (13, 13, 13)]
    px0, px1 = min(xs), max(xs)
    larg_piste = px1 - px0 + 1
    # couleur de piste = mediane du canal vert des pixels de piste NON curseur
    verts = sorted(p[x, ymid][1] for x in range(px0, px1 + 1))
    g_piste = verts[2]                    # bas de la distribution = la piste (le curseur est plus clair)
    g_curseur = 224.0
    larges, centres = [], []
    for y in range(yc0, yc1 + 1):
        s = 0.0; sx = 0.0
        for x in range(px0, px1 + 1):
            g = p[x, y][1]
            c = (g - g_piste) / (g_curseur - g_piste)
            c = 0.0 if c < 0 else (1.0 if c > 1 else c)
            s += c; sx += c * (x + 0.5)
        if s > 1:
            larges.append(s); centres.append(sx / s)
    larges.sort(); centres.sort()
    larg = larges[len(larges)//2]; cen = centres[len(centres)//2]
    print("     piste x=%d..%d (%d px)  G_piste=%d | curseur largeur=%.2f px  centre=%.2f px"
          % (px0, px1, larg_piste, g_piste, larg, cen))
    return cen, larg, larg_piste, px0, px1

def serie(titre, noms):
    print("== %s" % titre)
    res = {}
    for nom in noms:
        res[nom] = mesurer(os.path.join(BASE, nom), nom)
    return res

print("### Contrôles de l'instrument")
r = serie("sens1 1920 — avant / t0 / t70 / t140", [
    "bascule-course-marche-sens1_avant_1080x1920.png",
    "bascule-course-marche-sens1_t0_1080x1920.png",
    "bascule-course-marche-sens1_t70ms_1080x1920.png",
    "bascule-course-marche-sens1_t140ms_1080x1920.png"])
ca = r["bascule-course-marche-sens1_avant_1080x1920.png"][0]
cf = r["bascule-course-marche-sens1_t140ms_1080x1920.png"][0]
print("  CONTROLE NEGATIF : centre(avant)=%.2f  centre(t140)=%.2f  ecart=%.2f px"
      " (course attendue 36,00 px) -> l'instrument discrimine : %s" %
      (ca, cf, abs(cf - ca), "OUI" if abs(abs(cf - ca) - 36.0) < 2 else "NON"))
print("  CONTROLE POSITIF : largeur curseur mesuree=%.2f px (attendue 36,03) ; piste=%d px (attendue 79,2)"
      % (r["bascule-course-marche-sens1_avant_1080x1920.png"][1],
         r["bascule-course-marche-sens1_avant_1080x1920.png"][2]))
print("")

def progression(res, nom_t0, nom_t70, nom_t140, etiquette):
    c0 = res[nom_t0][0]; c7 = res[nom_t70][0]; c14 = res[nom_t140][0]
    course = c14 - c0
    frac = (c7 - c0) / course if course else 0
    print("  %-12s x(t0)=%.2f  x(t70)=%.2f  x(t140)=%.2f  course=%+.2f px (%+.2f u)"
          % (etiquette, c0, c7, c14, course, course / PX_PAR_U))
    print("               fraction parcourue a t=70ms (moitie de 140) = %.4f" % frac)
    # ease-out CSS cubic-bezier(0,0,0.58,1) a t=0.5
    print("               attendu ease-out cubic-bezier(0,0,.58,1) a t=0,5 = %.4f  -> ecart %.4f (%.2f px)"
          % (EASE_05, frac - EASE_05, (frac - EASE_05) * abs(course)))

# cubic-bezier(0,0,0.58,1) : resolution de x(s)=0.5 puis y(s)
def bezier_y_pour_x(xc, x1=0.0, x2=0.58, y1=0.0, y2=1.0):
    lo, hi = 0.0, 1.0
    for _ in range(80):
        s = (lo + hi) / 2
        x = 3*(1-s)**2*s*x1 + 3*(1-s)*s*s*x2 + s**3
        if x < xc: lo = s
        else: hi = s
    s = (lo + hi) / 2
    return 3*(1-s)**2*s*y1 + 3*(1-s)*s*s*y2 + s**3

EASE_05 = bezier_y_pour_x(0.5)
print("### ease-out CSS standard cubic-bezier(0,0,0.58,1) : progres(0,5) = %.4f" % EASE_05)
print("")

print("### Q1 — la course, sens 1 (1080x1920)")
progression(r, "bascule-course-marche-sens1_t0_1080x1920.png",
               "bascule-course-marche-sens1_t70ms_1080x1920.png",
               "bascule-course-marche-sens1_t140ms_1080x1920.png", "sens1/1920")
print("")

r2 = serie("sens2 1920", [
    "bascule-course-marche-sens2_t0_1080x1920.png",
    "bascule-course-marche-sens2_t70ms_1080x1920.png",
    "bascule-course-marche-sens2_t140ms_1080x1920.png"])
progression(r2, "bascule-course-marche-sens2_t0_1080x1920.png",
                "bascule-course-marche-sens2_t70ms_1080x1920.png",
                "bascule-course-marche-sens2_t140ms_1080x1920.png", "sens2/1920")
print("")

r3 = serie("sens1 2400", [
    "bascule-course-marche-sens1_avant_1080x2400.png",
    "bascule-course-marche-sens1_t0_1080x2400.png",
    "bascule-course-marche-sens1_t70ms_1080x2400.png",
    "bascule-course-marche-sens1_t140ms_1080x2400.png"])
progression(r3, "bascule-course-marche-sens1_t0_1080x2400.png",
                "bascule-course-marche-sens1_t70ms_1080x2400.png",
                "bascule-course-marche-sens1_t140ms_1080x2400.png", "sens1/2400")
print("")

r4 = serie("sens2 2400", [
    "bascule-course-marche-sens2_t0_1080x2400.png",
    "bascule-course-marche-sens2_t70ms_1080x2400.png",
    "bascule-course-marche-sens2_t140ms_1080x2400.png"])
progression(r4, "bascule-course-marche-sens2_t0_1080x2400.png",
                "bascule-course-marche-sens2_t70ms_1080x2400.png",
                "bascule-course-marche-sens2_t140ms_1080x2400.png", "sens2/2400")
print("")

print("### Continuite du geste : le curseur a `t0` est-il la ou il etait `avant` ?")
print("  sens1/1920 centre(avant)=%.2f  centre(t0)=%.2f  ecart=%.2f px"
      % (ca, r["bascule-course-marche-sens1_t0_1080x1920.png"][0],
         r["bascule-course-marche-sens1_t0_1080x1920.png"][0] - ca))
print("  sens1/2400 centre(avant)=%.2f  centre(t0)=%.2f  ecart=%.2f px"
      % (r3["bascule-course-marche-sens1_avant_1080x2400.png"][0],
         r3["bascule-course-marche-sens1_t0_1080x2400.png"][0],
         r3["bascule-course-marche-sens1_t0_1080x2400.png"][0]
         - r3["bascule-course-marche-sens1_avant_1080x2400.png"][0]))
