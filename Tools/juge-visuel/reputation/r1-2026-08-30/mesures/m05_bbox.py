#!/usr/bin/env python3
"""m05 — bbox d'un objet dans une fenêtre, par proximité à une couleur cible.
Sert aux voyants (ronds ou ovales ?), à la carte portrait, aux traits du portrait.

Sortie : bbox px, largeur/hauteur en %L (largeur de l'image) et le RATIO h/l,
qui est INVARIANT d'échelle -> c'est lui qui tranche « rond vs ovale ».

Contrôle positif : chaque appel imprime la taille de l'image et le nombre de pixels
retenus ; 0 pixel retenu = mesure invalide, signalée.
"""
from PIL import Image


def bbox(path, box, cible, tol, nom):
    im = Image.open(path).convert("RGB")
    px = im.load()
    W, H = im.size
    x0, y0, x1, y1 = box
    mnx, mny, mxx, mxy, n = 10**9, 10**9, -1, -1, 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = px[x, y]
            if all(abs(c[i] - cible[i]) <= tol for i in range(3)):
                n += 1
                mnx = min(mnx, x); mxx = max(mxx, x)
                mny = min(mny, y); mxy = max(mxy, y)
    if n == 0:
        print(f"  !! {nom}: AUCUN pixel proche de {cible} dans {box} — mesure invalide")
        return None
    w = mxx - mnx + 1; h = mxy - mny + 1
    print(f"  {nom} [{path.split('/')[-1]} {W}x{H}] n={n} px  bbox=({mnx},{mny},{mxx},{mxy})"
          f"  l={w} px = {100.0*w/W:.2f} %L   h={h} px = {100.0*h/W:.2f} %L   ratio h/l = {h/w:.3f}")
    return (mnx, mny, mxx, mxy)


REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r1-2026-08-30/reference/m-120.png"
C19 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
OR = (176, 141, 62)

if __name__ == "__main__":
    print("--- VOYANT de la 1re carte (« col ouvert ») : rond ou ovale ? ---")
    # voyant = disque gris-bleu clair sur fond de carte
    bbox(REF, (470, 840, 515, 915), (40, 51, 69), 14, "REF voyant 1")
    bbox(C19, (550, 570, 600, 665), (42, 53, 73), 14, "CAP voyant 1")

    print("\n--- CARTE PORTRAIT (liseré or) ---")
    bbox(REF, (30, 700, 460, 1330), OR, 30, "REF carte portrait")
    bbox(C19, (30, 440, 540, 1130), OR, 30, "CAP carte portrait")

    print("\n--- TÊTE du portrait (aplat chair) ---")
    bbox(REF, (60, 850, 430, 1120), (200, 195, 165), 45, "REF tête")
    bbox(C19, (60, 560, 500, 900), (200, 195, 165), 45, "CAP tête")

    print("\n--- REVERS / plastron clair (le triangle blanc de la maquette) ---")
    bbox(REF, (60, 1050, 430, 1180), (238, 236, 220), 22, "REF revers")
    bbox(C19, (60, 830, 500, 1000), (238, 236, 220), 22, "CAP revers")

    print("\n--- BOUTON CTA (liseré or) ---")
    bbox(REF, (30, 1610, 880, 1715), OR, 30, "REF cta")
    bbox(C19, (30, 1440, 1060, 1555), OR, 30, "CAP cta")
