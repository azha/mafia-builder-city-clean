#!/usr/bin/env python3
"""m12 — (a) le COL (triangle clair) : bbox, aire, remplissage aire/boite, axe ; criteres de
sortie de l'assume (dossier). (b) la MONTRE : bbox et couleur, dans le quart bas-gauche du buste
UNIQUEMENT (le controle negatif de m04 avait montre que le masque gris attrapait le texte du haut ;
la fenetre est donc restreinte sous y_carte=140). (c) les VIDES : espace libre sous la carte
portrait et sous la 4e carte de regle, a l'interieur du grand panneau.
Repere m01 + carte portrait m04. Unites px CSS.
Controle positif: la couleur du col (aplat clair) doit etre proche des deux cotes.
Controle negatif (b): la meme fenetre, mais dans la haut du buste (sans montre), ne doit rien trouver."""
from PIL import Image

REF = ("/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png", 3.0, 18, 376, 17.0, 118.7)
CAP = ("/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png", 3.6, 18, 18, 15.0, 115.8)

PANEL = {"REF": (111.2, 321.8), "CAP": (109.5, 326.0)}      # haut/bas du grand panneau (m02)
CARTE_P = {"REF": 301.0, "CAP": 298.3}                        # bas de la carte portrait (m04)
LISTE4 = {"REF": 277.7, "CAP": 258.3}                         # bas de la 4e carte de regle (m08)


def run(n, path, sc, left, top, cx0, cy0):
    im = Image.open(path).convert("RGB"); px = im.load()
    print(f"{n} {path.split('/')[-1]} {im.size}")
    ox = left + cx0 * sc; oy = top + cy0 * sc  # origine carte portrait

    def bbox(f, xa, ya, xb, yb):
        p = [(x, y) for y in range(int(oy + ya * sc), int(oy + yb * sc))
             for x in range(int(ox + xa * sc), int(ox + xb * sc)) if f(*px[x, y][:3])]
        if not p:
            return None, 0.0, None
        X = [q[0] for q in p]; Y = [q[1] for q in p]
        bb = (round((min(X) - ox) / sc, 1), round((min(Y) - oy) / sc, 1),
              round((max(X) - ox) / sc, 1), round((max(Y) - oy) / sc, 1))
        # couleur mediane
        med = tuple(sorted(px[q[0], q[1]][i] for q in p)[len(p) // 2] for i in range(3))
        return bb, len(p) / sc / sc, med

    col = lambda r, g, b: r > 225 and g > 220 and b > 195
    bb, a, c = bbox(col, 2, 100, 115, 175)
    if bb:
        w = bb[2] - bb[0]; h = bb[3] - bb[1]
        print(f"  (a) COL  bbox={bb} l={w:.1f} h={h:.1f} aire={a:.1f} "
              f"remplissage_aire/boite={a/(w*h):.2f} axe_x={(bb[0]+bb[2])/2:.1f} (centre carte=58.9) "
              f"couleur={c}")
    gris = lambda r, g, b: 80 < r < 200 and abs(r - g) < 28 and abs(g - b) < 36 and 80 < b < 200
    bb, a, c = bbox(gris, 4, 128, 48, 156)
    print(f"  (b) MONTRE (bas-gauche) bbox={bb} aire={a:.1f} couleur={c}")
    bbn, an, _ = bbox(gris, 4, 100, 48, 126)
    print(f"      [ctrl neg] meme masque, haut du buste (sans montre) : bbox={bbn} aire={an:.1f}")
    pt, pb = PANEL[n]
    print(f"  (c) VIDES: panneau {pt}->{pb} (h={pb-pt:.1f}) ; "
          f"vide sous carte portrait = {pb-CARTE_P[n]:.1f} ; vide sous 4e carte regle = {pb-LISTE4[n]:.1f}")


for n, (p, sc, l, t, cx, cy) in (("REF", REF), ("CAP", CAP)):
    run(n, p, sc, l, t, cx, cy)
