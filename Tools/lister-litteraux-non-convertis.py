#!/usr/bin/env python3
"""Item 0.6 — qui pose du texte SANS passer par `Libelle`, et combien de littéraux chacun porte.

⛔ POURQUOI CET OUTIL PLUTÔT QU'UNE LISTE. Une liste de noms d'écrans écrite dans un document
devient fausse au premier écran ajouté, et elle rassure entre-temps. Ce balayage part des
SOURCES : la population, c'est « tout fichier qui pose du texte », obtenue en cherchant
`TextMeshProUGUI`, jamais une énumération tenue à la main.

★ CE QUE MESURER SEUL AURAIT DONNÉ DE FAUX. Mon premier balayage ne regardait que
  `Assets/Scripts/Operational/**` : 13 écrans sur 15 passaient par `Libelle`, et j'allais
  déclarer l'item presque fini. Sur la VRAIE population — 34 fichiers — ils sont 15 sur 34.
  *Nommer la population avant de compter, sinon on mesure son propre périmètre.*

★ ET COMPTER SEUL AURAIT ACCUSÉ 19 FICHIERS. En les CLASSANT par le nombre de littéraux
  réellement convertibles, sept n'en portent AUCUN — leur texte vient entièrement du serveur
  ou de champs dynamiques. Il en reste douze, dont un qui en concentre quatorze.
  *Compter accuse ; classer tranche.*

⚠️ CE QUE CET OUTIL NE DIT PAS : à qui appartient chaque fichier. Un écran arrivé par un merge
appartient à la session qui le tient, et le convertir en vol fabrique un conflit. Le compte est
une DETTE partagée, pas une liste de courses pour celui qui lance le script.

Usage :
    python3 Tools/lister-litteraux-non-convertis.py
    python3 Tools/lister-litteraux-non-convertis.py --exemples   # 2 littéraux par fichier
"""
import glob
import re
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent

# ⛔ CORRIGÉ le 2026-09-03 : la première version cherchait `poseur … "littéral"` en UNE passe
# non gourmande, donc elle s'arrêtait au PREMIER littéral de la ligne. Une ligne comme
#     videTexte.text = erreur == null ? "Aucun profil." : "Le profil n'a pas répondu.";
# comptait 1 au lieu de 2, et mon total annoncé (45) était SOUS-ÉVALUÉ.
# ★ Un instrument qui sous-compte rassure ; il ne se signale pas. Je l'ai découvert en OUVRANT
#   le premier fichier à convertir — pas en relisant l'outil.
# ⇒ Deux passes : repérer les LIGNES qui posent du texte, puis y prendre TOUS les littéraux.
LIGNE_POSEUSE = re.compile(r'(?:NouveauTexte|NewText|\.text\s*=)')
LITTERAL = re.compile(r'"([^"\\]{3,60})"')


def candidats(source: str) -> set[str]:
    trouves = set()
    for ligne in source.split('\n'):
        if not LIGNE_POSEUSE.search(ligne):
            continue
        for m in LITTERAL.finditer(ligne):
            s = m.group(1)
            if re.search(r'[A-Za-zÀ-ÿ]', s) and not s.startswith('/') and '{' not in s:
                trouves.add(s)
    return trouves


def main() -> int:
    exemples = "--exemples" in sys.argv
    convertis, restants = [], []

    for chemin in sorted(glob.glob(str(RACINE / 'Assets/Scripts/**/*.cs'), recursive=True)):
        texte = Path(chemin).read_text(encoding='utf-8', errors='replace')
        if 'TextMeshProUGUI' not in texte:
            continue                       # ne pose pas de texte : hors population
        court = chemin.split('Assets/Scripts/')[-1]
        if 'Libelle.De(' in texte:
            convertis.append(court)
        else:
            restants.append((len(candidats(texte)), court, sorted(candidats(texte))[:2]))

    population = len(convertis) + len(restants)
    if population == 0:
        # ⚠️ ANTI-VACUITÉ : « rien trouvé » et « tout va bien » auraient la même sortie sinon.
        print("aucun fichier ne pose de texte — le balayage ne voit pas l'arbre, "
              "son résultat ne vaut rien.")
        return 2

    restants.sort(reverse=True)
    vides = [r for r in restants if r[0] == 0]
    porteurs = [r for r in restants if r[0] > 0]

    print(f"population (fichiers qui posent du texte) : {population}")
    print(f"  ✓ passent par `Libelle`        : {len(convertis)}")
    print(f"  ⛔ n'y passent pas             : {len(restants)}")
    print(f"     · dont SANS littéral à convertir : {len(vides)}")
    print(f"     · dont PORTEURS de littéraux     : {len(porteurs)}"
          f"  ({sum(n for n, _, _ in porteurs)} littéraux au total)\n")

    for n, f, ex in porteurs:
        print(f"  {n:>3}  {f}")
        if exemples and ex:
            print(f"       ex. {ex}")
    if vides:
        print("\n  rien à convertir :")
        for _, f, _ in vides:
            print(f"       {f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
