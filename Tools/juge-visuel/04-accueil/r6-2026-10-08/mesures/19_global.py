#!/usr/bin/env python3
"""19 — couche GLOBALE : palette quantifiee, luminance, densite d'encre, et le DECOR.

Palette : Image.quantize(8) sur une reduction, part d'aire de chaque couleur.
Densite : part des pixels dont la luminance depasse 40 (l'« encre » et les lumieres).
Decor : bande comprise entre le filet de bandeau et le haut de la plaque — la seule
zone ou la maquette et le jeu montrent la MEME chose (le quartier peint, ASSUME n°5).

CONTROLE POSITIF : les deux references (cadres 4 et 5) partagent le meme decor et la
meme barre -> leurs palettes doivent se ressembler a quelques % pres.
CONTROLE NEGATIF : une palette calculee sur la seule BARRE HAUTE doit differer
franchement de celle du plein ecran — sinon l'instrument ne distingue pas les zones.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple
from PIL import Image

PLAQUE_HAUT = {"ref4": 684, "ref5": 774, "c24": 927, "l24": 1312, "c19": 568, "l19": 953}
BARRE = {"ref4": 140, "ref5": 140, "c24": 145, "l24": 145, "c19": 145, "l19": 145}


def palette(im, n=6, taille=160):
    p = im.copy()
    p.thumbnail((taille, taille * 4))
    q = p.convert("RGB").quantize(colors=n, method=Image.MEDIANCUT)
    pal = q.getpalette()
    tot = p.size[0] * p.size[1]
    out = []
    for cnt, idx in sorted(q.getcolors(), reverse=True):
        out.append(((pal[idx*3], pal[idx*3+1], pal[idx*3+2]), 100.0*cnt/tot))
    return out


def stats(im, y0, y1):
    px = im.load()
    W = im.size[0]
    L = []
    for y in range(y0, y1, 2):
        for x in range(0, W, 2):
            L.append(luminance_simple(px[x, y]))
    L.sort()
    n = len(L)
    moy = sum(L)/n
    dense = 100.0*sum(1 for v in L if v > 40)/n
    return dict(moy=moy, med=L[n//2], p10=L[n//10], p90=L[9*n//10], dense=dense, n=n)


print("=== 19a — couche globale, PLEIN ECRAN ===")
for cle in ("ref4", "ref5", "c24", "l24", "c19", "l19"):
    im = ouvrir(cle)
    s = stats(im, 0, im.size[1])
    print(f"   {cle:5s} luminance moy={s['moy']:5.1f} med={s['med']:5.1f} p10={s['p10']:5.1f} p90={s['p90']:5.1f}"
          f"  densite(L>40)={s['dense']:5.2f} %   ({s['n']} px echantillonnes)")
    for c, pc in palette(im):
        print(f"            {str(c):18s} {pc:5.1f} %")

print()
print("=== 19b — le DECOR (entre le filet de bandeau et le haut de la plaque) ===")
for cle in ("ref4", "ref5", "c24", "l24", "c19", "l19"):
    im = ouvrir(cle)
    y0, y1 = BARRE[cle], PLAQUE_HAUT[cle]
    s = stats(im, y0, y1)
    h = y1 - y0
    print(f"   {cle:5s} bande y[{y0},{y1}] hauteur={h}px ({100*h/im.size[1]:5.2f}% de l'image)"
          f"  luminance moy={s['moy']:5.1f} med={s['med']:5.1f} p90={s['p90']:5.1f}  densite(L>40)={s['dense']:5.2f} %")

print()
print("=== CONTROLE POSITIF : REF4 vs REF5, meme decor, meme barre ===")
a = stats(ouvrir("ref4", bavard=False), 140, 684)
b = stats(ouvrir("ref5", bavard=False), 140, 684)
print(f"   decor REF4 moy={a['moy']:.1f}  REF5 moy={b['moy']:.1f}  ecart={b['moy']-a['moy']:+.2f} "
      f"-> {'EGAL' if abs(b['moy']-a['moy']) < 1 else 'DIFFERE'}")
print("=== CONTROLE NEGATIF : palette de la seule BARRE HAUTE (doit differer du plein ecran) ===")
im = ouvrir("c24")
barre = im.crop((0, 0, 1080, 145))
print(f"   c24 barre : luminance moy={stats(barre, 0, 145)['moy']:.1f} vs plein ecran "
      f"{stats(im, 0, im.size[1])['moy']:.1f}")
