#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m14 — (a) contraste de « TACTIQUE » (fenêtre recalée dans la carte) ;
(b) les SOULIGNÉS POINTILLÉS de la maquette cadre 5 (sous « CE QU'ON PEUT FAIRE » et sous
chaque ligne de conséquence) existent-ils dans la capture H01 ?

(b) Méthode : juste SOUS la ligne de base du texte (bande de 4 à 18 px sous le bas de
l'encre), on compte les pixels plus CLAIRS que le fond de +18 de luminance 0-255. Un
souligné pointillé en pose des centaines ; son absence en laisse ~0.
Contrôle positif : la même bande prise SUR le texte lui-même doit être riche des deux
côtés (l'instrument sait voir de l'encre claire sur fond sombre).
Contrôle négatif : une bande de fond nu (sans texte ni souligné) doit donner ~0 des deux
côtés.
"""
import os
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
C5 = os.path.join(RACINE, "reference", "cadre-5-tete-sur-ligne-haute.png")
C7 = os.path.join(RACINE, "reference", "cadre-7-echec-1re-cible.png")
H01 = os.path.join(RACINE, "captures", "H01_AccueilTete_Cadre5_cb56d837e_b35bdd6cb_1080x2400.png")
G02 = os.path.join(RACINE, "captures", "G02_ApresGeste_noted_cb56d837e_b35bdd6cb_1080x2400.png")


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def Lw(p):
    return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2])


def L8(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def ouvre(c, cache={}):
    if c not in cache:
        im = Image.open(c).convert("RGB")
        cache[c] = im
        print("  [lu] %-46s %dx%d" % (os.path.basename(c), im.width, im.height))
    return cache[c]


def med3(ps):
    return tuple(sorted(p[i] for p in ps)[len(ps) // 2] for i in range(3))


def contraste(c, box, nom):
    px = ouvre(c).load()
    ps = [px[x, y] for y in range(box[1], box[3]) for x in range(box[0], box[2])]
    lums = sorted(Lw(p) for p in ps)
    fond = [p for p in ps if Lw(p) >= lums[int(0.40 * len(lums))]]
    enc = [p for p in ps if Lw(p) <= lums[int(0.06 * len(lums))]]
    mf, me = med3(fond), med3(enc)
    a, b = Lw(me), Lw(mf)
    if a < b:
        a, b = b, a
    r = (a + 0.05) / (b + 0.05)
    print("      %-40s fenetre=%s fond=%s encre=%s -> %5.2f:1 %s"
          % (nom, box, mf, me, r, "" if r >= 4.5 else " << SOUS 4,5:1"))
    return r


def clairs(c, box, nom):
    px = ouvre(c).load()
    ps = [px[x, y] for y in range(box[1], box[3]) for x in range(box[0], box[2])]
    ls = sorted(L8(p) for p in ps)
    fond = ls[int(0.30 * len(ls))]
    n = sum(1 for v in ls if v > fond + 18)
    print("      %-46s fenetre=%s | L_fond=%5.1f | pixels clairs = %5d (%4.1f %% de la fenetre)"
          % (nom, box, fond, n, 100.0 * n / len(ls)))
    return n


print("=== (a) « TACTIQUE » DANS LA CARTE ===")
contraste(C7, (105, 845, 250, 875), "REF cadre-7 « TACTIQUE »")
contraste(G02, (160, 1186, 330, 1216), "CAP G02 « TACTIQUE »")

print("\n=== (b) SOULIGNES POINTILLES ===")
print("  -- sur « CE QU'ON PEUT FAIRE » --")
a = clairs(C5, (333, 1079, 739, 1099), "[ctrl +] REF : SUR le texte")
b = clairs(C5, (333, 1103, 739, 1117), "REF : SOUS le texte (souligne attendu)")
c = clairs(H01, (335, 1512, 744, 1532), "[ctrl +] CAP : SUR le texte")
d = clairs(H01, (335, 1536, 744, 1552), "CAP : SOUS le texte")
print("  -- sur la 1re ligne de consequence (colonne gauche) --")
e = clairs(C5, (121, 1300, 499, 1330), "[ctrl +] REF : SUR la ligne 1")
f = clairs(C5, (121, 1334, 499, 1346), "REF : SOUS la ligne 1 (souligne attendu)")
g = clairs(H01, (108, 1734, 650, 1766), "[ctrl +] CAP : SUR la ligne 1")
h = clairs(H01, (108, 1770, 650, 1782), "CAP : SOUS la ligne 1")
print("  -- controle negatif : fond nu --")
i1 = clairs(C5, (150, 1440, 500, 1470), "[ctrl -] REF : fond nu sous le panneau")
i2 = clairs(H01, (150, 1880, 500, 1910), "[ctrl -] CAP : fond nu sous le panneau")

print("\n=== LECTURE ===")
print("  « CE QU'ON PEUT FAIRE » : souligne REF=%d px clairs | CAP=%d px clairs" % (b, d))
print("  consequence ligne 1     : souligne REF=%d px clairs | CAP=%d px clairs" % (f, h))
print("  controles + (texte)     : REF %d/%d  CAP %d/%d" % (a, e, c, g))
print("  controles - (fond nu)   : REF %d  CAP %d" % (i1, i2))
