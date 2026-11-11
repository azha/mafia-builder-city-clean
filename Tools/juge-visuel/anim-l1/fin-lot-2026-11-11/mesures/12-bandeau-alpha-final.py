#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""12 — le bandeau est-il a alpha PLEIN a t200 ? (Q2) + contraste du texte (doctrine).

Pas d'image « bandeau au repos » dans le dossier : je resous l'alpha. Unity compose en
LINEAIRE, donc pour un meme pixel ecran couvert par la plaque aux DEUX instants :
    out100 = 0,685*C + 0,315*B        (alpha de t100 donne par le journal, confirme en 06)
    out200 = a200 *C + (1-a200)*B     (B = fond seul = bandeau-entree_t0)
=> C = (out100 - 0,315*B)/0,685 ; puis a200 = (out200 - B)/(C - B).

Controle positif : le MEME solveur applique a shell.entree (B = shell_t0 noir, out100 =
shell_t80 a 0,685, out200 = shell_t160) doit rendre 1,000.
Controle NEGATIF : en passant shell_t80 comme « image finale », il doit rendre 0,685 et non 1.
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
D = os.path.normpath(os.path.join(ICI, "..", "captures"))
S2L = [((c / 255.0 / 12.92) if c / 255.0 <= 0.04045 else (((c / 255.0) + 0.055) / 1.055) ** 2.4)
       for c in range(256)]


def lire(n):
    im = Image.open(os.path.join(D, n)).convert("RGB")
    print(f"   lu {n} {im.size}")
    return im.load()


def resout(pB, p1, p2, zone, a1=0.685, mini=0.02):
    vals = []
    (xa, xb, ya, yb) = zone
    for y in range(ya, yb):
        for x in range(xa, xb):
            for k in range(3):
                B = S2L[pB[x, y][k]]
                o1 = S2L[p1[x, y][k]]
                o2 = S2L[p2[x, y][k]]
                C = (o1 - (1 - a1) * B) / a1
                if abs(C - B) < mini:
                    continue
                vals.append((o2 - B) / (C - B))
    vals.sort()
    return vals


def dis(nom, vals):
    n = len(vals)
    if n < 100:
        print(f"   {nom} : {n} echantillons — non concluant")
        return
    print(f"   {nom} : n={n}  p25={vals[n//4]:.3f}  mediane={vals[n//2]:.3f}  "
          f"p75={vals[3*n//4]:.3f}")


print("== CONTROLE POSITIF : shell.entree (reponse connue = 1,000) ==")
sB = lire("shell-entree_t0_1080x2400.png")
s1 = lire("shell-entree_t80ms_1080x2400.png")
s2 = lire("shell-entree_t160ms_1080x2400.png")
dis("a(shell t160) attendu 1,000", resout(sB, s1, s2, (100, 1000, 300, 1300)))
print("== CONTROLE NEGATIF : meme solveur, image finale = shell t80 (attendu 0,685) ==")
dis("a(shell t80)  attendu 0,685", resout(sB, s1, s1, (100, 1000, 300, 1300)))

print("\n== MESURE : alpha du bandeau a t200 ==")
bB = lire("bandeau-entree_t0_1080x2400.png")
b1 = lire("bandeau-entree_t100ms_1080x2400.png")
b2 = lire("bandeau-entree_t200ms_1080x2400.png")
# zone : coeur de la plaque, couverte aux DEUX instants (D100 206..281, D200 215..289)
dis("a(bandeau t200)", resout(bB, b1, b2, (130, 950, 226, 278)))

print("\n== contraste WCAG du texte du bandeau (doctrine : juge a l'etat FINAL) ==")


def L(p):
    return 0.2126 * S2L[p[0]] + 0.7152 * S2L[p[1]] + 0.0722 * S2L[p[2]]


def contraste(p, ya, yb, xa, xb):
    ech = []
    for y in range(ya, yb):
        for x in range(xa, xb):
            ech.append((L(p[x, y]), p[x, y]))
    ech.sort(key=lambda t: t[0])
    n = len(ech)
    fond = ech[n // 10][0]          # 10e centile = la plaque
    texte = ech[-n // 50][0]        # 2 % les plus clairs = l'encre du texte
    r = (max(fond, texte) + 0.05) / (min(fond, texte) + 0.05)
    return r, ech[n // 10][1], ech[-n // 50][1]


for nom, p, (ya, yb) in [("t200ms (final)", b2, (246, 264)), ("t100ms (a mi-course)", b1, (237, 255))]:
    r, cf, ct = contraste(p, ya, yb, 300, 800)
    print(f"   {nom:22s} plaque={cf}  texte={ct}  contraste={r:.2f}:1  "
          f"(plancher petit texte 4,5:1)")
