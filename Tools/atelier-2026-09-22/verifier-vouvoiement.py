#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie la table « Vouvoiement » de `17-…` : les clés réécrites == les clés qui tutoient dans `FR_MESSAGES` (familles tutorial.* et
onboarding.*, back `e75cf69d`), le fr servi recopié à l'octet, le fr réécrit sans aucune marque du tutoiement, placeholders égaux.
Détecteur : pronoms (tu, te, t', toi, ton, ta, tes) + impératifs de 2ᵉ personne du singulier LISTÉS (un impératif ne se reconnaît pas
par un motif sûr ; la liste est celle mesurée le 2026-09-23, et un impératif neuf non listé passerait — limite écrite).
Contrôle positif : une phrase qui tutoie est vue ; une phrase au vous ne l'est pas."""
import os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__))
DOC = os.path.join(ICI, '17-td690-building-game-pipeline-tutorial.md')
IMPERATIFS = {'réduis', 'encaisse', 'tranche', 'laisse'}
PRONOMS = re.compile(r"(?<![\w'])(tu|te|toi|ton|ta|tes)(?![\w'])|(?<![\w])t'", re.I)
def tutoie(s):
    return bool(PRONOMS.search(s)) or any(re.search(r'(?<![\w])' + w + r'(?![\w])', s.lower()) for w in IMPERATIFS)
assert tutoie('Tranche, ou laisse.') and tutoie('ta décision') and not tutoie('Tranchez, ou laissez. votre décision'), 'contrôle positif'
src = subprocess.run(['git', '-C', '/home/erutheone/project/mafia-clean-city', 'show', 'e75cf69d:services/game-back/src/i18n/string_table.ts'],
                     capture_output=True, text=True).stdout
d = src.index('export const FR_MESSAGES'); f = src.index('\n};', d); FR = {}
for m in re.finditer(r"^  '([a-z0-9_.]+)':\s*((?:'(?:[^'\\]|\\.)*')(?:\s*\+\s*'(?:[^'\\]|\\.)*')*)", src[d:f], re.M):
    FR[m.group(1)] = ''.join(re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(2))).replace("\\'", "'")
fautifs = {k for k, v in FR.items() if k.startswith(('tutorial.', 'onboarding.')) and tutoie(v)}
doc = open(DOC, encoding='utf-8').read(); sec = doc[doc.index('\n## Vouvoiement'):]
table = {}
for l in sec.split('\n'):
    if l.startswith('| `'):
        c = [x.strip() for x in l.strip().strip('|').split('|')]; table[c[0].strip('`')] = (c[1], c[2])
defauts = []
if set(table) != fautifs: defauts.append(f'ensembles : en trop {set(table) - fautifs} ; manquantes {fautifs - set(table)}')
for k, (servi, neuf) in table.items():
    if servi != FR.get(k): defauts.append(f'{k} : fr servi {servi!r} ≠ back {FR.get(k)!r}')
    if tutoie(neuf): defauts.append(f'{k} : la réécriture tutoie encore')
    if sorted(re.findall(r'\{(\w+)', neuf)) != sorted(re.findall(r'\{(\w+)', servi)): defauts.append(f'{k} : placeholders')
print(f'{len(FR)} clés FR lues ; tutorial./onboarding. qui tutoient : {len(fautifs)} ; table : {len(table)} ; contrôle positif ✓')
for x in defauts: print('  ⛔', x)
print(f'{len(defauts)} défaut(s)'); sys.exit(1 if defauts else 0)
