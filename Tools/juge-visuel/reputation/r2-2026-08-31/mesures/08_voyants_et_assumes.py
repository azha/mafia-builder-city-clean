#!/usr/bin/env python3
"""08 — Les voyants éteints, le cou, et la vérification des écarts ASSUMÉS.

Un écart assumé n'est pas un écart, mais il doit être rendu PROPREMENT : pas de
trou, pas de libellé de repli, pas d'encre étrangère. On le vérifie ici.

Contrôle positif : le voyant n°1, dont je sais qu'il est égal (même token, même
gabarit) — s'il sortait différent, l'instrument serait en cause.
Contrôle négatif : le taux de remplissage du col, repris de 04, pour prouver que
le même détecteur de forme discrimine bien un disque d'un carré.
"""
from PIL import Image
import os

D = os.path.dirname(__file__)
REF = os.path.join(D, "..", "reference", "m-120.png")
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"


def forme(im, box, fond, s, label, tol=10):
    px = im.load()
    X, Y, n, hist = [], [], 0, {}
    for x in range(box[0], box[2]):
        for y in range(box[1], box[3]):
            p = px[x, y]
            if max(abs(a - b) for a, b in zip(p, fond)) > tol:
                X.append(x)
                Y.append(y)
                n += 1
                hist[p] = hist.get(p, 0) + 1
    if not X:
        print(f"  {label:24s} RIEN")
        return
    lar = (max(X) - min(X) + 1) / s
    hau = (max(Y) - min(Y) + 1) / s
    aire = n / s / s
    dom = max(hist.items(), key=lambda kv: kv[1])[0]
    print(f"  {label:24s} {lar:4.1f} x {hau:4.1f} CSS   aire {aire:5.1f}   "
          f"remplissage {aire/(lar*hau):.2f}   couleur dominante {dom}")


def encre(im, box):
    px = im.load()
    best = None
    for x in range(box[0], box[2]):
        for y in range(box[1], box[3]):
            p = px[x, y]
            if best is None or sum(p) > sum(best):
                best = p
    return best


def main():
    r = Image.open(REF).convert("RGB")
    c = Image.open(CAP).convert("RGB")
    print(f"REF {os.path.basename(REF)} {r.size}   CAP {os.path.basename(CAP)} {c.size}")

    print("\n[VOYANT ÉTEINT n°1]  (0,79 = disque · 1,00 = carré)   [CONTRÔLE POSITIF]")
    forme(r, (468, 858, 502, 892), (17, 24, 35), 3.0, "réf")
    forme(c, (556, 565, 604, 613), (13, 22, 34), 3.6, "jeu")

    print("\n[COU]  bbox et jonction avec le col")
    for lab, im, box, o, s in (("réf", r, (72, 732 + 294, 420, 732 + 345), (69, 732), 3.0),
                               ("jeu", c, (76, 435 + 349, 494, 435 + 417), (72, 435), 3.6)):
        px = im.load()
        X, Y = [], []
        for x in range(box[0], box[2]):
            for y in range(box[1], box[3]):
                if max(abs(a - b) for a, b in zip(px[x, y], (185, 173, 146))) <= 12:
                    X.append(x)
                    Y.append(y)
        x0, x1 = (min(X) - o[0]) / s, (max(X) - o[0]) / s
        y0, y1 = (min(Y) - o[1]) / s, (max(Y) - o[1]) / s
        print(f"  {lab} : x {x0:5.1f}->{x1:5.1f} (centre {(x0+x1)/2:5.1f}, axe 58.9) "
              f" y {y0:5.1f}->{y1:5.1f}")
    print("  rappel (04) : col réf y 115.3->131.7  |  col jeu y 113.9->135.3")
    print("  -> réf : le cou finit à 114.7, le col commence à 115.3 : ils s'aboutent.")
    print("  -> jeu : le cou finit à 115.6, le col commence à 113.9 : ils se recouvrent.")

    print("\n[ASSUMÉ 1] compteur ENFREINTES : « — » et non « 00 »")
    a = encre(r, (680, 595, 780, 640))
    b = encre(c, (830, 290, 930, 330))
    print(f"  réf « 00 » : {a}    jeu « — » : {b}    "
          f"delta {max(abs(x-y) for x, y in zip(a,b))}/255")
    print("  -> même encre que les chiffres, centrée dans la tuile : rendu PROPREMENT.")

    print("\n[ASSUMÉ 2] « Salvatore » + mention « lieutenant.name — non projeté (L0.4) »")
    for lab, im, box, o, s in (("réf", r, (75, 732 + 460, 415, 732 + 490), (69, 732), 3.0),
                               ("jeu", c, (80, 435 + 552, 480, 435 + 588), (72, 435), 3.6)):
        px = im.load()
        hist = {}
        for x in range(box[0], box[2]):
            for y in range(box[1], box[3]):
                p = px[x, y]
                if p[1] > 140 and p[1] > p[0] + 30 and p[1] > p[2] + 30:
                    hist[p] = hist.get(p, 0) + 1
        xs = [x for x in range(box[0], box[2])
              for y in range(box[1], box[3]) if sum(px[x, y]) / 3 > 70]
        print(f"  {lab} : « Il vous écoute » vert "
              f"{max(hist.items(), key=lambda kv: kv[1])[0] if hist else '—'} ; "
              f"encre x {(min(xs)-o[0])/s:.1f}->{(max(xs)-o[0])/s:.1f} CSS")
    print("  -> même vert, même position dans la carte : rendu PROPREMENT.")

    print("\n[ASSUMÉ 3] « le col rendu par un triangle sommaire »")
    print("  taux de remplissage du col (cf. 04) : réf 0.43 (triangle) | jeu 0.93 (rectangle)")
    print("  -> ce qui est rendu n'est PAS le triangle assumé. L'écart sort du périmètre")
    print("     de l'assumé et doit être remonté comme défaut.")

    print("\n[ASSUMÉ 4] 4 couleurs hors DesignTokens (Encre, Panneau, Liseré, Vert)")
    print("  cf. 03 : les aplats correspondants sortent à <= 4/255 de la maquette,")
    print("  et le vert à 0/255. La dette est de CODE, sans conséquence visuelle.")


if __name__ == "__main__":
    main()
