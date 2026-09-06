#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Le contrôle d'une clause RETIRÉE — sur la PROPRIÉTÉ, pas sur la tournure, et insensible au
repli de ligne.

⛔⛔ POURQUOI CE SCRIPT EXISTE. Le socle prescrit, pour tout retrait d'un énoncé faux, un compte
`grep -cF` posé dans LE MÊME commit, avec sa valeur attendue AVANT et APRÈS. Le 2026-09-06 ce
geste a rendu **0 sur un fichier où la clause était présente** : elle est écrite dans un
commentaire C# et le formateur l'a coupée en deux lignes, `//    ` au milieu. Un motif littéral
d'une seule ligne ne peut pas la voir — c'est le piège d'élision, appliqué au dispositif même qui
existe pour l'éviter. *Un contrôle qui asserte un zéro est exactement aussi vulnérable que la
falsifiable qu'il surveille.*

⇒ CE QUE FAIT CE SCRIPT, et c'est tout : il APLATIT (espaces multiples, retours à la ligne et
marqueurs de commentaire réduits à une espace) puis cherche une EXPRESSION de la propriété — une
suite de mots-clés séparés par des jokers bornés — plutôt qu'une phrase exacte. Deux formulations
du même faux exigent deux motifs ; un motif sur la propriété en couvre les variantes de mise en
page sans prétendre couvrir les variantes de vocabulaire.

⚠️ IL NE DIT PAS LA VÉRITÉ, IL DIT UN COMPTE. C'est à l'appelant d'écrire la valeur attendue
AVANT et APRÈS, et de l'exécuter sur le fichier INTACT d'abord : un motif qui rend déjà zéro avant
l'édition est un motif FAUX, pas un motif satisfait.

usage : controle-clause-retiree.py <fichier> <mot1> <mot2> [...]
        rend le nombre d'occurrences où les mots apparaissent dans cet ordre, à ≤ 80 caractères
        d'écart, une fois le texte aplati.
"""
import pathlib
import re
import sys


def compter(chemin, mots):
    texte = pathlib.Path(chemin).read_text(encoding="utf-8")
    # Aplatir : les marqueurs de commentaire et tout blanc deviennent une espace unique.
    plat = re.sub(r"\s+", " ", texte)
    plat = re.sub(r"\s*(?://+|/\*|\*/|^\*)\s*", " ", plat)
    motif = r"[^.]{0,80}".join(re.escape(m) for m in mots)
    return re.findall(motif, plat, re.IGNORECASE)


def main():
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        return 2
    trouves = compter(sys.argv[1], sys.argv[2:])
    print(f"{len(trouves)} occurrence(s) de la propriété [{' … '.join(sys.argv[2:])}]")
    for t in trouves:
        print(f"   « {t[:110]} »")
    return 0


if __name__ == "__main__":
    sys.exit(main())
