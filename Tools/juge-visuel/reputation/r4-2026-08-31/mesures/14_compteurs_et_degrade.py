#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 3 — (a) l'écart ASSUMÉ « ENFREINTES à — » : le tiret a-t-il la même
COULEUR et la même POSITION que les deux « 00 » ? (le dossier dit que sinon
l'écart sort de l'assumé) ; (b) le fond des tuiles compteurs : la maquette y
pose un DÉGRADÉ, on le mesure par un profil diagonal.

CONTRÔLE POSITIF (a) : les deux « 00 » de la maquette sont le même token ; le
même relevé doit les donner identiques entre eux, dans chaque image.
CONTRÔLE NÉGATIF (a) : le libellé sous le chiffre (gris) ne doit PAS être
classé comme la couleur du chiffre.
CONTRÔLE POSITIF (b) : le profil pris HORS tuile (dans la gouttière du panneau
racine) doit être plat dans les deux images.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"

# tuiles compteurs mesurées par 12_tuiles.py (bords intérieurs)
TUILES = {
    "REF": dict(k=3.0, y=(585, 678), x=[(43, 300), (321, 578), (599, 856)], ytexte=(592, 652)),
    "JEU": dict(k=3.6, y=(262, 377), x=[(47, 359), (384, 695), (720, 1031)], ytexte=(268, 335)),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def encre(im, box, seuil=60):
    """pixel le plus saturé/clair de la boîte + bbox de l'encre + couleur médiane"""
    px = im.load()
    x0, y0, x1, y1 = box
    f = sorted(lum(px[x, y]) for y in range(y0, y1, 2) for x in range(x0, x1, 2))
    fond = f[len(f) // 2]
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1)
           if lum(px[x, y]) - fond > seuil]
    if not pts:
        return None
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    cols = sorted((px[x, y] for x, y in pts), key=lum)
    return (min(xs), min(ys), max(xs), max(ys), len(pts), cols[9 * len(cols) // 10])


def main():
    for nom, path in (("REF", REF), ("JEU", CAP)):
        im = Image.open(path).convert("RGB")
        c = TUILES[nom]
        k = c["k"]
        print("=" * 74)
        print(f"{nom} {path} {im.size}  facteur x{k}")
        infos = []
        for i, (a, b) in enumerate(c["x"]):
            e = encre(im, (a + 4, c["ytexte"][0], b - 4, c["ytexte"][1]))
            if not e:
                print(f"  tuile {i+1} : AUCUNE encre trouvée")
                infos.append(None); continue
            x0, y0, x1, y1, n, col = e
            cxr = round(100.0 * ((x0 + x1) / 2 - a) / (b - a), 1)
            infos.append((col, y0, y1, cxr))
            print(f"  tuile {i+1} : couleur {col}  bbox y {y0}..{y1} "
                  f"(h={round((y1-y0+1)/k,1)} CSS)  centre x = {cxr} % de la tuile "
                  f" milieu vertical y={round(((y0+y1)/2 - c['y'][0])/k,1)} CSS sous le bord haut")
        if all(infos):
            d01 = max(abs(infos[0][0][j] - infos[1][0][j]) for j in range(3))
            d02 = max(abs(infos[0][0][j] - infos[2][0][j]) for j in range(3))
            print(f"  [ctrl positif] écart de couleur entre les deux « 00 » : {d01} "
                  f"(attendu ≤ 6)")
            print(f"  écart de couleur 1er « 00 » ↔ 3e compteur : {d02}")
            print(f"  écart de milieu vertical 1er ↔ 3e : "
                  f"{round(((infos[2][1]+infos[2][2])/2 - (infos[0][1]+infos[0][2])/2)/k,1)} CSS")
            print(f"  écart de centrage horizontal 1er ↔ 3e : "
                  f"{round(infos[2][3]-infos[0][3],1)} points de %")
        # (b) dégradé du fond de la tuile 1 : profil diagonal
        px = im.load()
        a, b = c["x"][0]
        y0, y1 = c["y"]
        prof = []
        for t in range(0, 11):
            x = int(a + 6 + (b - a - 12) * t / 10.0)
            y = int(y0 + 6 + (y1 - y0 - 12) * t / 10.0)
            prof.append(px[x, y])
        print(f"  fond de la tuile 1, profil diagonal (11 points) :")
        print(f"     {prof}")
        amp = max(lum(p) for p in prof) - min(lum(p) for p in prof)
        print(f"     amplitude de luminance = {round(amp,1)} "
              f"→ {'DÉGRADÉ' if amp > 3 else 'APLAT'}")
        # ctrl positif (b) : gouttière du panneau racine, doit être plate
        g = [px[30, y] for y in range(y0 + 4, y1 - 4, 8)]
        print(f"  [ctrl positif] gouttière (x=30) : amplitude = "
              f"{round(max(lum(p) for p in g)-min(lum(p) for p in g),1)} (attendu ~0)")


main()
