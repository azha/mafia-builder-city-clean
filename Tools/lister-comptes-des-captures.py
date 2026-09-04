#!/usr/bin/env python3
"""Quel COMPTE chaque suite de capture ouvre-t-elle — un `SignUp` neuf, ou le compte servi ?

⛔⛔ POURQUOI CET OUTIL EXISTE, et il a été payé par une accusation que j'ai failli porter.
Le 2026-09-04, une garde neuve a fait rougir ㉜ Délégation (8 teintes) et ㉝ Démolition (9) sur
des images de 1080x1920. J'allais les déclarer VIDES et envoyer leur session les réparer.
Vérification faite après coup : ㉜ ouvre un compte FRAIS (`SafeCallsign` + `SignUp`), ㉝ n'ouvre
AUCUNE session. Ces écrans n'avaient rien à afficher : leur état vide était le rendu CORRECT.

★ *Avant de conclure qu'un écran ne rend rien, il faut savoir s'il avait quelque chose à rendre.*
  Une capture ne mesure pas seulement l'écran : elle mesure l'écran ET le monde qu'on lui a
  donné. Sur un compte neuf, les deux lectures — « cassé » et « correctement vide » — produisent
  exactement la même image, et aucune garde de pixels ne peut les séparer.

⇒ D'où cet outil : il ne juge pas les captures, il dit sur QUEL MONDE elles sont prises. C'est le
  fait manquant sans lequel tout rouge chromatique est ininterprétable.

⛔ CE QU'IL NE FAIT PAS : convertir. Ces suites appartiennent à plusieurs sessions, et une
capture de juge prise sur un compte neuf n'est pas forcément un défaut — c'est un choix à
arbitrer écran par écran (montrer l'état vide EST parfois le sujet de la capture, cf. ㉞ qui
photographie délibérément son carnet non ouvert). L'outil rend une LISTE À TRANCHER.

Usage :
    python3 Tools/lister-comptes-des-captures.py
"""
import pathlib
import re
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
TESTS = RACINE / "Assets" / "Tests"

# Une suite CAPTURE si elle écrit un PNG.
CAPTURE = re.compile(r'"Assets/Screenshots/[^"]+\.png"')
# Les trois façons d'obtenir une identité, mesurées sur ce dépôt.
FRAIS = re.compile(r'SafeCallsign|auth\.SignUp')
SERVI = re.compile(r'seed_operational_demo|operational_demo|demoEmail|RunSeeder')
# ⚠️ IGNORER LES COMMENTAIRES — corrigé le 2026-09-04, une heure APRÈS avoir corrigé le MÊME
# défaut dans `lister-gardes-de-capture-vides.py`. Première version : ⑨ Réputation était classée
# « compte servi » à cause d'une ligne de commentaire qui mentionne `operational_demo@…` pour
# expliquer qu'elle ne l'utilise PAS. Le verdict était donc l'exact CONTRAIRE de ce que le
# fichier dit.
# ★ *Écrire une leçon ne l'applique pas au prochain outil.* Je l'avais formulée, commitée, et je
#   l'ai réintroduite vingt minutes plus tard dans un outil frère — parce qu'on relit ce qu'on
#   corrige, jamais ce qu'on écrit. Un motif qui cherche du CODE doit exclure les commentaires
#   par construction, pas par mémoire.
COMMENTAIRE = re.compile(r'^\s*(//|///|\*|/\*)')


def code_seul(source: str) -> str:
    """Le fichier PRIVÉ de ses lignes de commentaire — la seule matière où un motif de code a un
    sens. Une mention dans une explication n'est pas un usage ; c'est souvent son contraire."""
    return "\n".join(l for l in source.split("\n") if not COMMENTAIRE.match(l))


def main() -> int:
    if not TESTS.is_dir():
        print(f"⛔ {TESTS} introuvable — l'outil ne voit pas l'arbre, son résultat ne vaut rien.")
        return 2

    neufs, servis, sans = [], [], []
    balayes = 0
    for p in sorted(TESTS.rglob("*.cs")):
        s = code_seul(p.read_text(encoding="utf-8", errors="replace"))
        if not CAPTURE.search(s):
            continue
        balayes += 1
        nb = len(set(CAPTURE.findall(s)))
        if SERVI.search(s):
            servis.append((p.name, nb))
        elif FRAIS.search(s):
            neufs.append((p.name, nb))
        else:
            sans.append((p.name, nb))

    if balayes == 0:
        # ⚠️ ANTI-VACUITÉ : « aucune suite de capture » et « tout va bien » auraient la même sortie.
        print("aucune suite n'écrit de PNG — le motif ne voit pas l'arbre, résultat sans valeur.")
        return 2

    print(f"{balayes} suite(s) de capture balayée(s)\n")
    print(f"⛔ {len(sans)} suite(s) SANS AUCUNE SESSION — l'écran est monté nu, il ne peut "
          "rien avoir à afficher :")
    for f, n in sans:
        print(f"    {n:>2} PNG  {f}")
    print(f"\n⚠️ {len(neufs)} suite(s) sur un COMPTE FRAIS (`SignUp`) — état vide légitime, "
          "une garde de contenu y est ininterprétable :")
    for f, n in neufs:
        print(f"    {n:>2} PNG  {f}")
    print(f"\n✓ {len(servis)} suite(s) sur le COMPTE SERVI (`operational_demo`) — seules "
          "celles-là photographient un écran PLEIN :")
    for f, n in servis:
        print(f"    {n:>2} PNG  {f}")
    print("\n⚠️ À TRANCHER ÉCRAN PAR ÉCRAN, pas en bloc : photographier l'état vide est parfois "
          "le SUJET de la capture (㉞ montre délibérément son carnet non ouvert). Ce qui est "
          "fautif, c'est de prendre un état vide pour un écran plein — pas d'en prendre un.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
