#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie `28-mots-inconnus.md` : les 4 clés = `Libelle.De("commun","repli", fr)` (slug), non servies au back HEAD, fr ≠ en, et la forme
servie de référence (`horizon.bloc.etat_inconnu` « état inconnu ») relue — contrôle positif du lecteur."""
import os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__))
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
st = subprocess.run(['git', '-C', '/home/erutheone/project/mafia-back-suite', 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'], capture_output=True, text=True).stdout
assert "'horizon.bloc.etat_inconnu': 'état inconnu'" in st, 'contrôle positif'
d = []; t = {}
for l in open(os.path.join(ICI, '28-mots-inconnus.md'), encoding='utf-8'):
    m = re.match(r'\| `(commun\.[a-z_.]+)` \| ([^|]+) \| ([^|]+) \|', l)
    if m: t[m[1]] = (m[2].strip(), m[3].strip())
if len(t) != 4: d.append(f'{len(t)} clés, 4 attendues')
for k, (fr, en) in t.items():
    if k != 'commun.repli.' + slug(fr): d.append(f'{k} ≠ slug ({slug(fr)})')
    # servie depuis (le back a repris la proposition) : conforme si le fr ET l'en servis sont exactement les nôtres
    servis = re.findall(r"^\s*'" + re.escape(k) + r"':\s*'((?:[^'\\]|\\.)*)'", st, re.M)
    if servis and sorted(x.replace("\\'", "'") for x in servis) != sorted([fr, en]): d.append(f'{k} servie avec d\'autres mots : {servis}')
    if fr == en: d.append(f'{k} : en == fr')
print(f'{len(t)} clés'); [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)
