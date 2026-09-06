#!/usr/bin/env python3
"""INSTRUMENT 2 — la palette LITTERALE et la part d'aire de chaque encre.

Pourquoi il remplace le k-moyennes de `encres.py` : celui-ci rendait un resultat UNIFORME
(memes centres, memes parts, aux 12 images). Le reflexe du socle est de suspecter
l'instrument — verification faite, l'uniformite est VRAIE mais mal mesuree : les images
ne sont pas des amas continus, elles sont tramees a partir d'un tout petit nombre de
couleurs LITTERALES, et le k-moyennes moyennait l'ancre avec son halo de tramage
(ocre mesure a (172,139,64) alors que la couleur POSEE est (176,141,62), soit --laiton
au bit pres). La grandeur qui discrimine ici n'est pas un centre d'amas : c'est la
couleur litterale la plus frequente et la part d'aire qui tombe dans son voisinage.

Grandeurs : (a) les N couleurs litterales dominantes ; (b) la part d'aire a distance
Tchebychev <= R d'une ancre ; (c) la part HORS ancres ; (d) l'ecart a chaque jeton du canon.
"""
import os, sys
from PIL import Image

CANON = {"encre": (0x0b,0x10,0x16), "panneau": (0x11,0x18,0x23), "lisere": (0x2a,0x36,0x48),
         "creme": (0xea,0xe0,0xc8), "creme-2": (0xb9,0xad,0x92), "or": (0xd9,0xab,0x4e),
         "or-vif": (0xf2,0xc9,0x6b), "laiton": (0xb0,0x8d,0x3e), "braise": (0xe0,0x66,0x4a),
         "cyan": (0x7f,0xd4,0xd9), "vert": (0x7d,0xb3,0x6a)}
RAYON = 12  # Tchebychev : absorbe le halo de tramage, pas une autre encre (la plus proche est a 22)

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = sorted(f for f in os.listdir(BASE) if f.endswith(".png"))


def hexa(c):
    return "#%02x%02x%02x" % c


def ancres(im, n=4):
    """Les n couleurs litterales les plus frequentes, en refusant deux ancres a distance <= RAYON."""
    tot = im.size[0] * im.size[1]
    out = []
    for cnt, c in sorted(im.getcolors(1 << 22), reverse=True):
        if all(max(abs(c[i] - a[i]) for i in range(3)) > RAYON for a, _ in out):
            out.append((c, cnt / tot * 100))
        if len(out) == n:
            break
    return out


def parts(im, anc):
    tot = im.size[0] * im.size[1]
    p = [0] * len(anc)
    hors = 0
    for cnt, c in im.getcolors(1 << 22):
        j = None
        for i, a in enumerate(anc):
            if max(abs(c[k] - a[k]) for k in range(3)) <= RAYON:
                j = i; break
        if j is None:
            hors += cnt
        else:
            p[j] += cnt
    return [x / tot * 100 for x in p], hors / tot * 100


def ecart_canon(c):
    return sorted(((max(abs(c[i] - t[i]) for i in range(3)), n) for n, t in CANON.items()))[:1][0]


def controle_positif():
    print("== CONTROLE POSITIF ==")
    im = Image.new("RGB", (100, 100), (22, 28, 43))
    im.paste(Image.new("RGB", (50, 100), (176, 141, 62)), (0, 0))
    im.paste(Image.new("RGB", (10, 10), (23, 29, 44)), (60, 0))   # halo de tramage : doit etre ABSORBE
    im.paste(Image.new("RGB", (10, 10), (234, 224, 200)), (80, 0))
    a = ancres(im, 4)
    p, h = parts(im, [c for c, _ in a])
    print(f"  synthetique {im.size} ancres={[hexa(c) for c,_ in a]} parts={[round(x,1) for x in p]} hors={h:.1f}%")
    ok = ([hexa(c) for c, _ in a] == ["#b08d3e", "#161c2b", "#eae0c8"]
          and [round(x) for x in p] == [50, 49, 1] and h == 0.0)
    print(f"  attendu ancres=[#b08d3e,#161c2b,#eae0c8] parts=[50,49,1] hors=0 (le halo #171d2c fondu dans #161c2b) -> {'OK' if ok else 'ECHEC'}")
    # controle negatif : une couleur VRAIMENT etrangere doit sortir en 'hors'
    im2 = im.copy(); im2.paste(Image.new("RGB", (10, 10), (224, 102, 74)), (0, 90))
    a2 = ancres(im2, 3); p2, h2 = parts(im2, [c for c, _ in a2])
    ok2 = abs(h2 - 1.0) < 0.001
    print(f"  controle NEGATIF (#e0664a pose sur 1% du cadre, hors des 3 ancres) -> hors={h2:.2f}% {'OK' if ok2 else 'ECHEC'}")
    return ok and ok2


if __name__ == "__main__":
    if not controle_positif():
        sys.exit("controle positif en echec")
    print("\n== PALETTE LITTERALE (rayon Tchebychev %d) ==" % RAYON)
    toutes = {}
    for i, f in enumerate(IMAGES, 1):
        im = Image.open(os.path.join(BASE, f)).convert("RGB")
        a = ancres(im, 4)
        anc = [c for c, _ in a]
        p, hors = parts(im, anc)
        par_lum = sorted(range(4), key=lambda j: 0.2126*anc[j][0]+0.7152*anc[j][1]+0.0722*anc[j][2])
        bouts = []
        for j in par_lum:
            d, nom = ecart_canon(anc[j])
            bouts.append(f"{hexa(anc[j])} {p[j]:5.1f}% [{nom} d={d}]")
            toutes.setdefault(par_lum.index(j), []).append(anc[j])
        print(f"E{i:<2} {f:<24} {im.size[0]}x{im.size[1]} " + " | ".join(bouts) + f" | hors {hors:4.1f}%")
    print("\n== SERIE : la meme palette d'une image a l'autre ? (critere <= 6/255 par canal) ==")
    for rang, lst in sorted(toutes.items()):
        mn = tuple(min(c[k] for c in lst) for k in range(3))
        mx = tuple(max(c[k] for c in lst) for k in range(3))
        etendue = tuple(mx[k] - mn[k] for k in range(3))
        print(f"  encre #{rang} (12 images) : min={hexa(mn)} max={hexa(mx)} etendue par canal={etendue}")
