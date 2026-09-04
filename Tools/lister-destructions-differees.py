#!/usr/bin/env python3
"""Les `[TearDown]` qui détruisent un locataire par `Object.Destroy` — la cause de TD-576.

⛔⛔ POURQUOI CET OUTIL EXISTE, mesuré et REPRODUIT le 2026-09-03.
`Object.Destroy` est DIFFÉRÉ à la fin de la frame. Un contrôleur « détruit » en `[TearDown]`
survit donc au test, ses coroutines continuent de courir, et sa requête en vol revient PENDANT
LE TEST SUIVANT. Elle journalise alors une erreur — et NUnit impute tout log d'erreur non
déclaré au test qui court à cet instant.

★ LA VICTIME N'EST JAMAIS LE TEST FAUTIF : c'est celui qui passait par là. C'est toute la
  signature de TD-576 — vert SEUL, rouge EN GROUPE, et un ACCUSÉ DIFFÉRENT d'un run à l'autre.
  Mesuré sur `ScreenB3,EcranExceptions` : 18/1, `B3C1` accusé d'un « [ExceptionQueue] load
  failed: 401 » émis par la suite des exceptions.
★ ET CE QU'ON CHERCHAIT ÉTAIT LA MAUVAISE PROPRIÉTÉ. On cherchait ce que les trois `Capture*`
  avaient en commun, en soupçonnant le pilote graphique. Leur seul point commun était leur
  DURÉE : une capture tourne longtemps, donc c'est elle qui a le plus de chances de courir
  quand l'orphelin parle. *Une corrélation avec le rendu qui n'était qu'une corrélation avec
  le temps.*

⇒ `Object.DestroyImmediate` arrête les coroutines SYNCHRONEMENT, avant le test suivant.
  *Un objet « détruit » qui vit encore une frame n'est pas détruit : il est en sursis, et ce
  sursis est PARTAGÉ.*

⛔⛔ CE QUE CET OUTIL NE FAIT PAS, ET POURQUOI IL N'EST PAS UNE GARDE.
Il ne sait pas si l'objet détruit ÉMET DES REQUÊTES — seul ce cas-là contamine. Un `[TearDown]`
qui détruit un GameObject nu est parfaitement sain, et ils sont la majorité. Une garde qui
rougirait sur les 61 fichiers mesurés serait rouge partout dès le premier jour, donc lue par
personne : *un instrument qui crie toujours ne dit plus rien.*
⇒ Il CLASSE : les fichiers dont le TearDown détruit un objet portant un `Client`/`Controller`
  connu pour appeler le réseau sont RANGÉS À PART. Le reste est listé pour mémoire.

⚠️ ET IL NE CORRIGE RIEN. Les 61 fichiers appartiennent à plusieurs sessions ; un balayage de
masse fabriquerait exactement le conflit qu'on a payé aujourd'hui sur un seul fichier. Chaque
propriétaire corrige les siens — cet outil sert à ce que personne n'ait à redécouvrir la cause.

Usage :
    python3 Tools/lister-destructions-differees.py
    python3 Tools/lister-destructions-differees.py --tous   # y compris les cas jugés sains
"""
import pathlib
import re
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
TESTS = RACINE / "Assets" / "Tests"

BLOC = re.compile(r'\[(?:Unity)?TearDown\][\s\S]{0,2000}?\n        \}')
DESTROY = re.compile(r'Object\.Destroy\(')
# Un objet qui parle au réseau est un `*Controller` ou porte un `*Client`. C'est une
# HEURISTIQUE assumée : elle rate un contrôleur nommé autrement, et c'est pourquoi cet outil
# classe au lieu de trancher.
EMETTEUR = re.compile(r'(Controller|Client|Shell|Screen)')


def main() -> int:
    tous = "--tous" in sys.argv
    if not TESTS.is_dir():
        print(f"⛔ {TESTS} introuvable — l'outil ne voit pas l'arbre, son résultat ne vaut rien.")
        return 2

    suspects, sains = [], []
    fichiers = 0
    for p in sorted(TESTS.rglob("*.cs")):
        s = p.read_text(encoding="utf-8", errors="replace")
        fichiers += 1
        for m in BLOC.finditer(s):
            bloc = m.group(0)
            n = len(DESTROY.findall(bloc))
            if not n:
                continue
            (suspects if EMETTEUR.search(bloc) else sains).append((p.name, n))

    if fichiers == 0:
        # ⚠️ ANTI-VACUITÉ : « rien trouvé » et « tout est propre » auraient la même sortie sinon.
        print("aucun fichier de test balayé — résultat sans valeur.")
        return 2

    print(f"{fichiers} fichier(s) de test balayé(s)\n")
    print(f"⛔ {len(suspects)} TearDown détruisant un objet qui PARLE PROBABLEMENT AU RÉSEAU "
          "— à passer en `DestroyImmediate` :")
    for f, n in suspects:
        print(f"    {n}  {f}")
    print(f"\n·  {len(sains)} autre(s) TearDown avec `Object.Destroy` — probablement sains "
          "(objets nus).")
    if tous:
        for f, n in sains:
            print(f"    {n}  {f}")
    print("\n⚠️ CHAQUE PROPRIÉTAIRE CORRIGE LES SIENS. Un balayage de masse sur des fichiers "
          "tenus par d'autres sessions fabrique un conflit certain — payé aujourd'hui sur UN "
          "fichier, ce serait ici sur des dizaines.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
