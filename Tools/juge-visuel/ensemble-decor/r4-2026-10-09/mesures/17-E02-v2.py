#!/usr/bin/env python3
"""E02 ㉞ v2 — P7 / P8 / P13, avec le predicat de filet CORRIGE.

Le script 16 n'a rien trouve sur la puce de la reference : son predicat exigeait R > 130 alors que
le filet de la maquette vaut (123, 99, 50) — il est donc ECARTE pour la puce de reference et refait
ici avec R > 105. (La valeur a ete lue au pixel, pas devinee : voir la sortie « top R-B » du
diagnostic.)

Echelle : 1 px CSS = 3,6 px image des deux cotes.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

filet = lambda p: p[0] > 105 and p[0] - p[2] > 45

def rayon(im, box, pred):
    x0, y0, x1, y1 = box
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if pred(im.getpixel((x, y)))]
    if not pts:
        return None, None
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    xg, yh, xd, yb = min(xs), min(ys), max(xs), max(ys)
    prem = next((x for x in range(xg, xd + 1)
                 if any(pred(im.getpixel((x, y))) for y in range(yh, yh + 2))), None)
    return (prem - xg if prem is not None else None), (xg, yh, xd, yb)

print("=== P8 : rayon, filet et encre de la puce de geste ===")
print("-- REFERENCE cadre 88 « REJOUER » (fond sombre) --")
im = ouvrir("ref", "E02-cadre-88")
for etq, box in (("puce 1", (700, 725, 1040, 800)), ("puce 2", (700, 870, 1040, 945))):
    r, bb = rayon(im, box, filet)
    if bb is None:
        print(f"   {etq}: rien trouve dans {box}")
        continue
    ep = 0
    ym = (bb[1] + bb[3]) // 2
    for x in range(bb[0], bb[0] + 20):
        if filet(im.getpixel((x, ym))):
            ep += 1
        elif ep:
            break
    (mf, _) = med(im, bb[0], ym - 2, bb[0] + max(ep, 1), ym + 3)
    (fd, _) = med(im, bb[0] + 20, bb[1] + 6, bb[0] + 50, bb[1] + 12)
    print(f"   {etq}: bbox={bb} {bb[2]-bb[0]+1}x{bb[3]-bb[1]+1}px = "
          f"{(bb[2]-bb[0]+1)/K:.2f}x{(bb[3]-bb[1]+1)/K:.2f} css  RAYON={r}px = {r/K:.2f} css  "
          f"filet ep={ep}px = {ep/K:.2f} css RGB={mf}  interieur RGB={fd}  "
          f"contraste filet/interieur={contraste(mf, fd):.2f}:1")

print("-- REFERENCE cadre 90 « VOUS Y ETIEZ » --")
im90 = ouvrir("ref", "E02-cadre-90")
r, bb = rayon(im90, (700, 725, 1050, 800), filet)
print(f"   bbox={bb}  RAYON={r}px = {r/K:.2f} css")

print("-- CAPTURE 2400 « POSER UN ORDRE » (fond creme) --")
imc = ouvrir("cap", "E02_Carnet_1080x2400")
r, bb = rayon(imc, (680, 810, 1030, 880), filet)
ym = (bb[1] + bb[3]) // 2
ep = 0
for x in range(bb[0], bb[0] + 20):
    if filet(imc.getpixel((x, ym))):
        ep += 1
    elif ep:
        break
(mf, _) = med(imc, bb[0], ym - 2, bb[0] + max(ep, 1), ym + 3)
(fd, _) = med(imc, bb[0] + 30, bb[1] + 6, bb[0] + 80, bb[1] + 12)
print(f"   bbox={bb} {bb[2]-bb[0]+1}x{bb[3]-bb[1]+1}px = "
      f"{(bb[2]-bb[0]+1)/K:.2f}x{(bb[3]-bb[1]+1)/K:.2f} css  RAYON={r}px = {r/K:.2f} css  "
      f"filet ep={ep}px = {ep/K:.2f} css RGB={mf}  interieur RGB={fd}  "
      f"contraste filet/interieur={contraste(mf, fd):.2f}:1")

print()
print("=== P7 : geste principal — libelle SEUL (x borne pour exclure l'indice de droite) ===")
def label(kind, nom, box):
    im = ouvrir(kind, nom)
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H)
    print(f"   {nom} fenetre={box} fond={f} bandes={[(box[1]+a, box[1]+b) for a, b in bs]} "
          f"-> {len(bs)} LIGNE(S)")
    for a, b in bs:
        m = metrique(bits, W, a, b)
        if not m:
            continue
        px = [im.getpixel((box[0] + x, box[1] + y)) for y in range(a, b + 1)
              for x in range(W) if bits[y][x]]
        px.sort(key=lambda p: -(abs(p[0] - f[0]) + abs(p[1] - f[1]) + abs(p[2] - f[2])))
        k = max(1, len(px) // 5)
        enc = tuple(sorted(p[c] for p in px[:k])[k // 2] for c in range(3))
        print(f"      y={box[1]+a}..{box[1]+b}  capH={m['capH']}px = {m['capH']/K:.2f} css  "
              f"encre RGB={enc}  fond RGB={f}  CONTRASTE={contraste(enc, f):.2f}:1  "
              f"x={box[0]+m['x0']}..{box[0]+m['x1']}")
label("ref", "E02-cadre-85", (80, 1955, 620, 2015))
label("cap", "E02_Carnet_1080x2400", (80, 1900, 560, 2030))
label("cap", "E02_Carnet_1080x1920", (80, 1500, 560, 1640))

print()
print("=== P13 : E01 ㊳ — geste eteint « Y PRETER ATTENTION » ===")
label("ref", "E01-cadre-125", (80, 1900, 1000, 1965))
label("cap", "E01_Journal_1080x2400", (80, 1930, 1000, 2000))
label("cap", "E01_Journal_1080x1920", (80, 1540, 1000, 1610))
