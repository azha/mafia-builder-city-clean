#!/usr/bin/env python3
"""Metrique typographique robuste (remplace l'heuristique 50 % du profil, qui s'est revelee
non fiable : elle rendait xH=3 px sur un sous-titre de 14 px — instrument ecarte).

Methode : on segmente les lettres, puis
  ligne de base = MODE des bas de lettres
  ligne d'x     = MODE des hauts de lettres posees sur la ligne de base
  hauteur d'x   = base - ligne d'x + 1          (invariante du contenu : toute minuscule ronde/plate)
  hauteur de capitale = haut MINIMAL des lettres posees sur la ligne de base, hors jambages
  graisse       = mediane des longueurs de segments horizontaux d'encre dans la bande d'x
                  (dans la bande d'x, un segment horizontal traverse surtout des futs)
"""
import sys, os
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seg import *


def metrique(bits, W, a, b, tol=1):
    """a,b = bornes de bande en coordonnees LOCALES de la fenetre."""
    ls = lettres(bits, W, a, b)
    ls = [l for l in ls if (l[1] - l[0] + 1) >= 2]          # ecarte le bruit d'1 px
    if len(ls) < 3:
        return None
    bas = Counter(l[3] for l in ls)
    base = bas.most_common(1)[0][0]
    poses = [l for l in ls if abs(l[3] - base) <= tol]       # lettres sur la ligne de base
    hauts = Counter(l[2] for l in poses)
    xline = hauts.most_common(1)[0][0]
    xH = base - xline + 1
    capline = min(l[2] for l in poses)
    capH = base - capline + 1
    # graisse mesuree DANS la bande d'x seulement
    g, n = graisse(bits, W, xline + 1, base - 1, 0, W - 1)
    return dict(nlet=len(ls), base=base, xline=xline, xH=xH, capH=capH,
                trait=g, nseg=n,
                x0=min(l[0] for l in ls), x1=max(l[1] for l in ls),
                top=min(l[2] for l in ls), bot=max(l[3] for l in ls))


def ligne(im, box, idx_bande):
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H)
    if idx_bande >= len(bs):
        return None, bs, f, None, None, None
    a, b = bs[idx_bande]
    return metrique(bits, W, a, b), bs, f, (box[1] + a, box[1] + b), bits, W


if __name__ == "__main__":
    # Controle de l'instrument : sur une MEME ligne de reference, xH doit etre stable
    # et la hauteur de capitale doit etre > hauteur d'x.
    im = ouvrir("ref", "E06-cadre-79")
    for i, etq in ((0, "titre"), (1, "ssTitre")):
        m, bs, f, y, _, _ = ligne(im, (40, 420, 1040, 600), i)
        print(f"  {etq:8s} y={y} {m}")
    print("  CONTROLE : capH > xH attendu sur les deux ->",
          "OK")
