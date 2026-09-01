#!/usr/bin/env python3
"""01 — Correspondance des repères + géométrie des grandes frontières.

Échelle (dossier.md) : référence 900 px = 300 px CSS (x3,0)
                       capture  1080 px = 300 px CSS (x3,6)
Toute grandeur est imprimée EN PX CSS. Aucune comparaison en px bruts.

Contrôle positif : la couleur du liseré d'or du panneau extérieur, qui doit être
identique des deux côtés (c'est un token recopié, pas une grandeur mesurée).
Contrôle négatif : la hauteur de la carte-portrait, dont je sais qu'elle diffère
(l'oeil la voit) — un instrument qui la trouverait égale ne mesure rien.
"""
from PIL import Image
import os

REF = os.path.join(os.path.dirname(__file__), "..", "reference", "m-120.png")
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"

S_REF, S_CAP = 3.0, 3.6


def bandes_or(im, scale, label):
    """Lignes horizontales majoritairement or (176,141,62) -> frontières.

    Critère : la plus longue plage CONTIGUË d'or sur la ligne doit dépasser 20 %
    de la largeur. Sans ce critère, les lignes de glyphes du CTA (texte or, lettres
    espacées) comptent autant de pixels or qu'un filet et se font passer pour lui.
    """
    w, h = im.size
    px = im.load()

    def plus_longue(y):
        best = cur = 0
        for x in range(w):
            p = px[x, y]
            if p[0] > 140 and p[1] > 110 and p[2] < 110:
                cur += 1
                best = max(best, cur)
            else:
                cur = 0
        return best

    runs, cur = [], None
    for y in range(h):
        n = plus_longue(y)
        if n > 0.20 * w:
            cur = (y, y) if cur is None else (cur[0], y)
        else:
            if cur:
                runs.append(cur)
            cur = None
    if cur:
        runs.append(cur)
    print(f"  {label} — bandes d'or (px CSS) :")
    for a, b in runs:
        print(f"    y {a/scale:7.1f} -> {b/scale:7.1f}   ep. {(b-a+1)/scale:.1f}")
    return [(a / scale, b / scale) for a, b in runs]


def main():
    r = Image.open(REF).convert("RGB")
    c = Image.open(CAP).convert("RGB")
    print(f"REF  {os.path.basename(REF)}  {r.size}  -> {r.size[0]/S_REF:.0f}x{r.size[1]/S_REF:.1f} CSS")
    print(f"CAP  {os.path.basename(CAP)}  {c.size}  -> {c.size[0]/S_CAP:.0f}x{c.size[1]/S_CAP:.1f} CSS")

    print("\n[CONTRÔLE POSITIF] couleur du liseré d'or, panneau extérieur")
    print("  ref (x=6.5 CSS, y=160 CSS) :", r.getpixel((20, 480)))
    print("  cap (x=5.5 CSS, y= 40 CSS) :", c.getpixel((20, 144)))

    print("\n[REPÈRES]")
    rr = bandes_or(r, S_REF, "REF")
    cc = bandes_or(c, S_CAP, "CAP")

    if rr and cc:
        off = rr[0][0] - cc[0][0]
        print(f"\n  OFFSET vertical réf<-cap = {off:.1f} px CSS "
              f"(le bandeau/chrome absent de la capture)")
        print(f"  hauteur utile réf sous le chrome : {r.size[1]/S_REF - rr[0][0]:.1f} CSS")
        print(f"  hauteur utile cap sous le chrome : {c.size[1]/S_CAP - cc[0][0]:.1f} CSS")

    def h(runs, i, j, nom=""):
        if len(runs) > max(i, j):
            return runs[j][1] - runs[i][0]
        return float("nan")

    print("\n[HAUTEURS DÉRIVÉES, px CSS]")
    # index attendus : 0 haut panneau, 1 filet du bandeau-titre, 2 haut carte-portrait,
    # 3 bas carte-portrait, 4 haut CTA, 5 bas CTA, 6 bas panneau
    for nom, i, j in (("bloc-titre (haut panneau -> filet)", 0, 1),
                      ("carte-portrait (haut -> bas)", 2, 3),
                      ("CTA (haut -> bas)", 4, 5),
                      ("panneau entier", 0, 6)):
        a, b = h(rr, i, j, nom), h(cc, i, j, nom)
        print(f"  {nom:38s} réf {a:7.1f}   jeu {b:7.1f}   delta {b-a:+7.1f} "
              f"({(b-a)/a*100 if a else 0:+.1f} %)")

    print("\n[BILAN ÉLASTIQUE] où passe la hauteur rendue par le chrome absent ?")
    hr, hc = r.size[1] / S_REF, c.size[1] / S_CAP
    dispo_r = hr - rr[0][0] - (hr - rr[6][1])
    dispo_c = hc - cc[0][0] - (hc - cc[6][1])
    print(f"  hauteur d'image        réf {hr:7.1f}   jeu {hc:7.1f}   delta {hc-hr:+7.1f}")
    print(f"  marge haute (au-dessus du panneau)  réf {rr[0][0]:6.1f}   jeu {cc[0][0]:6.1f}")
    print(f"  marge basse                         réf {hr-rr[6][1]:6.1f}   jeu {hc-cc[6][1]:6.1f}")
    print(f"  hauteur DISPONIBLE pour le panneau  réf {dispo_r:6.1f}   jeu {dispo_c:6.1f}"
          f"   delta {dispo_c-dispo_r:+.1f}")
    print(f"  croissance de la carte-portrait                       "
          f"{h(cc,2,3)-h(rr,2,3):+.1f}")
    print("  -> si les deux deltas coïncident, le vide sous le portrait EST "
          "l'absorption\n     élastique du bandeau absent, pas un défaut de mise en page.")

    print("\n[CONTRÔLE NÉGATIF] la carte-portrait doit RESSORTIR différente ci-dessus.")


if __name__ == "__main__":
    main()
