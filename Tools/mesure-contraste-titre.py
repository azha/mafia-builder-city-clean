#!/usr/bin/env python3
"""Le titre de district est-il détaché de l'art qui passe derrière lui ?

POURQUOI cet instrument existe. Le titre flotte sur un fond PEINT dont la valeur varie
(ciel pâle de jour ↔ silhouette sombre) et qui DÉFILE sous lui au pan/zoom. « Est-ce
lisible ? » n'a donc pas une réponse mais une distribution, et c'est le pire cas qui
décide. L'œil ne le donne pas : il se pose sur la partie lisible.

CE QU'IL MESURE, et pourquoi PAS le contraste glyphe↔art. Le halo ne change pas la couleur
du glyphe : glyphe↔art vaut la même chose avant et après le correctif. Ce que le halo fait,
c'est INTERCALER une bande sombre entre les deux. La grandeur qui bouge est donc :
     luminance de l'anneau proche  vs  luminance de l'art alentour.
Sans halo les deux sont égales (l'anneau EST l'art). Avec halo l'anneau s'effondre.

⚠️ TROIS versions de cet instrument ont mesuré autre chose, et toutes trois rendaient un
résultat UNIFORME qui ressemblait à un verdict (« 100 % sous le seuil ») :
  v1 min sur tous les voisins → toujours un autre pixel de glyphe (texte contre lui-même).
  v2 min sur les voisins non-coeur → toujours la frange d'anti-crénelage.
  v3 max sur un anneau à 3px → encore la frange, par l'autre bout.
Le lissé entoure CHAQUE glyphe : tout ce qui regarde « le voisin » le trouve d'abord. D'où
la bande morte ci-dessous, qui saute la frange au lieu d'essayer de la filtrer.
Un balayage uniforme est le premier signe qu'un instrument mesure autre chose qu'on croit.

Usage : python3 Tools/mesure-contraste-titre.py <capture.png> [x0 y0 x1 y1]
"""
import sys
from PIL import Image

SEUIL_COEUR = 0.75   # luminance au-dessus de laquelle un pixel est du glyphe plein
BANDE_MORTE = 1      # px ignorés autour du coeur : la frange d'anti-crénelage vit là
EPAISSEUR_ANNEAU = 2 # px lus juste après la bande morte : le halo, s'il existe
MARGE_ART = 9        # px au-delà desquels on est dans l'art, halo compris

# ⚠️ BANDE MORTE RAMENÉE DE 2 À 1 PX LE 2026-08-22, ET C'EST UNE CINQUIÈME VERSION DE CET
# INSTRUMENT. À 2 px de bande morte + 3 px d'anneau, il lisait la zone à distance 3..5 du glyphe —
# or un juge indépendant a mesuré le PROFIL du halo livré :
#     d=1 : +0,073   d=2 : +0,080   d=3 : +0,031   d=6 : +0,007   d=10 : 0,000
# Le halo vit donc à d=1..2, c'est-à-dire ENTIÈREMENT DANS LA BANDE MORTE. L'instrument rendait
# « anneau == art, écart +0,0000 » et j'ai failli en conclure une régression du code : il n'y en
# avait pas, ma fenêtre regardait à côté.
# ★ Et il y a pire, qu'il faut écrire : la mesure PRÉCÉDENTE (anneau 0,2223 contre art 0,3490,
# « le halo mord ») était elle aussi fausse — le titre reposait alors à 65 % sur la bande sombre du
# letterbox, et c'est CETTE bande que l'anneau échantillonnait, pas le halo. Deux mesures
# successives, deux contaminations différentes, et la seconde m'avait CONFIRMÉ ce que je voulais.
# ⇒ Régime à déclarer avec tout résultat de cet instrument : sur QUOI le titre repose.


def luminance(c):
    def lin(v):
        v /= 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])


def ratio(la, lb):
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def med(xs):
    xs = sorted(xs)
    return xs[len(xs) // 2]


def main():
    path = sys.argv[1]
    box = tuple(int(v) for v in sys.argv[2:6]) if len(sys.argv) >= 6 else (0, 55, 500, 120)
    im = Image.open(path).convert("RGB")
    W, H = im.size
    px = im.load()

    coeur = {(x, y) for y in range(box[1], box[3]) for x in range(box[0], box[2])
             if luminance(px[x, y]) > SEUIL_COEUR}
    if len(coeur) < 20:
        print(f"RÉGIME : {len(coeur)} pixel(s) de coeur dans {box} — sous le plancher de 20, "
              f"la mesure n'a PAS eu lieu. Ce n'est pas un bon résultat, c'est une non-mesure.")
        return 2

    def distance_au_coeur(x, y):
        d = 99
        for (cx, cy) in coeur:
            d = min(d, max(abs(x - cx), abs(y - cy)))
            if d <= BANDE_MORTE:
                return d
        return d

    # Élargi verticalement : l'art se juge autour du titre, pas seulement sur sa ligne.
    zone = [(x, y) for y in range(max(0, box[1] - 12), min(H, box[3] + 12))
            for x in range(box[0], min(W, box[2] + 40))]
    anneau, art = [], []
    for (x, y) in zone:
        if (x, y) in coeur:
            continue
        d = distance_au_coeur(x, y)
        if BANDE_MORTE < d <= BANDE_MORTE + EPAISSEUR_ANNEAU:
            anneau.append(luminance(px[x, y]))
        elif d >= MARGE_ART:
            art.append(luminance(px[x, y]))

    if not anneau or not art:
        print(f"RÉGIME : anneau={len(anneau)} art={len(art)} — une des deux populations est vide, "
              f"mesure NON faite.")
        return 2

    lc, la, lart = med([luminance(px[x, y]) for (x, y) in coeur]), med(anneau), med(art)
    art_clair = sorted(art)[int(0.95 * len(art))]   # le pire cas : la partie la plus PÂLE de l'art
    print(f"RÉGIME : {len(coeur)} px de coeur, {len(anneau)} px d'anneau "
          f"(bande morte {BANDE_MORTE}px, épaisseur {EPAISSEUR_ANNEAU}px), {len(art)} px d'art")
    print(f"  luminance coeur (glyphe)      : {lc:.4f}")
    print(f"  luminance anneau (halo ?)     : {la:.4f}")
    print(f"  luminance art (médiane)       : {lart:.4f}")
    print(f"  luminance art (95e c., pâle)  : {art_clair:.4f}")
    print(f"  → contraste glyphe / anneau   : {ratio(lc, la):.2f}:1")
    print(f"  → contraste glyphe / art pâle : {ratio(lc, art_clair):.2f}:1   (inchangé par le halo)")
    print(f"  → ANNEAU PLUS SOMBRE QUE L'ART : {'OUI' if la < lart else 'NON'} "
          f"(écart {lart - la:+.4f}) — c'est LA propriété que le halo doit produire")
    return 0


if __name__ == "__main__":
    sys.exit(main())
