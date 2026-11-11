#!/usr/bin/env python3
"""Diff pixel des planches de l'Accueil, AVANT (0b24be49 moins les deux changements visibles) / APRÈS (735b889f) — lot retour d'appui v5.

Usage : diff-planches.py <dossier-avant> <dossier-apres> <dossier-sortie>
  - STABILITÉ : pour chaque cadrage, la paire (-1, -2) d'un même run ; un octet d'écart >= SEUIL compte (le banc doit rendre 0).
  - DIFF avant/apres : pixels dont le plus grand canal diffère de >= SEUIL ; boîte englobante, lignes touchées ; une image `diff-*.png`
    (pixels d'écart en rouge sur l'APRÈS assombri) est écrite dans <sortie>.
  - CONTRÔLE POSITIF (exigé) : on modifie UN pixel (+10) d'une copie de l'APRÈS : le diff doit en voir EXACTEMENT 1 ; un pixel à +2
    (sous le seuil) : 0. Si l'un des deux faux, le script sort en code 3 et le rapport est INVALIDE.
SEUIL = 3 octets (3/255, le seuil de couleur rendue du dépôt). Code de sortie 0 = rapport valide (le diff peut être non nul : c'est le constat).
"""
import os, sys
from PIL import Image, ImageChops

SEUIL = 3

def charge(p):
    return Image.open(p).convert('RGB')

def ecarts(a, b):
    """(n pixels >= SEUIL, boite englobante, image des écarts bruts)"""
    d = ImageChops.difference(a, b)
    r, g, bl = d.split()
    m = ImageChops.lighter(ImageChops.lighter(r, g), bl)
    masque = m.point(lambda v: 255 if v >= SEUIL else 0)
    n = masque.histogram()[255]
    return n, (masque.getbbox() if n else None), masque

def controle_positif(apres):
    px = apres.copy()
    x, y = px.size[0] // 2, px.size[1] // 2
    r, g, b = px.getpixel((x, y))
    px.putpixel((x, y), (min(255, r + 10), g, b))
    n1, _, _ = ecarts(apres, px)
    px2 = apres.copy()
    r, g, b = px2.getpixel((x, y))
    px2.putpixel((x, y), (min(255, r + 2) if r < 253 else r - 2, g, b))
    n2, _, _ = ecarts(apres, px2)
    return n1, n2

def main():
    avant, apres, sortie = sys.argv[1:4]
    os.makedirs(sortie, exist_ok=True)
    noms = sorted({f[:-6] for f in os.listdir(apres) if f.endswith('-1.png')})
    out = ["# Diff pixel des planches — Accueil, retour d'appui v5", "", f"Seuil : {SEUIL}/255 (plus grand canal). AVANT = `{avant}`, APRÈS = `{apres}`.", ""]
    invalide = False
    out.append("## Contrôle positif (exigé)")
    a0 = charge(os.path.join(apres, noms[0] + '-1.png'))
    n1, n2 = controle_positif(a0)
    out.append(f"- un pixel à +10 : **{n1}** pixel vu (attendu 1) · un pixel à +2 (sous le seuil) : **{n2}** (attendu 0)")
    if n1 != 1 or n2 != 0:
        out.append("- ⛔ CONTRÔLE POSITIF FAUX : le rapport est INVALIDE."); invalide = True
    out.append("")
    out.append("## Stabilité du banc (paire -1/-2 d'un même run)")
    out.append("| cadrage | AVANT | APRÈS |"); out.append("|---|---|---|")
    for n in noms:
        sa = ecarts(charge(os.path.join(avant, n + '-1.png')), charge(os.path.join(avant, n + '-2.png')))[0]
        sp = ecarts(charge(os.path.join(apres, n + '-1.png')), charge(os.path.join(apres, n + '-2.png')))[0]
        out.append(f"| {n} | {sa} px | {sp} px |")
        if sa or sp: out.append(f"|  ⚠ banc instable sur {n} : le diff avant/après de ce cadrage est entaché | | |")
    out.append("")
    out.append("## Diff AVANT → APRÈS")
    out.append("| cadrage | dimensions | pixels différents | boîte englobante (x0,y0,x1,y1 ; y du haut) | image |"); out.append("|---|---|---|---|---|")
    for n in noms:
        a = charge(os.path.join(avant, n + '-1.png')); p = charge(os.path.join(apres, n + '-1.png'))
        if a.size != p.size:
            out.append(f"| {n} | {a.size} ≠ {p.size} | TAILLES DIFFÉRENTES | | |"); invalide = True; continue
        k, bb, masque = ecarts(a, p)
        fond = p.point(lambda v: v // 3)
        rouge = Image.new('RGB', p.size, (255, 0, 0))
        fond.paste(rouge, mask=masque)
        nom_img = f"diff-{n}.png"
        fond.save(os.path.join(sortie, nom_img))
        out.append(f"| {n} | {p.size[0]}x{p.size[1]} | **{k}** | {bb} | `{nom_img}` |")
    rap = os.path.join(sortie, 'rapport-diff.md')
    open(rap, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print('\n'.join(out))
    sys.exit(3 if invalide else 0)

if __name__ == '__main__':
    main()
