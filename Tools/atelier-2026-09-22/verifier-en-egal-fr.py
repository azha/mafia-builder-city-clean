#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie un paquet de corrections TD-690 (« en == fr ») écrit par l'atelier contre le CLASSEMENT du back.

Le back classe chaque clé dont l'anglais égale le français (`tests/e2e/conventions/_en-egal-fr-classement.txt`, `e75cf69d`) :
`DEFAUT_FR_DANS_EN` (le bundle anglais sert du français) ou `DEFAUT_EN_DANS_FR` (le bundle français sert de l'anglais).
Un paquet de l'atelier est une table markdown `| clé | classe | fr | en |`, sous un titre qui contient un marqueur donné.

Contrôles :
  1. l'ensemble des clés du paquet == l'ensemble des clés DÉFAUT du classement pour les préfixes donnés ;
  2. la classe écrite == celle du classement ;
  3. le côté SERVI est recopié à l'octet : pour `DEFAUT_FR_DANS_EN`, la colonne fr == `FR_MESSAGES` ; pour `DEFAUT_EN_DANS_FR`,
     la colonne en == `EN_MESSAGES` (le côté proposé est l'autre colonne) ;
  4. placeholders identiques entre fr et en, et avec la valeur servie ;
  5. le côté proposé n'est PAS égal au côté servi (sinon ce n'est pas une correction).
Les registres sont lus PAR LEUR NOM (EN_MESSAGES vient d'abord dans le fichier). Contrôle positif : une clé retirée du paquet est vue.

Usage : verifier-en-egal-fr.py <paquet.md> <marqueur de titre> <préfixe> [<préfixe> …] [--ref <sha back>]
"""
import re, subprocess, sys

BACK = '/home/erutheone/project/mafia-clean-city'
CLASSEMENT = 'tests/e2e/conventions/_en-egal-fr-classement.txt'
TABLE = 'services/game-back/src/i18n/string_table.ts'

args = sys.argv[1:]
ref = 'e75cf69d'
if '--ref' in args:
    i = args.index('--ref'); ref = args[i + 1]; del args[i:i + 2]
paquet, marqueur, *prefixes = args

def show(chemin):
    r = subprocess.run(['git', '-C', BACK, 'show', f'{ref}:{chemin}'], capture_output=True, text=True)
    if r.returncode: sys.exit(f'FAUTE : {ref}:{chemin} illisible')
    return r.stdout

def registre(src, nom):
    d = src.index(f'export const {nom}'); f = src.index('\n};', d); out = {}
    for m in re.finditer(r"^  '([a-z0-9_.]+)':\s*((?:'(?:[^'\\]|\\.)*')(?:\s*\+\s*'(?:[^'\\]|\\.)*')*)", src[d:f], re.M):
        out[m.group(1)] = ''.join(re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(2))).replace("\\'", "'")
    return out

def ph(s): return sorted(re.findall(r'\{(\w+)', s))
def cel(c): c = c.strip(); return c[1:-1] if len(c) > 1 and c[0] == c[-1] == '`' else c

src = show(TABLE); FR = registre(src, 'FR_MESSAGES'); EN = registre(src, 'EN_MESSAGES')
assert src.index('export const EN_MESSAGES') < src.index('export const FR_MESSAGES'), 'ordre des registres changé'
classes = {}
for l in show(CLASSEMENT).split('\n'):
    if l.startswith('#') or '|' not in l: continue
    k, c = [x.strip() for x in l.split('|')[:2]]
    if c.startswith('DEFAUT_') and k.startswith(tuple(prefixes)): classes[k] = c

doc = open(paquet, encoding='utf-8').read()
i = doc.index(marqueur); j = doc.find('\n## ', i + 1); sec = doc[i:j if j > 0 else len(doc)]
mien = {}
for l in sec.split('\n'):
    if l.startswith('| `') and l.count('|') >= 5:
        c = [x for x in l.strip().strip('|').split('|')]
        mien[cel(c[0])] = (cel(c[1]), cel(c[2]), cel(c[3]))

defauts = []
if set(mien) != set(classes):
    defauts.append(f'ensembles : en trop {sorted(set(mien) - set(classes))} ; manquantes {sorted(set(classes) - set(mien))}')
for k, (cl, fr, en) in mien.items():
    if k not in classes: continue
    if cl != classes[k]: defauts.append(f'{k} : classe {cl} ≠ classement {classes[k]}')
    servi, prop, cote = (fr, en, FR.get(k)) if classes[k] == 'DEFAUT_FR_DANS_EN' else (en, fr, EN.get(k))
    if servi != cote: defauts.append(f'{k} : côté servi {servi!r} ≠ back {cote!r}')
    if prop == servi: defauts.append(f'{k} : la proposition égale la valeur servie')
    if not (ph(fr) == ph(en) == ph(FR.get(k, ''))): defauts.append(f'{k} : placeholders {ph(fr)} / {ph(en)} / servi {ph(FR.get(k, ""))}')
temoin = dict(mien); temoin.pop(next(iter(temoin)))
assert set(temoin) != set(classes), 'contrôle positif cassé'
print(f'paquet « {marqueur} » : {len(mien)} clé(s) ; classement ({ref}, préfixes {prefixes}) : {len(classes)} défaut(s) ; contrôle positif ✓')
for d in defauts: print('  ⛔', d)
print(f'{len(defauts)} défaut(s)')
sys.exit(1 if defauts else 0)
