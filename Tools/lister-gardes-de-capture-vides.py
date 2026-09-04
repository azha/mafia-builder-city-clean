#!/usr/bin/env python3
"""TD-554 — les gardes de capture qui ne peuvent PAS distinguer un écran d'un fond.

⛔⛔ LE DÉFAUT, ET LA RAISON POUR LAQUELLE IL A SURVÉCU DES SEMAINES EN ÉTANT VERT.
Deux gardes de capture circulaient dans ce dépôt :

    Assert.Greater(horsFond, 0, "…capture entièrement UNIFORME…")   ← gabarit des écrans neufs
    Assert.Greater(horsFond, 2f, "…22,7 % sur une liste VIDE…")     ← producteur partagé

`horsFond` est la PROPORTION de pixels qui s'écartent de la couleur dominante.
· Le seuil `> 0` n'exige QUE que l'image ne soit pas d'une seule couleur.
· Le seuil `> 2f` est ONZE FOIS SOUS le pire cas que son propre message cite (22,7 % sur une
  liste vide).
Un écran entièrement vide franchit les deux sans effort.

★ *Une garde dont le message d'échec cite un contre-exemple qui la passe documente sa propre
  inutilité* — et personne ne l'a lue ainsi, parce qu'elle était VERTE. On relit les gardes
  rouges ; les vertes, on les croit.

⛔ ET LA PROPORTION EST LA MAUVAISE GRANDEUR, indépendamment du seuil. L'anticrénelage d'un
seul titre produit autant de pixels « hors dominante » qu'une mise en page entière. Ce qui
sépare un écran d'un fond n'est pas COMBIEN de pixels diffèrent, c'est COMBIEN DE COULEURS
DIFFÉRENTES l'image porte : un fond, même bruité, en compte peu.
⇒ Remplacée par les deux gardes de `CaptureSousShell` — la TAILLE (une dimension sous 200 px
  trahit un RectTransform resté à 100×100, ce qui ne lève aucune erreur console) et le NOMBRE
  DE TEINTES (`> 12`). C'est la seule capture du dépôt dont chaque garde a été payée par une
  image fausse.

★ ET LA CAUSE N'ÉTAIT PAS QUATRE NÉGLIGENCES, C'ÉTAIT UN GABARIT. Les copies privées venaient
  toutes de `Tools/nouvel-ecran.py`, qui posait le seuil `> 0` accompagné de « plancher
  volontairement bas : le durcir une fois BuildLayout() rempli ». Aucun écran n'est jamais
  revenu le durcir. *Une dette écrite dans un GABARIT n'est pas une dette, c'est une politique :
  elle se reproduit à chaque usage, et son commentaire d'excuse se reproduit avec elle.*
  ⇒ Le gabarit est corrigé À LA SOURCE. Sans ça, cet outil retomberait à 1 au prochain écran.

Usage :
    python3 Tools/lister-gardes-de-capture-vides.py

Sort 1 s'il reste une occurrence. Doit rendre 0.
"""
import pathlib
import re
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
# Le gabarit compte : une occurrence là-dedans en fabrique une par écran généré.
CIBLES = [RACINE / "Assets" / "Tests", RACINE / "Tools" / "nouvel-ecran.py"]

FAUTIF = re.compile(r'Assert\.\w+\(\s*horsFond\s*[,>]')
# ⚠️ IGNORER LES LIGNES DE COMMENTAIRE. Première version : elle signalait le COMMENTAIRE qui
# explique le défaut corrigé (« Elle était : `Assert.Greater(horsFond, 2f)` »), donc le fichier
# réparé restait rouge à cause de sa propre documentation.
# ★ *Un instrument qui compte la mention d'un défaut comme le défaut lui-même pousse à ne plus
#   l'expliquer* — il achèterait son zéro contre la mémoire de la raison. C'est le contraire de
#   ce qu'on veut : ici, la trace écrite vaut autant que la correction.
COMMENTAIRE = re.compile(r'^\s*(//|///|\*|/\*)')


def main() -> int:
    trouves = []
    fichiers = 0
    for cible in CIBLES:
        chemins = sorted(cible.rglob("*.cs")) if cible.is_dir() else [cible]
        for p in chemins:
            if not p.exists():
                continue
            fichiers += 1
            for i, ligne in enumerate(p.read_text(encoding="utf-8", errors="replace").split("\n"), 1):
                if COMMENTAIRE.match(ligne): continue
                if FAUTIF.search(ligne):
                    trouves.append((p.relative_to(RACINE), i))

    if fichiers == 0:
        # ⚠️ ANTI-VACUITÉ : « rien trouvé » et « rien balayé » auraient la même sortie sinon.
        print("aucun fichier balayé — l'outil ne voit pas l'arbre, son 0 ne vaut rien.")
        return 2

    if trouves:
        print(f"⛔ {len(trouves)} garde(s) de capture assises sur `horsFond` "
              f"(sur {fichiers} fichier(s) balayé(s)) :")
        for f, n in trouves:
            print(f"    {f}:{n}")
        print("\n⇒ Remplacer par la TAILLE (>= 200 px) et le NOMBRE DE TEINTES (> 12), "
              "patron de `CaptureSousShell`.")
        return 1

    print(f"✓ 0 garde assise sur `horsFond` — {fichiers} fichier(s) balayé(s), "
          "gabarit `nouvel-ecran.py` inclus.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
