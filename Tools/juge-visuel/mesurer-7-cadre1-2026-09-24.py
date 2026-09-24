#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""⑦ cadre 1 — la mesure demandée par f2 (24/09) sur le rendu : bas des repères ≤ bord du cadre, et marge (bord − bas du dernier élément) ≥ celle
des cadres 0, 2 et 3. Lecture des lignes horizontales claires (≥ 150 échantillons sur 188, x 60→1000 pas 5), groupées en traits ; le bord du
cadre est le DERNIER trait (bordure dorée) ; la marge d'un cadre est bord − le trait qui le précède. Pour le cadre 1, le bas des repères n'est
visible que s'ils ne sont pas coupés : le bord est le trait DORÉ (x = 540), un trait sous lui est un élément qui déborde ; et le trait qui
précède le bord doit être le bas d'une boîte haute de 30 à 50 px (repère entier).
Usage : mesurer-7-cadre1-2026-09-24.py [dossier des rendus]  — code 0 si la mesure passe"""
import os, sys
from PIL import Image
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'famille/maquette-7-2026-09-23')

def traits(p):
    im = Image.open(p).convert('RGB'); r = []
    for y in range(1300, 1900):
        if sum(1 for x in range(60, 1000, 5) if sum(im.getpixel((x, y))) > 150) > 150:
            if r and y - r[-1][1] <= 1: r[-1][1] = y
            else: r.append([y, y])
    # le bord du cadre : le trait DORÉ (x = 540) ; un trait sous lui = un élément qui déborde (coupé)
    dore = [k for k, (y0, y1) in enumerate(r) if (lambda c: c[0] > 150 and c[1] > 110 and c[2] < 100)(im.getpixel((540, (y0 + y1) // 2)))]
    k = dore[-1]
    return r[:k + 1], len(r) - 1 - k

def main():
    m = {}
    for i in range(4):
        t, dessous = traits(os.path.join(D, f'cadre-{i}-1080x2102.png'))
        m[i] = (t[-1][0], t[-2][1], t, dessous)   # bord, bas du dernier élément
    cible = max(m[i][0] - m[i][1] for i in (0, 2, 3))
    bord, bas, t, dessous = m[1]
    haut = t[-3][0] if len(t) >= 3 else None   # haut du repère (trait qui précède son bas)
    entier = not dessous and haut is not None and 30 <= bas - haut <= 50
    marge = bord - bas
    for i in (0, 2, 3): print(f'  cadre {i} : bord {m[i][0]}, bas {m[i][1]}, marge {m[i][0] - m[i][1]}')
    print(f'  cadre 1 : bord {bord}, repères {haut}→{bas} ({"entiers" if entier else "COUPÉS"}), marge {marge} (cible ≥ {cible})')
    ok = entier and marge >= cible
    print('✅ passe' if ok else '⛔ ne passe pas')
    return 0 if ok else 1

if __name__ == '__main__':
    sys.exit(main())
