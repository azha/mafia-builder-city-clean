#!/usr/bin/env python3
"""m05 — geometrie du portrait EN COORDONNEES DE LA CARTE (origine = coin haut-gauche de la carte
doree, unite = px CSS). Les offsets globaux s'annulent : ce que ce script mesure est un RAPPORT
INTERNE, invariant d'echelle (cf dossier ECHELLE).
Cartes (m04): REF (17.0,118.7)-(134.7,301.0) ; CAP (15.0,115.8)-(132.8,298.3) — l=117.7/117.8.
Controle positif: la LARGEUR de la carte, 117.7 vs 117.8 CSS (deja mesuree, egale).
Controle negatif: le masque 'chapeau' restreint sous la ligne du texte ne doit rien trouver
au-dessus de y_carte=30 (le texte SALVATORE occupe 8..25) — verifie et imprime."""
from PIL import Image

REF = ("/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png", 3.0, 17.0 * 3 + 18, 118.7 * 3 + 376)
CAP = ("/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png", 3.6, 15.0 * 3.6 + 18, 115.8 * 3.6 + 18)
CARD_W, CARD_H = 117.7, 182.4


def run(name, path, sc, ox, oy):
    im = Image.open(path).convert("RGB")
    px = im.load()
    print(f"{name} {path.split('/')[-1]} {im.size}  origine_carte_px=({ox:.0f},{oy:.0f}) sc={sc}")

    def bbox(f, ya, yb, xa=2, xb=CARD_W - 2):
        p = [(x, y)
             for y in range(int(oy + ya * sc), int(oy + yb * sc))
             for x in range(int(ox + xa * sc), int(ox + xb * sc))
             if f(*px[x, y][:3])]
        if not p:
            return None, 0.0
        X = [q[0] for q in p]; Y = [q[1] for q in p]
        return (round((min(X) - ox) / sc, 1), round((min(Y) - oy) / sc, 1),
                round((max(X) - ox) / sc, 1), round((max(Y) - oy) / sc, 1)), len(p) / sc / sc

    peau = lambda r, g, b: 170 < r < 225 and 160 < g < 215 and 130 < b < 190 and r > b + 25
    noir = lambda r, g, b: r < 40 and g < 40 and b < 48
    blanc = lambda r, g, b: r > 225 and g > 220 and b > 195
    gris = lambda r, g, b: 90 < r < 180 and abs(r - g) < 25 and abs(g - b) < 32 and 90 < b < 180

    for lbl, f, ya, yb in (("visage(peau)", peau, 30, CARD_H),
                           ("chapeau(noir)", noir, 30, 100),
                           ("buste(noir)", noir, 100, CARD_H - 2),
                           ("plastron(blanc)", blanc, 30, CARD_H),
                           ("montre(gris bas)", gris, 120, CARD_H - 2)):
        bb, a = bbox(f, ya, yb)
        if bb is None:
            print(f"  {lbl:16s} ABSENT")
        else:
            print(f"  {lbl:16s} bbox={bb} l={bb[2]-bb[0]:5.1f} h={bb[3]-bb[1]:5.1f} "
                  f"cx={(bb[0]+bb[2])/2:5.1f} aire={a:7.1f} remplissage={a/((bb[2]-bb[0])*(bb[3]-bb[1])):.2f}")
    bb, a = bbox(noir, 26, 30)
    print(f"  [ctrl neg] noir dans la bande texte 26..30: {bb} aire={a:.1f} (attendu: nul ou minuscule)")
    print(f"  centre carte x = {CARD_W/2:.1f}")


for n, (p, sc, ox, oy) in (("REF", REF), ("CAP", CAP)):
    run(n, p, sc, ox, oy)
