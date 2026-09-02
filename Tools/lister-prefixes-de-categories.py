#!/usr/bin/env python3
"""Liste les catégories NUnit dont une AUTRE catégorie est le préfixe.

⛔ POURQUOI CET OUTIL EXISTE. `Filter.categoryNames` d'Unity matche par PRÉFIXE, pas par
égalité, et un préfixe inexact n'erreure PAS : il exécute silencieusement un AUTRE jeu de
tests que celui qu'on croit avoir demandé. Le piège a mordu trois sessions séparément :

  · `MAFIA_CI_CATEGORIES=CaptureDetail` a emporté `CaptureDetailMutant` — un test MUTANT,
    qui a consommé une carte de démo à usage unique que j'avais promis de préserver ;
  · `["HUD"]` a emporté `HUDv31` et rendu 31/31 VERT avec un défaut délibérément réarmé ;
  · une série de catégories nommées `Capture…` aurait été emportée par `Capture` nu, qui
    fait SIGSEGV dans Mesa.

★ Aucun de ces trois cas n'a rougi. Le filtre a fait exactement ce qu'on lui demandait —
  c'est la demande qui ne disait pas ce qu'on croyait. Un outil qui ÉNUMÈRE les relations
  de préfixe rend visible, en une seconde, ce que trois relectures n'avaient pas vu.

Usage :
    python3 Tools/lister-prefixes-de-categories.py            # toutes les relations
    python3 Tools/lister-prefixes-de-categories.py NomDeCat   # ce que CETTE demande emporte

⇒ Avant de nommer une catégorie neuve, passez-la ici. Une catégorie sûre est une catégorie
  dont aucune autre n'est le préfixe — c'est ainsi que `MutationDeCarte` a été nommée, et
  c'est pour ça qu'elle n'apparaît dans aucune ligne de ce rapport.
"""
import re
import subprocess
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
CIBLES = ["Assets/Tests", "Assets/Editor"]


def categories() -> list[str]:
    """Les catégories déclarées, lues DANS LES SOURCES — jamais dans une liste tenue à la main.
    Une liste figée devient fausse au premier `[Category]` ajouté, et le rapport rassure alors
    sur un périmètre qu'il ne couvre plus."""
    vues: set[str] = set()
    for cible in CIBLES:
        chemin = RACINE / cible
        if not chemin.exists():
            continue
        sortie = subprocess.run(
            ["grep", "-rhoE", r'Category\("[A-Za-z0-9_]+"\)', str(chemin)],
            capture_output=True, text=True,
        ).stdout
        vues.update(re.findall(r'Category\("([A-Za-z0-9_]+)"\)', sortie))
    return sorted(vues)


def emportees(demande: str, toutes: list[str]) -> list[str]:
    return [c for c in toutes if c != demande and c.startswith(demande)]


def main() -> int:
    toutes = categories()
    if not toutes:
        print("aucune catégorie trouvée — les dossiers cibles existent-ils ?")
        return 2

    if len(sys.argv) > 1:
        demande = sys.argv[1]
        if demande not in toutes:
            # ⚠️ Ne PAS traiter ça comme une erreur fatale : demander une catégorie qui
            # n'existe pas est précisément le cas où le filtre exécute autre chose en silence.
            print(f"⚠️ « {demande} » n'est déclarée nulle part — le run ne rougira pas pour "
                  f"autant, il exécutera ce que la ligne ci-dessous indique.")
        pris = emportees(demande, toutes)
        if pris:
            print(f"⛔ demander « {demande} » exécute AUSSI : {', '.join(pris)}")
            return 1
        print(f"✓ « {demande} » n'emporte aucune autre catégorie")
        return 0

    relations = [(a, b) for a in toutes for b in toutes if a != b and b.startswith(a)]
    for a, b in relations:
        print(f"  ⛔ demander « {a} » emporte « {b} »")
    print(f"\n{len(toutes)} catégories · {len(relations)} relations de préfixe")
    if relations:
        print("⚠️ Chacune de ces demandes exécute PLUS que son nom. Demandez toujours la "
              "catégorie la plus spécifique, et lisez « catégories RÉELLEMENT exécutées » "
              "dans le log — c'est la seule preuve de ce qui a tourné.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
