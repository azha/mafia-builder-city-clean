#!/usr/bin/env python3
"""Les replis passés à `Libelle.De(...)` qui sont ANGLAIS — donc affichés en anglais.

⛔ POURQUOI CET OUTIL EXISTE, et pourquoi le défaut était invisible.
`Libelle.De(domaine, role, litteral)` rend le LITTÉRAL quand la clé manque au bundle. Un écran
« converti » affiche donc son repli tel quel — et si ce repli est anglais, l'écran est anglais
malgré la conversion.

★ CE QUI A CACHÉ LE DÉFAUT EST LA PROPRIÉTÉ QUI RENDAIT LA CONVERSION SÛRE. J'ai converti
  treize écrans le 2026-09-02 en garantissant un repli BYTE-IDENTIQUE : c'est ce qui permettait
  de livrer sans run, puisque rien ne changeait à l'écran. Mais « rien ne change » incluait
  « ça reste en anglais ». *Une garantie de non-changement ne distingue pas ce qu'on préserve
  de ce qu'on aurait dû corriger.*
⚠️ Et aucun balayage par FICHIER ne le voit : ces lignes PASSENT par `Libelle`, donc
`lister-litteraux-non-convertis.py` les déclare converties. Deux populations disjointes —
littéraux non convertis d'un côté, replis anglais de l'autre — et le premier outil rend l'autre
invisible en le déclarant traité. Mesure due à la session F.

⚠️ CE QUE CET OUTIL NE FAIT PAS : décider. Un repli anglais peut être
  · du TEXTE D'INTERFACE (« No rules ») — mécanique à traduire ;
  · du VOCABULAIRE DE FICTION (« Bookkeeper », « Front shop ») — nommer un archétype ou un
    type de bâtiment en français est une décision d'ÉCRITURE, pas une substitution. Inventer
    ces noms au fil d'un balayage figerait une fiction que personne n'a ratifiée.
⇒ Il produit donc une LISTE À CLASSER, jamais un compte de dette.

Usage :
    python3 Tools/lister-replis-anglais.py
    python3 Tools/lister-replis-anglais.py --tous   # y compris les replis jugés français
"""
import glob
import re
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent

APPEL = re.compile(r'Libelle\.De\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"\\]+)"')
ACCENT = re.compile(r'[àâäçéèêëîïôöùûüÀÂÄÇÉÈÊËÎÏÔÖÙÛÜœ]')
# ⚠️ Les mots-outils FRANÇAIS prouvent le français même sans accent — sans eux, « Il se ferme »
# et « Cinq attendent » seraient comptés anglais. Un détecteur qui crie trop fort se fait
# ignorer, ce qui revient à ne pas exister.
MOT_FR = re.compile(r'\b(le|la|les|un|une|des|du|de|au|aux|vos|votre|pas|rien|sur|dans|qui|que'
                    r'|ne|est|sont|pour|avec|sans|plus|encore|jamais|tout|toute|il|elle|on|vous'
                    r'|se|y|en|ce|cet|cette|deux|trois|quatre|cinq|six|sept|huit|neuf|dix'
                    r'|plusieurs|aucun|aucune|inconnue|inconnu|ferme|tiens|tenez'
                    # ⚠️ AJOUTS DU 2026-09-03 — l'heuristique est « pas d'accent ET absent de cette
                    # liste ⇒ anglais », donc **tout mot français SANS ACCENT est un faux positif par
                    # construction**. Mesuré en convertissant l'Accueil : « Confortable », « Correct »,
                    # « Juste », « Ouvert » ont été accusés, et « CONFLIT », « DIPLOMATIE »,
                    # « RENSEIGNEMENT », « REPUTATION » l'étaient déjà côté exceptions.
                    # ⇒ Le compte de cet outil est un MAJORANT, pas une mesure : viser zéro sans
                    #   étendre la liste pousse à écrire du français accentué pour plaire au
                    #   détecteur. La liste EST le mécanisme prévu ; on l'étend, on ne tord pas les
                    #   mots. *Un détecteur qu'on satisfait en changeant le sujet ne mesure plus.*
                    r'|confortable|correct|juste|ouvert|ouverte|verrouille|verrouillee|fauche'
                    r'|conflit|diplomatie|renseignement|reputation|cours|flot|prix|options'
                    r'|silence|violent|abandon|avocat|police|argent|jour|nuit|ville|maison'
                    # Types de bâtiment ratifiés le 2026-09-03 (TD-578) — sept repris de
                    # `LibellesBatiment`, six ratifiés. Tous français, tous sans accent sauf deux :
                    # la liste est le seul moyen pour cet outil de les reconnaître.
                    r'|bureau|cache|coffre|laboratoire|relais|serre|planque|raffinerie'
                    r'|commerce|point|vente|atelier|presse|terrain|vague|specialise)\b', re.I)


def probablement_anglais(litteral: str) -> bool:
    if ACCENT.search(litteral):
        return False
    if MOT_FR.search(litteral):
        return False
    # Un repli d'un seul caractère ou purement symbolique (« — », « [#] ») n'est pas de la langue.
    return bool(re.search(r'[A-Za-z]{3}', litteral))


def main() -> int:
    tous = "--tous" in sys.argv
    par_fichier: dict[str, list[tuple[str, str]]] = {}
    total_appels = 0

    for chemin in sorted(glob.glob(str(RACINE / 'Assets/Scripts/**/*.cs'), recursive=True)):
        texte = Path(chemin).read_text(encoding='utf-8', errors='replace')
        court = chemin.split('Assets/Scripts/')[-1]
        for m in APPEL.finditer(texte):
            total_appels += 1
            lit = m.group(3)
            if tous or probablement_anglais(lit):
                par_fichier.setdefault(court, []).append((m.group(1), lit))

    if total_appels == 0:
        # ⚠️ ANTI-VACUITÉ : « aucun appel trouvé » et « tout est propre » auraient la même
        # sortie sinon — le mode d'échec de tous les instruments de ce dépôt.
        print("aucun appel à `Libelle.De` trouvé — le motif ne voit pas l'arbre, "
              "son résultat ne vaut rien.")
        return 2

    suspects = sum(len(v) for v in par_fichier.values())
    print(f"{total_appels} appel(s) à `Libelle.De` · {suspects} repli(s) à CLASSER "
          f"dans {len(par_fichier)} fichier(s)\n")
    for f, v in sorted(par_fichier.items(), key=lambda x: -len(x[1])):
        print(f"  {len(v):>3}  {f}")
        for domaine, lit in sorted(set(v))[:6]:
            print(f"        [{domaine}] «{lit}»")
        if len(set(v)) > 6:
            print(f"        … et {len(set(v)) - 6} autre(s)")
    print("\n⚠️ À CLASSER, pas à traduire en bloc : le texte d'interface se traduit, le "
          "vocabulaire de FICTION (archétypes, types de bâtiment) se ratifie.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
