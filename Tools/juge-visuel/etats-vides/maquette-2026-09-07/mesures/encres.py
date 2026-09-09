#!/usr/bin/env python3
"""INSTRUMENT 1 — les encres d'une image et leur part d'aire.

Grandeur mesuree : les k amas de couleur d'une image (k-moyennes ponderees, deterministe),
leur centre RGB, leur part d'aire, et le jeton du canon le plus proche.

Pourquoi k=3 ET k=4 : le procede DECLARE trois encres (bleu nuit / ocre / creme). Une
declaration de procede n'est pas une mesure de l'image. On mesure donc k=3 comme demande,
puis k=4 comme CONTROLE : si le 4e amas emporte une part d'aire comparable aux autres et
reduit fortement l'inertie, c'est que l'image porte quatre familles tonales et que le
modele a 3 encres en fond DEUX ensemble.

PIL seul, pas de numpy. Deterministe : init par percentiles de luminance, donc deux
executions rendent le meme resultat (controle 2).
"""
import sys, os
from PIL import Image

CANON = {
    "encre":   (0x0b, 0x10, 0x16),
    "panneau": (0x11, 0x18, 0x23),
    "lisere":  (0x2a, 0x36, 0x48),
    "creme":   (0xea, 0xe0, 0xc8),
    "creme-2": (0xb9, 0xad, 0x92),
    "or":      (0xd9, 0xab, 0x4e),
    "or-vif":  (0xf2, 0xc9, 0x6b),
    "laiton":  (0xb0, 0x8d, 0x3e),
    "braise":  (0xe0, 0x66, 0x4a),
    "cyan":    (0x7f, 0xd4, 0xd9),
    "vert":    (0x7d, 0xb3, 0x6a),
}


def lum(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def kmeans(hist, k, iters=80):
    """hist : liste (compte, (r,g,b)). Init deterministe type k-means++ : le 1er centre est
    la couleur la plus PRESENTE, chaque suivant celle qui maximise compte x distance^2 au plus
    proche centre deja pose. Pas d'alea, donc reproductible ; et pas de collapse (le defaut
    qu'un init par percentiles de luminance produisait, attrape par le controle positif)."""
    tot = sum(n for n, _ in hist)
    centres = [list(max(hist, key=lambda e: e[0])[1])]
    while len(centres) < k:
        best, bs = None, -1.0
        for n, c in hist:
            d = min((c[0]-ce[0])**2 + (c[1]-ce[1])**2 + (c[2]-ce[2])**2 for ce in centres)
            s_ = d * n
            if s_ > bs:
                bs, best = s_, c
        centres.append([float(best[0]), float(best[1]), float(best[2])])

    for _ in range(iters):
        som = [[0.0, 0.0, 0.0, 0] for _ in range(k)]
        for n, c in hist:
            best, bd = 0, None
            for j, ce in enumerate(centres):
                d = (c[0] - ce[0]) ** 2 + (c[1] - ce[1]) ** 2 + (c[2] - ce[2]) ** 2
                if bd is None or d < bd:
                    bd, best = d, j
            s = som[best]
            s[0] += c[0] * n; s[1] += c[1] * n; s[2] += c[2] * n; s[3] += n
        nouveaux, bouge = [], 0.0
        for j in range(k):
            if som[j][3] == 0:
                nouveaux.append(centres[j]); continue
            nc = [som[j][i] / som[j][3] for i in range(3)]
            bouge = max(bouge, max(abs(nc[i] - centres[j][i]) for i in range(3)))
            nouveaux.append(nc)
        centres = nouveaux
        if bouge < 0.05:
            break

    # affectation finale : parts d'aire + inertie
    parts = [0] * k
    inertie = 0.0
    for n, c in hist:
        best, bd = 0, None
        for j, ce in enumerate(centres):
            d = (c[0] - ce[0]) ** 2 + (c[1] - ce[1]) ** 2 + (c[2] - ce[2]) ** 2
            if bd is None or d < bd:
                bd, best = d, j
        parts[best] += n
        inertie += bd * n
    ordre = sorted(range(k), key=lambda j: lum(centres[j]))
    return ([tuple(round(v) for v in centres[j]) for j in ordre],
            [parts[j] / tot * 100 for j in ordre],
            (inertie / tot) ** 0.5)


def jeton_proche(c):
    best, bd = None, None
    for nom, t in CANON.items():
        d = max(abs(c[i] - t[i]) for i in range(3))
        if bd is None or d < bd:
            bd, best = d, nom
    t = CANON[best]
    return best, bd, tuple(c[i] - t[i] for i in range(3))


def mesurer(chemin, k):
    im = Image.open(chemin).convert("RGB")
    hist = im.getcolors(maxcolors=1 << 22)
    centres, parts, inertie = kmeans(hist, k)
    return im.size, centres, parts, inertie


def controle_positif():
    print("== CONTROLE POSITIF ==")
    # (1) image synthetique a 3 couleurs connues, proportions connues 50/25/25
    w = h = 64
    im = Image.new("RGB", (w, h), (11, 16, 22))
    im.paste(Image.new("RGB", (32, 32), (217, 171, 78)), (0, 0))
    im.paste(Image.new("RGB", (32, 32), (234, 224, 200)), (32, 0))
    p = "/tmp/_juge_ctl.png"
    im.save(p)
    taille, centres, parts, inertie = mesurer(p, 3)
    print(f"  synthetique {taille} -> centres {centres} parts {[round(x,1) for x in parts]} inertie {inertie:.2f}")
    ok1 = (centres == [(11, 16, 22), (217, 171, 78), (234, 224, 200)]
           and [round(x) for x in parts] == [50, 25, 25] and inertie < 0.001)
    print(f"  attendu [(11,16,22),(217,171,78),(234,224,200)] / [50,25,25] / 0.00 -> {'OK' if ok1 else 'ECHEC'}")
    # (2) determinisme : deux mesures de la MEME image doivent etre identiques
    a = mesurer(sys.argv[1] if len(sys.argv) > 1 else IMAGES[0], 3)
    b = mesurer(sys.argv[1] if len(sys.argv) > 1 else IMAGES[0], 3)
    ok2 = a[1] == b[1] and a[2] == b[2]
    print(f"  determinisme (meme image mesuree 2x, meme resultat) -> {'OK' if ok2 else 'ECHEC'}")
    os.remove(p)
    return ok1 and ok2


BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = sorted(f for f in os.listdir(BASE) if f.endswith(".png"))

if __name__ == "__main__":
    if not controle_positif():
        sys.exit("controle positif en echec — mesures non publiables")
    for k in (3, 4):
        print(f"\n== ENCRES k={k} ==")
        for i, f in enumerate(IMAGES, 1):
            taille, centres, parts, inertie = mesurer(os.path.join(BASE, f), k)
            bouts = []
            for c, p in zip(centres, parts):
                nom, d, dl = jeton_proche(c)
                bouts.append(f"{c} {p:5.1f}% ~{nom}(d={d},{dl})")
            print(f"E{i:<2} {f:<24} {taille[0]}x{taille[1]}  rms={inertie:5.1f}  " + " | ".join(bouts))
