#!/usr/bin/env python3
"""E02 ㉞ — P7 (geste principal), P8 (puce de geste), P13 (etats eteints).

P7  casse / couleur / hauteur de capitale du geste principal + nombre de LIGNES du libelle.
P8  puce de geste : RAYON d'arrondi, epaisseur et couleur du filet, encre, casse, lignes.
P13 contraste WCAG de l'encre eteinte sur son fond reel (>= 4,5:1 exige par la doctrine du dossier).

RAYON mesure ainsi : sur le coin haut-gauche de la puce, on prend la 1re colonne ou le filet
apparait (x_g) et la 1re rangee ou il apparait (y_h) ; le rayon est la distance, le long du bord
haut, entre x_g et la 1re colonne ou le filet atteint y_h. Instrument neuf.

Echelle : 1 px CSS = 3,6 px image des deux cotes.
Controle positif : les deux puces « REJOUER » du cadre 88 doivent rendre le MEME rayon.
Controle negatif : la meme mesure sur un angle VIF connu (le bord du carnet creme) doit rendre ~0.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

def bbox_filet(im, box, pred):
    x0, y0, x1, y1 = box
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if pred(im.getpixel((x, y)))]
    if not pts:
        return None
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)

def rayon(im, box, pred):
    """Rayon = ecart en x entre la colonne la plus a gauche du filet et la 1re colonne qui
    atteint la rangee la plus haute du filet."""
    bb = bbox_filet(im, box, pred)
    if not bb:
        return None, None
    xg, yh, xd, yb = bb
    prem = None
    for x in range(xg, xd + 1):
        if any(pred(im.getpixel((x, y))) for y in range(yh, yh + 2)):
            prem = x
            break
    return (prem - xg if prem is not None else None), bb

print("=== P8 : la puce de geste ===")
# or de la maquette : clair sur fond sombre
or_clair = lambda p: p[0] > 130 and p[0] - p[2] > 45
# laiton du jeu : sombre sur fond creme
laiton = lambda p: 80 < p[0] < 180 and p[0] - p[2] > 45 and p[1] < 150

print("-- REFERENCE cadre 88, puce « REJOUER » (fond sombre) --")
im = ouvrir("ref", "E02-cadre-88")
for etq, box in (("puce 1", (820, 735, 1030, 790)), ("puce 2", (820, 880, 1030, 935))):
    r, bb = rayon(im, box, or_clair)
    if bb:
        (mf, _) = med(im, bb[0], (bb[1] + bb[3]) // 2 - 1, bb[0] + 2, (bb[1] + bb[3]) // 2 + 2)
        (fond, _) = med(im, bb[0] + 20, bb[1] + 8, bb[0] + 60, bb[1] + 14)
        print(f"   {etq}: bbox={bb}  {bb[2]-bb[0]+1}x{bb[3]-bb[1]+1}px = "
              f"{(bb[2]-bb[0]+1)/K:.2f}x{(bb[3]-bb[1]+1)/K:.2f} css  RAYON={r}px = "
              f"{r/K if r else 0:.2f} css  filet RGB={mf}  interieur RGB={fond}")

print("-- CAPTURE 2400, puce « POSER UN ORDRE » (fond creme) --")
im = ouvrir("cap", "E02_Carnet_1080x2400")
r, bb = rayon(im, (680, 815, 1030, 875), laiton)
print(f"   bbox={bb}  {bb[2]-bb[0]+1}x{bb[3]-bb[1]+1}px = "
      f"{(bb[2]-bb[0]+1)/K:.2f}x{(bb[3]-bb[1]+1)/K:.2f} css  RAYON={r}px = {r/K:.2f} css")
(mf, _) = med(im, bb[0], (bb[1] + bb[3]) // 2 - 1, bb[0] + 3, (bb[1] + bb[3]) // 2 + 2)
(pap, _) = med(im, bb[0] + 30, bb[1] + 6, bb[0] + 80, bb[1] + 12)
print(f"   filet RGB={mf}   papier interieur RGB={pap}   contraste filet/papier="
      f"{contraste(mf, pap):.2f}:1")

print()
print("   -- encre de la puce (coeur des glyphes) et contraste --")
for kind, nom, box, pred, desc in (
        ("ref", "E02-cadre-88", (860, 745, 990, 782), or_clair, "or sur fond sombre"),
        ("cap", "E02_Carnet_1080x2400", (700, 825, 1010, 865), laiton, "laiton sur papier")):
    im = ouvrir(kind, nom)
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H)
    a, b = bs[0]
    m = metrique(bits, W, a, b)
    px = [im.getpixel((box[0] + x, box[1] + y)) for y in range(a, b + 1)
          for x in range(W) if bits[y][x]]
    px.sort(key=lambda p: -(abs(p[0] - f[0]) + abs(p[1] - f[1]) + abs(p[2] - f[2])))
    k = max(1, len(px) // 5)
    enc = tuple(sorted(p[c] for p in px[:k])[k // 2] for c in range(3))
    print(f"      {nom} ({desc}) : {len([1 for _ in bs])} ligne(s), capH={m['capH']}px = "
          f"{m['capH']/K:.2f} css, encre RGB={enc}, fond RGB={f}, "
          f"contraste={contraste(enc, f):.2f}:1")

print()
print("=== CONTROLE NEGATIF du rayon : angle VIF du carnet creme (capture) ===")
im = ouvrir("cap", "E02_Carnet_1080x2400")
creme = lambda p: p[0] > 200 and p[1] > 190 and p[2] > 150
r, bb = rayon(im, (40, 680, 200, 760), creme)
print(f"   coin haut-gauche du carnet : RAYON mesure={r}px  bbox={bb}")

print()
print("=== P7 : le geste principal ===")
print("-- REFERENCE cadre 85 : « LANCER LA SOIREE » --")
im = ouvrir("ref", "E02-cadre-85")
box = (60, 1930, 1020, 2010)
W, H, bits, f = masque(im, box)
bs, _ = bandes(bits, W, H)
print(f"   fenetre={box} fond={f} bandes={[(box[1]+a, box[1]+b) for a, b in bs]}")
for a, b in bs:
    m = metrique(bits, W, a, b)
    if m:
        print(f"      y={box[1]+a}..{box[1]+b} capH={m['capH']}px = {m['capH']/K:.2f} css "
              f"xH={m['xH']}px encre x={box[0]+m['x0']}..{box[0]+m['x1']}")
print("-- CAPTURE 2400 : « LANCER LA / SOIREE » --")
im = ouvrir("cap", "E02_Carnet_1080x2400")
box = (60, 1900, 560, 2030)
W, H, bits, f = masque(im, box)
bs, _ = bandes(bits, W, H)
print(f"   fenetre={box} fond={f} bandes={[(box[1]+a, box[1]+b) for a, b in bs]}")
for a, b in bs:
    m = metrique(bits, W, a, b)
    if m:
        px = [im.getpixel((box[0] + x, box[1] + y)) for y in range(a, b + 1)
              for x in range(W) if bits[y][x]]
        px.sort(key=lambda p: -(abs(p[0] - f[0]) + abs(p[1] - f[1]) + abs(p[2] - f[2])))
        k = max(1, len(px) // 5)
        enc = tuple(sorted(p[c] for p in px[:k])[k // 2] for c in range(3))
        print(f"      y={box[1]+a}..{box[1]+b} capH={m['capH']}px = {m['capH']/K:.2f} css "
              f"encre RGB={enc} fond RGB={f} contraste={contraste(enc, f):.2f}:1 "
              f"x={box[0]+m['x0']}..{box[0]+m['x1']}")
