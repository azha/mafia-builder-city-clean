#!/usr/bin/env python3
"""m03 — (a) stabilité T / T+1 s : compter les pixels différents.
       (b) reflux : la zone de contenu de 1080x2400 est-elle identique à celle de 1080x1920 ?

Contrôle positif : on diffe une image avec elle-même -> doit sortir 0.
Contrôle négatif : on diffe 1920 avec la référence redimensionnée -> doit sortir >> 0.
"""
from PIL import Image, ImageChops

C19 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
T1S = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920_t1s.png"
C24 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x2400.png"
REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r1-2026-08-30/reference/m-120.png"


def diff(nom, a, b, seuil=0):
    d = ImageChops.difference(a.convert("RGB"), b.convert("RGB"))
    n = 0
    maxd = 0
    px = d.load()
    w, h = d.size
    for y in range(h):
        for x in range(w):
            m = max(px[x, y])
            if m > seuil:
                n += 1
            if m > maxd:
                maxd = m
    print(f"  {nom}: {n} px différents / {w*h} ({100.0*n/(w*h):.4f} %), écart max canal = {maxd}")
    return n


if __name__ == "__main__":
    a = Image.open(C19); b = Image.open(T1S); c = Image.open(C24); r = Image.open(REF)
    print("tailles :", C19, a.size, "|", T1S, b.size, "|", C24, c.size, "|", REF, r.size)
    print("\n(contrôle positif) 1920 vs lui-même :")
    diff("auto-diff", a, a)
    print("\n(a) stabilité T vs T+1 s :")
    diff("1920 vs 1920_t1s", a, b)
    print("\n(b) reflux : bandes de contenu 1080x2400 vs 1080x1920")
    print("    (0..1541 = du haut du panneau au bas du CTA, mesuré par m02)")
    diff("bande 0..1542", a.crop((0, 0, 1080, 1542)), c.crop((0, 0, 1080, 1542)))
    print("\n(contrôle négatif) 1920 vs référence redimensionnée à 1080x1920 :")
    diff("1920 vs ref", a, r.resize((1080, 1920)))
