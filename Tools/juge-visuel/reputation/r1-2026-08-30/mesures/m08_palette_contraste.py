#!/usr/bin/env python3
"""m08 — couche globale : palette dominante, luminance moyenne, densité d'encre,
et contraste WCAG des textes principaux, mesuré sur le fond RÉEL.

Contrôle positif : le liseré or (176,141,62) doit ressortir des deux côtés.
Contrôle négatif : le rapport de contraste d'une couleur avec elle-même doit valoir 1,00.
"""
from PIL import Image


def lum(c):
    def f(v):
        v /= 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])


def contraste(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def palette(path, box=None, n=8):
    im = Image.open(path).convert("RGB")
    print(f"  [{path.split('/')[-1]} {im.size}] palette de {box or 'toute l image'} :")
    c = im.crop(box) if box else im
    tot = c.size[0] * c.size[1]
    q = c.quantize(colors=8, method=Image.MEDIANCUT).convert("RGB")
    cols = q.getcolors(tot); cols.sort(reverse=True)
    for k, v in cols[:n]:
        print(f"      {v}  {100.0*k/tot:5.2f} %")
    # luminance moyenne + densité d'encre (pixels s'écartant du fond dominant)
    raw = c.getcolors(tot); raw.sort(reverse=True)
    fond = raw[0][1]
    px = c.load(); s = 0; encre = 0
    for y in range(0, c.size[1], 3):
        for x in range(0, c.size[0], 3):
            p = px[x, y]; s += lum(p)
            if any(abs(p[i] - fond[i]) > 10 for i in range(3)):
                encre += 1
    nb = len(range(0, c.size[1], 3)) * len(range(0, c.size[0], 3))
    print(f"      fond dominant={fond}  luminance moyenne={s/nb:.4f}  densité d'encre={100.0*encre/nb:.2f} %")


def couleurs_texte(path, box, seuil_lum=0.08, mini=150):
    """liste les couleurs 'claires' (donc du texte/emphase) présentes dans une zone."""
    im = Image.open(path).convert("RGB")
    c = im.crop(box)
    cols = c.getcolors(c.size[0] * c.size[1]); cols.sort(reverse=True)
    out = [(k, v) for k, v in cols if lum(v) > seuil_lum and k >= mini]
    print(f"  [{path.split('/')[-1]} {im.size}] couleurs claires distinctes dans {box} : {len(out)}")
    for k, v in out[:10]:
        print(f"      {v}  n={k}  luminance={lum(v):.3f}")
    return out


REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r1-2026-08-30/reference/m-120.png"
C19 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"

if __name__ == "__main__":
    print("(contrôle négatif) contraste d'une couleur avec elle-même :",
          f"{contraste((17,24,35),(17,24,35)):.2f}")

    print("\n--- couche globale : CORPS de l'écran (réf sous le chrome, capture entière) ---")
    palette(REF, (18, 376, 882, 1732))
    palette(C19, (18, 18, 1062, 1902))

    print("\n--- emphases : couleurs claires du paragraphe explicatif ---")
    couleurs_texte(REF, (72, 1480, 830, 1590))
    couleurs_texte(C19, (80, 1285, 1000, 1375))

    print("\n--- contrastes texte / fond RÉEL ---")
    cas = [
        ("REF corps du paragraphe", (234, 224, 200), (17, 24, 35)),
        ("CAP corps du paragraphe", (185, 173, 146), (13, 22, 34)),
        ("REF titre « Le miroir » (or)", (240, 200, 110), (11, 17, 27)),
        ("CAP titre « Le miroir »", None, None),
    ]
    for nom, a, b in cas:
        if a:
            print(f"  {nom}: {contraste(a,b):.2f} : 1")
    # titre capture : couleur échantillonnée au centre d'un fût
    im = Image.open(C19).convert("RGB")
    imr = Image.open(REF).convert("RGB")
    print("  (échantillons de titre) REF (300,445) =", imr.getpixel((300, 445)),
          " CAP (369,105) =", im.getpixel((369, 105)))
