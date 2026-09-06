# -*- coding: utf-8 -*-
"""Dit si les corps réels (§DA-4) décrivent encore le back d'aujourd'hui — et lesquels sont périmés.

Pourquoi un script et non une phrase dans l'INDEX : « les corps sont à jour » est un énoncé DATÉ,
et ce dépôt a mesuré assez de proses datées devenues fausses en silence. Ici la question est
re-posée à chaque exécution, contre l'état réel de `main` du back.

Ce qu'il fait — il ne devine rien :
  1. lit le `back_main` que les corps portent eux-mêmes (provenance embarquée à la capture) ;
  2. le compare à `main` du dépôt back MAINTENANT ;
  3. si `main` a bougé, énumère les fichiers SOURCE du back changés depuis, et ne crie que si
     l'un d'eux peut changer un corps. Un `main` qui avance sur des docs ou des tests ne périme
     aucune capture — c'est la différence entre « daté » et « périmé ».

⛔ Il ne rejoue rien. Rejouer demande la pile dev, donc jamais pendant un gate E2E.

Usage : python3 verifier-fraicheur-corps.py [chemin/du/depot/back]
        exit 0 = les corps valent · exit 1 = au moins un corps est périmé
"""
import glob
import json
import os
import subprocess
import sys

BACK_DEFAUT = os.path.expanduser('~/project/mafia-clean-city')


def git(depot, *a):
    r = subprocess.run(['git', '-C', depot, *a], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else None


def shas_des_corps():
    """Le SHA que les corps déclarent. Plusieurs = les captures ne sont pas homogènes."""
    vus = {}
    for p in sorted(glob.glob('*/corps-reels/*.json')):
        j = json.load(open(p, encoding='utf8'))
        sha = j.get('provenance', {}).get('back_main') or j.get('back_main')
        vus.setdefault(sha, []).append(p)
    return vus


def main():
    depot = sys.argv[1] if len(sys.argv) > 1 else BACK_DEFAUT
    vus = shas_des_corps()
    if not vus:
        print('⛔ aucun corps trouvé — lancer depuis Tools/juge-visuel/')
        sys.exit(1)
    total = sum(len(v) for v in vus.values())
    print('corps lus : %d · SHA déclarés : %s'
          % (total, {k: len(v) for k, v in vus.items()}))
    if None in vus:
        print('⛔ %d corps sans provenance — ils ne sont opposables à rien' % len(vus[None]))
        for p in vus[None][:5]:
            print('     %s' % p)
        sys.exit(1)
    if len(vus) > 1:
        print('⛔ captures HÉTÉROGÈNES : plusieurs SHA de back dans le même jeu')
        sys.exit(1)

    sha = next(iter(vus))
    tete = git(depot, 'rev-parse', '--short', 'main')
    if tete is None:
        print('⛔ dépôt back illisible : %s' % depot)
        sys.exit(1)
    print('back déclaré par les corps : %s · main aujourd\'hui : %s' % (sha, tete))
    if git(depot, 'merge-base', '--is-ancestor', sha, 'main') is None:
        print('⛔ %s n\'est pas un ancêtre de main — les corps parlent d\'une autre histoire' % sha)
        sys.exit(1)

    distance = git(depot, 'rev-list', '--count', '%s..main' % sha) or '0'
    if distance == '0':
        print('main n\'a pas bougé — les %d corps valent tels quels ✅' % total)
        return
    changes = (git(depot, 'diff', '--name-only', '%s..main' % sha) or '').splitlines()
    src = [f for f in changes if f.startswith('services/') and not f.endswith('.spec.ts')]
    print('main a avancé de %s commits · %d fichiers changés · %d de source back'
          % (distance, len(changes), len(src)))
    if not src:
        print('aucune source back touchée (docs, tests, scripts) — les corps valent ✅')
        return
    for f in src:
        print('    source touchée : %s' % f)

    # Un fichier de source touché ne périme que les corps qui en dépendent. Le seul lien
    # opposable sans exécuter le back est le nom de route ; on le cherche dans les corps.
    perimes = []
    for f in src:
        base = os.path.basename(f).split('.')[0]          # ex. string_table -> i18n
        indice = 'i18n' if 'string_table' in f or 'i18n' in f else base
        for p in sorted(glob.glob('*/corps-reels/*.json')):
            if indice.lower() in os.path.basename(p).lower():
                perimes.append((p, f))
    if not perimes:
        print('\n⚠️ sources touchées, mais aucun corps ne porte leur nom de route.')
        print('   Non concluant : c\'est un indice de nom, pas une preuve. À rejouer au doute,')
        print('   hors gate. Sortie non nulle pour que personne ne lise ça comme un vert.')
        sys.exit(1)
    print('\n⛔ %d corps périmés (leur route dépend d\'une source changée) :' % len(perimes))
    for p, f in perimes:
        print('     %-52s  ← %s' % (p, f))
    print('\n   Rejouer CES corps seulement : python3 capturer-corps-reels.py — pile dev requise,')
    print('   donc jamais pendant un gate E2E. Les %d autres restent opposables.'
          % (total - len(perimes)))
    sys.exit(1)


if __name__ == '__main__':
    main()
