#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""09 — Q3 : l'état « Mouvement réduit » (durée 0) — l'état FINAL dès t0 ?

A. BASCULE : identité des 4 captures réduites, par OCTETS (sha256) ET par PIXELS,
   et comparaison à l'arrivée du mode normal (`sens1_t140ms`).
B. BASCULE : position du curseur et couleur de piste dans chaque capture réduite.
C. BANDEAU : filet haut (position + brillance) de `reduit-bandeau-entree_apres-annonce`
   comparé au repos du mode normal (`bandeau-entree_t200ms_1080x2400`).
D. SHELL : le contenu monté sous Réduit est-il à alpha 1 ? On compare le HAUT de la
   distribution de luminance de la zone contenu (le 99,9e centile et le max par canal)
   entre `reduit-shell-entree_apres-montage` et le mode normal t160ms (alpha 1) et
   t80ms (alpha 0,685).
   ⚠ limite : les captures réduites viennent d'une AUTRE partie (lieutenants
   « Kest/Wend » au lieu de « Vesk/Hara ») : aucune égalité au pixel n'est possible
   pour C/D ; seules les grandeurs indépendantes du contenu le sont.

Contrôle POSITIF : le mode normal t160ms (alpha 1 connu par le journal ET par le
   script 02) doit donner le même haut de distribution que la capture réduite.
Contrôle NÉGATIF : le mode normal t80ms (alpha 0,685) doit donner un haut de
   distribution NETTEMENT plus bas — sinon l'instrument ne mesure pas l'alpha.
"""
import os, hashlib
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "captures")

def ouvrir(rel):
    im = Image.open(os.path.join(BASE, rel)).convert("RGB")
    print("   ouvert %-56s taille=%dx%d" % (rel, im.size[0], im.size[1]))
    return im

def sha(rel):
    with open(os.path.join(BASE, rel), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()[:16]

print("### A. bascule sous Reduit — octets et pixels")
reduits = ["reduit/reduit-bascule-course_avant_1080x2400.png",
           "reduit/reduit-bascule-course_t0_1080x2400.png",
           "reduit/reduit-bascule-course_t70ms_1080x2400.png",
           "reduit/reduit-bascule-course_t140ms_1080x2400.png"]
normal_arrivee = "bascule-course-marche-sens1_t140ms_1080x2400.png"
normal_depart = "bascule-course-marche-sens1_avant_1080x2400.png"
ims = {}
for r in reduits + [normal_arrivee, normal_depart]:
    ims[r] = ouvrir(r)
    print("      sha256[0:16] = %s" % sha(r))

def diff_px(a, b):
    pa, pb = ims[a].load(), ims[b].load()
    if ims[a].size != ims[b].size: return None
    n = 0; dmax = 0
    for y in range(ims[a].size[1]):
        for x in range(ims[a].size[0]):
            d = max(abs(pa[x,y][0]-pb[x,y][0]), abs(pa[x,y][1]-pb[x,y][1]), abs(pa[x,y][2]-pb[x,y][2]))
            if d: n += 1
            if d > dmax: dmax = d
    return n, dmax

for a, b, quoi in [(reduits[1], reduits[2], "reduit t0 vs t70"),
                   (reduits[1], reduits[3], "reduit t0 vs t140"),
                   (reduits[2], reduits[3], "reduit t70 vs t140"),
                   (reduits[1], normal_arrivee, "reduit t0 vs ARRIVEE du mode normal"),
                   (reduits[0], normal_depart, "reduit avant vs AVANT du mode normal"),
                   (reduits[0], reduits[1], "reduit avant vs t0 (CONTROLE NEGATIF : doit differer)")]:
    n, dmax = diff_px(a, b)
    print("   %-52s pixels differents = %d (delta max = %d)" % (quoi, n, dmax))

print("\n### B. curseur et piste sous Reduit (meme instrument qu'au script 04)")
def mesurer(im):
    p = im.load()
    y0, y1 = 947, 989
    ymid = (y0 + y1) // 2
    xs = [x for x in range(900, 1050) if p[x, ymid] != (13, 13, 13)]
    px0, px1 = min(xs), max(xs)
    verts = sorted(p[x, ymid][1] for x in range(px0, px1 + 1))
    g_piste = verts[2]
    larges, centres = [], []
    for y in range(y0 + 12, y1 - 11):
        s = 0.0; sx = 0.0
        for x in range(px0, px1 + 1):
            c = (p[x, y][1] - g_piste) / (224.0 - g_piste)
            c = 0.0 if c < 0 else (1.0 if c > 1 else c)
            s += c; sx += c * (x + 0.5)
        if s > 1: larges.append(s); centres.append(sx / s)
    larges.sort(); centres.sort()
    return centres[len(centres)//2], larges[len(larges)//2], p[px0 + 2, ymid], (px0, px1)

for r in reduits + [normal_arrivee, normal_depart]:
    cen, larg, coul, piste = mesurer(ims[r])
    print("   %-58s centre curseur=%.2f px  largeur=%.2f  piste x=%s  couleur de piste au bord gauche=%s"
          % (r.split('/')[-1], cen, larg, piste, coul))

print("\n### C. bandeau sous Reduit — filet haut (position et brillance)")
def filet(im, x=250, y0=170, y1=232):
    p = im.load()
    pic = None; vmax = 0
    for y in range(y0, y1):
        v = p[x, y][0]
        if v >= 40 and v > vmax: vmax = v; pic = y
    if pic is None: return None, None, None
    a = b = pic
    while a - 1 >= y0 and p[x, a-1][0] > 25: a -= 1
    while b + 1 < y1 and p[x, b+1][0] > 25: b += 1
    s = sum(p[x, y][0] - 11 for y in range(a, b+1))
    return sum((y+0.5)*(p[x,y][0]-11) for y in range(a, b+1))/s, (a, b), vmax

for r in ["reduit/reduit-bandeau-entree_apres-annonce_1080x2400.png",
          "bandeau-entree_t200ms_1080x2400.png",
          "bandeau-entree_t70ms_1080x2400.png"]:
    im = ouvrir(r)
    y, pal, v = filet(im)
    print("   %-58s filet haut y=%.2f (palier %s, pic R=%d)" % (r.split('/')[-1], y, pal, v))

print("\n### D. shell sous Reduit — le contenu est-il a alpha 1 ?")
def haut_de_distribution(im, zone=(150, 2100, 0, 1080)):
    y0, y1, x0, x1 = zone
    p = im.load()
    vals = []
    rmax = gmax = bmax = 0
    for y in range(y0, y1, 2):
        for x in range(x0, x1, 2):
            r, g, b = p[x, y]
            vals.append(0.299*r + 0.587*g + 0.114*b)
            if r > rmax: rmax = r
            if g > gmax: gmax = g
            if b > bmax: bmax = b
    vals.sort()
    return vals[int(len(vals)*0.999)], vals[int(len(vals)*0.99)], (rmax, gmax, bmax)

for r in ["reduit/reduit-shell-entree_apres-montage_1080x2400.png",
          "shell-entree_t160ms_1080x2400.png",
          "shell-entree_t80ms_1080x2400.png",
          "shell-entree_t0_1080x2400.png"]:
    im = ouvrir(r)
    c999, c99, mx = haut_de_distribution(im)
    print("   %-58s centile99,9=%6.2f  centile99=%6.2f  max par canal=%s"
          % (r.split('/')[-1], c999, c99, mx))
