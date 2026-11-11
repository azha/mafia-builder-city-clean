#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""07 — le bandeau DESCEND-il, et de combien, sur les PIXELS ?

Astuce : a t0 l'alpha du bandeau vaut 0 (journal) — t0 est donc le FOND SEUL. En soustrayant
t0, D100 = t100 - t0 et D200 = t200 - t0 ne contiennent QUE l'encre du bandeau. Le decalage
vertical se lit par correlation croisee NORMALISEE des profils de lignes (insensible au
fondu, qui n'est qu'un facteur d'echelle), raffinee au sous-pixel par parabole.

Attendu (dossier) : 10 u de canal = 27,55 px ecran ; a t100 il reste 3,15 u = 8,68 px.
Controle positif : D200 correle avec lui-meme doit donner un decalage de 0,00 px.
Controle NEGATIF : D200 decale artificiellement de 5 px doit etre retrouve a 5,0 px.
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
D = os.path.normpath(os.path.join(ICI, "..", "captures"))
ECHELLE = 3.265 * 0.84375          # 1 u de bandeau -> px ecran (dossier.md)


def lire(n):
    im = Image.open(os.path.join(D, n)).convert("RGB")
    print(f"   lu {n} {im.size}")
    return im


t0 = lire("bandeau-entree_t0_1080x2400.png")
t100 = lire("bandeau-entree_t100ms_1080x2400.png")
t200 = lire("bandeau-entree_t200ms_1080x2400.png")

Y0, Y1 = 150, 420          # large autour du bandeau
p0, p1, p2 = t0.load(), t100.load(), t200.load()


def profil_diff(pa, pb):
    """luminance |a-b| moyenne par ligne, sur toute la largeur"""
    out = []
    for y in range(Y0, Y1):
        s = 0
        for x in range(0, 1080, 2):
            s += sum(abs(pa[x, y][k] - pb[x, y][k]) for k in range(3))
        out.append(s / 540.0)
    return out


d100 = profil_diff(p1, p0)
d200 = profil_diff(p2, p0)


def bbox_encre(prof, seuil=1.0):
    ys = [i for i, v in enumerate(prof) if v > seuil]
    return (Y0 + ys[0], Y0 + ys[-1]) if ys else None


print()
print("== etendue verticale de l'encre du bandeau (seuil 1,0 sur |diff| moyenne) ==")
b100, b200 = bbox_encre(d100), bbox_encre(d200)
print(f"   t100ms : y={b100[0]}..{b100[1]}   (hauteur {b100[1]-b100[0]+1} px)")
print(f"   t200ms : y={b200[0]}..{b200[1]}   (hauteur {b200[1]-b200[0]+1} px)")
print(f"   haut   : {b200[0]-b100[0]} px plus bas a t200   bas : {b200[1]-b100[1]} px plus bas")


def decalage(a, b, maxd=40):
    """decalage d (en px) a appliquer a `a` pour coller a `b`, par correlation normalisee"""
    def corr(d):
        num = den_a = den_b = 0.0
        for i in range(len(a)):
            j = i - d
            if 0 <= j < len(a):
                num += a[j] * b[i]
                den_a += a[j] * a[j]
                den_b += b[i] * b[i]
        return num / ((den_a * den_b) ** 0.5) if den_a > 0 and den_b > 0 else 0.0
    sc = {d: corr(d) for d in range(-maxd, maxd + 1)}
    best = max(sc, key=sc.get)
    y1_, y2_, y3_ = sc.get(best - 1, 0), sc[best], sc.get(best + 1, 0)
    den = (y1_ - 2 * y2_ + y3_)
    sub = 0.5 * (y1_ - y3_) / den if den != 0 else 0.0
    return best + sub, sc[best]


print()
print("== controle positif : D200 contre lui-meme ==")
d, c = decalage(d200, d200)
print(f"   decalage = {d:+.2f} px (attendu 0,00)  correlation={c:.4f}")
print("== controle negatif : D200 decale de 5 px ==")
d200_dec = [0.0] * 5 + d200[:-5]
d, c = decalage(d200_dec, d200)
print(f"   decalage retrouve = {d:+.2f} px (attendu -5,00)  correlation={c:.4f}")

print()
print("== MESURE : de combien le bandeau de t100 est-il PLUS HAUT que celui de t200 ? ==")
d, c = decalage(d100, d200)
print(f"   decalage t100 -> t200 = {d:+.2f} px  (correlation={c:.4f})")
print(f"   soit {d/ECHELLE:+.2f} u de canal   | journal : 3,15 u ; dossier : 3,15 u ="
      f" {3.15*ECHELLE:.2f} px")
print(f"   course TOTALE extrapolee (10 u) = {10*ECHELLE:.2f} px ; "
      f"part restante a t100 = {d/(10*ECHELLE)*100:.1f} % (ease-out : 31,5 %)")
