#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contrôles du fichier `10-mots-revue-etats-v4-3.md` — ensembles de clés et placeholders, lus dans les SOURCES figées.

1. §1 : l'ensemble des clés `revue.*` du 10 == celui de la table « À SERVIR » de CLIENT-2 à `d745a577` ; chaque fr du 10 == le fr
   de CLIENT-2 à l'octet ; l'espace initiale de `revue.bloc.routines_signees` présente en fr ET en en.
2. §2 : l'ensemble des clés `core_loops.flag_discipline.*` du 10 == celui du registre FR de `string_table.ts` à `4841d7ad` ; le fr
   servi du 10 == la valeur du back ; placeholders égaux entre fr servi, fr proposé et en proposé.
Contrôle positif : une clé retirée de l'ensemble doit faire échouer la comparaison.
Usage : python3 Tools/atelier-2026-09-22/verifier-10-mots.py
"""
import os, re, subprocess, sys

ICI = os.path.dirname(os.path.abspath(__file__))
DOC = os.path.join(ICI, '10-mots-revue-etats-v4-3.md')
CLIENT2, SHA_C2, FICHIER_C2 = '/home/erutheone/project/mafia-unity-F', 'd745a577', 'Tools/juge-donnees/revue-du-jour/i18n-2026-09-23.md'
BACK, SHA_BK, TABLE_BK = '/home/erutheone/project/mafia-clean-city', '4841d7ad', 'services/game-back/src/i18n/string_table.ts'
PREFIXE = 'core_loops.flag_discipline.'

def show(depot, sha, chemin):
    r = subprocess.run(['git', '-C', depot, 'show', f'{sha}:{chemin}'], capture_output=True, text=True)
    if r.returncode: sys.exit(f'FAUTE : {depot} {sha}:{chemin} illisible')
    return r.stdout

def cellules(l): return [c.strip() for c in l.strip().strip('|').split('|')]
def sans_code(c): return c[1:-1] if c.startswith('`') and c.endswith('`') else c
def ph(s): return sorted(re.findall(r'\{(\w+)\}', s))

doc = open(DOC, encoding='utf-8').read()
s1 = doc[doc.index('## 1.'):doc.index('## 2.')]; s2 = doc[doc.index('## 2.'):doc.index('## 3.')]
defauts = []

# §1 — revue.*
mien = {}
for l in s1.split('\n'):
    if l.startswith('| `revue.'):
        c = cellules(l); mien[c[0].strip('`')] = (sans_code(c[1]), sans_code(c[2]))
c2 = show(CLIENT2, SHA_C2, FICHIER_C2)
serv = c2[c2.index('## À SERVIR'):c2.index('## À RETIRER')]
leur = {}
for l in serv.split('\n'):
    if l.startswith('| `revue.'):
        c = cellules(l); leur[c[0].strip('`')] = c[1]
leur['revue.bloc.routines_signees'] = ' ' + leur['revue.bloc.routines_signees']   # l'espace initiale est dite en note (`:681`)
if set(mien) != set(leur): defauts.append(f'§1 ensembles différents : en trop {set(mien) - set(leur)}, manquantes {set(leur) - set(mien)}')
for k, fr in leur.items():
    if k in mien and mien[k][0] != fr: defauts.append(f'§1 fr différent pour {k} : {mien[k][0]!r} ≠ {fr!r}')
for k in mien:
    if k == 'revue.bloc.routines_signees':
        if not (mien[k][0].startswith(' ') and mien[k][1].startswith(' ')): defauts.append('§1 routines_signees : espace initiale perdue')
    if ph(mien[k][0]) != ph(mien[k][1]): defauts.append(f'§1 placeholders fr/en différents pour {k}')
print(f'§1 : {len(mien)} clé(s) dans le 10, {len(leur)} chez CLIENT-2 ({SHA_C2})')

# §2 — core_loops.flag_discipline.*
bk = show(BACK, SHA_BK, TABLE_BK)
fr_bk = {}
for m in re.finditer(r"'(" + re.escape(PREFIXE) + r"[\w.]+)':\s*\n?\s*'((?:[^'\\]|\\.)*)'", bk):
    fr_bk.setdefault(m.group(1), m.group(2))                                   # 1re occurrence = registre FR
mien2 = {}
for l in s2.split('\n'):
    if l.startswith('| `…'):
        c = cellules(l); k = PREFIXE + c[0].strip('`').lstrip('…').lstrip('.')
        fr_prop = c[1] if c[2] == '*(inchangé)*' else c[2].strip('*')
        mien2[k] = (c[1], fr_prop, c[3])
if set(mien2) != set(fr_bk): defauts.append(f'§2 ensembles différents : en trop {set(mien2) - set(fr_bk)}, manquantes {set(fr_bk) - set(mien2)}')
for k, (servi, prop, en) in mien2.items():
    if k in fr_bk and servi != fr_bk[k]: defauts.append(f'§2 fr servi ≠ back pour {k} : {servi!r} ≠ {fr_bk[k]!r}')
    if not (ph(servi) == ph(prop) == ph(en)): defauts.append(f'§2 placeholders différents pour {k} : {ph(servi)} / {ph(prop)} / {ph(en)}')
print(f'§2 : {len(mien2)} clé(s) dans le 10, {len(fr_bk)} dans le registre FR du back ({SHA_BK})')

# contrôle positif : retirer une clé doit être vu
temoin = dict(mien2); temoin.pop(next(iter(temoin)))
assert set(temoin) != set(fr_bk), 'contrôle positif cassé : une clé retirée passe inaperçue'
print('contrôle positif : une clé retirée est vue ✓')

for d in defauts: print('  ⛔', d)
print(f'{len(defauts)} défaut(s)')
sys.exit(1 if defauts else 0)
