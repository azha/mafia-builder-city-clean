#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie `19-en-24-cles.md` : l'ensemble de clés == (table BundleReel `d69e64d1` l.29-48, moins les clés servies par le back à `8c83da27`)
∪ (les 6 de ⑨ nommées par l'orchestrateur, présentes dans la table de CLIENT-2) ; chaque fr (apostrophe ’ ramenée à ') présent tel quel dans
le code client (cumul `14eb2454`, ou arbre F `HEAD` pour les clés de ⑨) ; en ≠ fr ; même nombre de `\\n` ; aucune clé déjà servie en fr."""
import re, subprocess, sys, os
ICI = os.path.dirname(os.path.abspath(__file__)); DOC = os.path.join(ICI, '19-en-24-cles.md')
DA, F, BACK = '/home/erutheone/project/mafia-unity-DA', '/home/erutheone/project/mafia-unity-F', '/home/erutheone/project/mafia-back-suite'
sh = lambda d, *a: subprocess.run(['git', '-C', d, *a], capture_output=True, text=True).stdout
table = sh(DA, 'show', 'd69e64d1:Tools/juge-donnees/i18n/bundle-reel-construction-2026-09-23.md').split('\n')
t18 = [re.match(r'- `([a-z0-9_.]+)`', l).group(1) for l in table[28:48] if re.match(r'- `([a-z0-9_.]+)`', l)]
src = sh(BACK, 'show', '8c83da27:services/game-back/src/i18n/string_table.ts')
d = src.index('export const FR_MESSAGES'); f = src.index('\n};', d)
servies = set(re.findall(r"^  '([a-z0-9_.]+)':", src[d:f], re.M))
dix_huit = [k for k in t18 if k not in servies]
six = ['exceptions.bloc.ouvrir_sa_main', 'exceptions.bloc.suggere_appui_long_sa_main', 'exceptions.bloc.autre_issue',
       'exceptions.bloc.autres_issues', 'exceptions.locuteur.votre_lieutenant', 'exceptions.bloc.le_comptoir_n_a_pas_repondu']
tf = open(os.path.join(F, 'Tools/juge-donnees/exceptions/i18n-2026-09-23.md'), encoding='utf-8').read()
defauts = [f'{k} absente de la table de CLIENT-2' for k in six if f'`{k}`' not in tf]
attendu = set(dix_huit) | set(six)
doc = open(DOC, encoding='utf-8').read(); mien = {}
for l in doc.split('\n'):
    if l.startswith('| `'):
        c = [x.strip() for x in l.strip().strip('|').split('|')]; mien[c[0].strip('`')] = (c[1], c[2])
if set(mien) != attendu: defauts.append(f'ensembles : en trop {set(mien) - attendu} ; manquantes {attendu - set(mien)}')
code_cumul = sh(DA, 'grep', '-h', '-F', '', '14eb2454', '--', 'Assets/Scripts')
code_f = sh(F, 'grep', '-h', '-F', '', 'HEAD', '--', 'Assets/Scripts')
assert 'phrase inventée que personne n’écrit' not in code_cumul + code_f and "Le conflit n'a pas répondu" in code_cumul, 'contrôles positif/négatif du corpus'
for k, (fr, en) in mien.items():
    lit = fr.replace('’', "'")
    if lit not in code_cumul and lit not in code_f: defauts.append(f'{k} : fr {lit!r} introuvable dans le code client')
    if fr == en: defauts.append(f'{k} : en == fr')
    if fr.count('\\n') != en.count('\\n'): defauts.append(f'{k} : sauts de ligne différents')
    if k in servies: defauts.append(f'{k} : déjà servie à 8c83da27')
print(f'18 relevées (BundleReel − servies) : {len(dix_huit)} ; 6 de ⑨ ; union attendue {len(attendu)} ; table {len(mien)}')
for x in defauts: print('  ⛔', x)
print(f'{len(defauts)} défaut(s)'); sys.exit(1 if defauts else 0)
