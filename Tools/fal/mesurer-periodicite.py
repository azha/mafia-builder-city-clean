#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""La couture invisible et la PÉRIODICITÉ visible sont deux propriétés distinctes.

Mesuré le 2026-09-06 : après `matiere.py --tuiler`, les trois matières rendent un raccord de 1 à 4
niveaux — invisible. Tuilées 2×2 sur une planche, l'œil suit quand même la répétition des mêmes
accidents : on lit la tuile avant de lire le papier. La mesure de couture ne peut pas voir ça — elle
ne regarde que les BORDS.

⛔ PREMIÈRE VERSION FAUSSE, gardée en mémoire ici : l'autocorrélation du profil au pas de tuile a rendu
**+0,910 · +0,909 · +0,909** sur les trois matières — trois valeurs à un millième près, la signature d'un
instrument qui mesure autre chose. Et il mesurait bien autre chose : un champ construit en RÉPÉTANT une
tuile est identique à lui-même décalé d'une période, PAR CONSTRUCTION. L'autocorrélation y vaut ~1 quelle
que soit la texture — elle ne teste pas la périodicité perçue, elle teste que j'ai bien tuilé. Une
tautologie du code qui fabrique le champ.

⇒ La grandeur qui DISCRIMINE n'est pas la présence de la période, c'est son AMPLITUDE : ce que l'œil
suit d'une tuile à l'autre, ce sont les accidents de BASSE FRÉQUENCE (un pli, une tache, une veine large)
qui reviennent au même endroit. Une tuile dont le profil de lignes est plat se répète sans se voir ; une
tuile qui porte un pli marqué se voit répétée même sans couture. On mesure donc l'écart-type du profil
de la TUILE, en niveaux de gris, avec ses deux contrôles.

Instrument historique conservé pour mémoire : l'autocorrélation du profil de luminance, reprise de
`Tools/juge-visuel/mesurer-fantome-menu-plus.py` (juge ⊥, 2026-09-06) qui l'emploie pour retrouver les
bandes d'un menu fantôme au pas connu. Ici le pas connu est la TUILE : si le champ tuilé se ressemble
à lui-même décalé d'une période, la répétition est structurelle et l'œil la trouvera.

Deux contrôles, sans lesquels un chiffre ne dit rien :
  · positif — la même texture tuilée : DOIT rendre une autocorrélation élevée au pas de tuile ;
  · négatif — un champ de bruit blanc de même taille : DOIT rendre ~0.
Un instrument qui ne les exécute pas peut rendre « pas de périodicité » pour n'avoir rien mesuré.

Usage : mesurer-periodicite.py <texture.png> [tuiles=5]
"""
import random
import sys

from PIL import Image


def profil(im):
    """Luminance moyenne par ligne — un champ répété se retrouve dans son propre profil."""
    g = im.convert("L")
    w, h = g.size
    px = g.load()
    xs = range(0, w, max(1, w // 160))
    return [sum(px[x, y] for x in xs) / len(xs) for y in range(h)]


def autocorr(v, lag):
    m = sum(v) / len(v)
    c = [a - m for a in v]
    n = len(c) - lag
    if n <= 0:
        return 0.0
    num = sum(c[i] * c[i + lag] for i in range(n))
    den = sum(a * a for a in c)
    return num / den if den else 0.0


def tuiler(im, n, cible=(1080, 2400)):
    t = im.resize((cible[0] // n, cible[0] // n), Image.LANCZOS)
    out = Image.new("RGB", cible)
    for y in range(0, cible[1], t.size[1]):
        for x in range(0, cible[0], t.size[0]):
            out.paste(t, (x, y))
    return out, t.size[1]


def amplitude(tuile):
    """Écart-type des profils de lignes ET de colonnes de la tuile, en niveaux — ce qui se répète."""
    g = tuile.convert("L")
    w, h = g.size
    px = g.load()
    lignes = [sum(px[x, y] for x in range(w)) / w for y in range(h)]
    colonnes = [sum(px[x, y] for y in range(h)) / h for x in range(w)]
    def sigma(v):
        m = sum(v) / len(v)
        return (sum((a - m) ** 2 for a in v) / len(v)) ** 0.5
    return sigma(lignes), sigma(colonnes)


SEUIL_AMPLITUDE = 6.0   # niveaux : au-delà, un accident large revient au même endroit à chaque tuile


def main() -> None:
    src = Image.open(sys.argv[1]).convert("RGB")
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    champ, periode = tuiler(src, n)
    tuile = src.resize((periode, periode), Image.LANCZOS)
    sl, sc = amplitude(tuile)

    # ⚠ Le contrôle négatif doit emprunter LE MÊME CHEMIN que le sujet. Première version : un bruit
    # tiré directement à la taille de la tuile — il rendait 5,5 niveaux, au-dessus du liège (1,6), donc
    # un « plancher » plus haut que la matière qu'il devait borner. C'était du bruit d'échantillonnage
    # (moyenner 216 pixels laisse 128/√216 ≈ 8), pas de la basse fréquence. Tiré à la taille de la
    # SOURCE puis réduit comme elle, il retombe où il doit.
    r = random.Random(7)
    bruit = Image.new("RGB", src.size)
    bruit.putdata([(r.randrange(256),) * 3 for _ in range(src.size[0] * src.size[1])])
    nl, nc = amplitude(bruit.resize((periode, periode), Image.LANCZOS))

    a = autocorr(profil(champ), periode)
    pire = max(sl, sc)
    verdict = "PÉRIODICITÉ VISIBLE" if pire > SEUIL_AMPLITUDE else "répétition non lisible à cette échelle"
    print(f"{sys.argv[1]} · tuilé {n}× sur 1080×2400, période {periode} px")
    print(f"  amplitude basse fréquence de la tuile : lignes {sl:.1f} · colonnes {sc:.1f} niveaux ⇒ {verdict}")
    print(f"  contrôle négatif (bruit fin, même taille) : {nl:.1f} · {nc:.1f}   "
          f"{'✓ un grain pur ne porte pas de période' if max(nl, nc) < 2 else '⚠ instrument bruité'}")
    print(f"  (pour mémoire, autocorrélation au pas de tuile : {a:+.3f} — TAUTOLOGIQUE sur un champ tuilé, "
          f"elle vaut ~1 par construction)")


if __name__ == "__main__":
    main()
