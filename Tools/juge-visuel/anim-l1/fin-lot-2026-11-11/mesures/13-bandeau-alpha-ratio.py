#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""13 — alpha du bandeau a t200, par RAPPORT D'ENCRE (12 a echoue : son controle positif
rendait 0,899 au lieu de 1,000 — le modele « une seule couche » ne tient pas sur une pile
translucide). Ici je ne modelise plus la couche : je compare l'ENCRE AJOUTEE au fond.

En lineaire, l'encre ajoutee par le bandeau vaut D(y) = out(y) - B(y) = a * (P - B).
Le bandeau est decale de 9 px entre t100 et t200 (mesure en 07/11 : 8,84 px). Donc, pour un
meme morceau de bandeau : D200(y) / D100(y-9) = a200 / 0,685, a condition que le fond B soit
stable sur 9 px — je ne garde que les lignes ou il l'est.

Controle positif : meme calcul sur shell.entree (decalage 0, fond = shell_t0 noir) ou la
reponse est connue : a160/0,685 doit rendre 1,000/0,685 = 1,460.
Controle NEGATIF : en mettant shell_t80 en « final », le rapport doit rendre 1,000.
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


def rapports(pB, p1, p2, zone, dy, seuil=0.02, stab=0.01):
    xa, xb, ya, yb = zone
    out = []
    for y in range(ya, yb):
        for x in range(xa, xb):
            ok = True
            r = []
            for k in range(3):
                B2 = S2L[pB[x, y][k]]
                B1 = S2L[pB[x, y - dy][k]]
                if abs(B2 - B1) > stab:          # fond instable sur dy px : on jette
                    ok = False
                    break
                d1 = S2L[p1[x, y - dy][k]] - B1
                d2 = S2L[p2[x, y][k]] - B2
                if d1 < seuil:
                    continue
                r.append(d2 / d1)
            if ok:
                out.extend(r)
    out.sort()
    return out


def dis(nom, v, attendu=None):
    n = len(v)
    if n < 200:
        print(f"   {nom} : n={n} — non concluant")
        return None
    med = v[n // 2]
    txt = (f"   {nom} : n={n:6d}  p25={v[n//4]:.3f}  mediane={med:.3f}  p75={v[3*n//4]:.3f}")
    if attendu:
        txt += f"   | attendu {attendu:.3f}  ecart {med-attendu:+.3f}"
    print(txt)
    return med


print("== CONTROLE POSITIF : shell.entree, decalage 0, fond noir ==")
sB, s1, s2 = (lire("shell-entree_t0_1080x2400.png"),
              lire("shell-entree_t80ms_1080x2400.png"),
              lire("shell-entree_t160ms_1080x2400.png"))
dis("D(t160)/D(t80) attendu 1/0,685 = 1,460", rapports(sB, s1, s2, (100, 1000, 300, 1300), 0),
    1.0 / 0.685)
print("== CONTROLE NEGATIF : final = t80 (le rapport doit valoir 1,000) ==")
dis("D(t80)/D(t80)  attendu 1,000", rapports(sB, s1, s1, (100, 1000, 300, 1300), 0), 1.000)

print("\n== MESURE : bandeau, D200(y) / D100(y-9) ==")
bB, b1, b2 = (lire("bandeau-entree_t0_1080x2400.png"),
              lire("bandeau-entree_t100ms_1080x2400.png"),
              lire("bandeau-entree_t200ms_1080x2400.png"))
for nom, zone in [("plaque basse  y 268..286", (130, 950, 268, 286)),
                  ("texte         y 246..264", (300, 800, 246, 264)),
                  ("plaque haute  y 224..240", (130, 950, 224, 240))]:
    med = dis(nom, rapports(bB, b1, b2, zone, 9), 1.0 / 0.685)
    if med:
        print(f"      -> alpha(t200) = 0,685 x {med:.3f} = {0.685*med:.3f}")
