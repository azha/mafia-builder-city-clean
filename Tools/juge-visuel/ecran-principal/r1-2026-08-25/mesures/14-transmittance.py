# -*- coding: utf-8 -*-
"""Transmittance de la plaque: dispersion DANS la plaque / dispersion de l'art juste au-dessus."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png'); C2=ouvrir(D+'capture-1080x2400.png')
def spread(im,x0,x1,y0,y1,tag):
    px=im.load(); L=sorted(lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1))
    n=len(L); p5=L[int(n*.05)]; p95=L[int(n*.95)]
    print(f"    [{tag}] p5={p5:.1f} p95={p95:.1f} etendue={p95-p5:.1f} (n={n})")
    return p95-p5

print("\n=== CANON ===")
a=spread(K,60,1115,1210,1268,'art juste AU-DESSUS de la fiche (y1210..1268)')
b=spread(K,60,1115,1286,1316,'DANS la fiche, bande sans texte (y1286..1316)')
print(f"    -> transmittance apparente = {b/a:.3f}  (part du desordre de l'art qui traverse)")

print("\n=== CAPTURE 1080x1920 ===")
a=spread(C,60,1020,1120,1180,'art juste AU-DESSUS de la fiche (y1120..1180)')
b=spread(C,60,1020,1195,1225,'DANS la fiche, bande sans texte (y1195..1225)')
print(f"    -> transmittance apparente = {b/a:.3f}")

print("\n=== CAPTURE 1080x2400 ===")
a=spread(C2,60,1020,1600,1660,'art juste AU-DESSUS de la fiche (y1600..1660)')
b=spread(C2,60,1020,1675,1705,'DANS la fiche, bande sans texte (y1675..1705)')
print(f"    -> transmittance apparente = {b/a:.3f}")

print("\n=== CONTROLE NEGATIF : plaque OPAQUE simulee (backdrop uni) ===")
a=spread(C,60,1020,1120,1180,'art')
b=spread(C,60,1000,218,238,'backdrop uni (opaque par construction)')
print(f"    -> transmittance apparente = {b/a:.4f}  (doit etre ~0)")
