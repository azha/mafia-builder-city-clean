#!/usr/bin/env python3
"""Cartographie de l'OR : ou sont les filets/bordures laiton (#b08d3e) et l'or clair
(#f2c96b) ? Sert a decider PRESENT / ABSENT pour le cerne, le filet de l'enseigne,
le trait de la manchette et le cadre du CTA.
Controle positif : le titre 'Le journal' est en #f2c96b dans les DEUX images -> les
deux doivent rendre un pic d'or clair sur sa bande de rangees.
Controle negatif : une bande de fond nu doit rendre 0."""
from PIL import Image
import os

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAITON = (176, 141, 62)   # #b08d3e
ORCLAIR = (242, 201, 107) # #f2c96b

def proche(p, c, tol):
    return abs(p[0]-c[0]) <= tol and abs(p[1]-c[1]) <= tol and abs(p[2]-c[2]) <= tol

def carte(f, tol=34):
    im = Image.open(os.path.join(D, f)).convert('RGB')
    W, H = im.size
    px = im.load()
    print(f"=== {f}  taille={W}x{H} ===")
    lignes = []
    for y in range(H):
        nl = na = 0
        for x in range(0, W):
            p = px[x, y]
            if proche(p, LAITON, tol): nl += 1
            if proche(p, ORCLAIR, tol): na += 1
        lignes.append((y, nl, na))
    # rangees ou le laiton couvre > 40% de la largeur => un FILET horizontal
    filets = [(y, nl) for y, nl, na in lignes if nl > 0.40*W]
    print(f"  filets laiton horizontaux (>{int(0.40*W)} px sur la rangee) : {len(filets)} rangees")
    grp, prev = [], None
    for y, nl in filets:
        if prev is None or y != prev+1: grp.append([y, y, nl])
        else: grp[-1][1] = y; grp[-1][2] = max(grp[-1][2], nl)
        prev = y
    for a, b, n in grp: print(f"    y={a}-{b} ({b-a+1}px)  max {n}px de large")
    # colonnes ou le laiton est vertical (bord gauche/droit d'un cadre)
    cols = []
    for x in range(W):
        n = sum(1 for y in range(H) if proche(px[x, y], LAITON, tol))
        if n > 0.25*H: cols.append((x, n))
    print(f"  colonnes laiton verticales (>{int(0.25*H)} px) : {[c for c,_ in cols]}")
    tot_or = sum(na for _, _, na in lignes)
    print(f"  total px or clair (#f2c96b +/-{tol}) : {tot_or}")
    return lignes

for f in ['reference-1080x2102.png', 'capture-1080x2400.png',
          'capture-ecran-seul-1080x2400.png']:
    L = carte(f)
    # controle positif : bande du titre "Le journal"
    if '2102' in f: y0, y1 = 700, 800
    else: y0, y1 = 290, 360
    n = sum(na for y, nl, na in L if y0 <= y < y1)
    print(f"  CONTROLE POSITIF bande titre y={y0}-{y1} : {n} px d'or clair "
          f"({'OK' if n > 500 else 'ECHEC'})")
    n0 = sum(na for y, nl, na in L if 2090 <= y < 2100) if '2102' in f else \
         sum(na for y, nl, na in L if 2300 <= y < 2350)
    print(f"  CONTROLE NEGATIF bande de fond nu : {n0} px d'or clair ({'OK' if n0 < 50 else 'ECHEC'})")
    print()
