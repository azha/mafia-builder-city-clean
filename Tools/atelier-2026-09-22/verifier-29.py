#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie `29-…` : chaque clé de table = la dérivation du client (② : `building.<famille>.<slug(valeur)>` ; les autres :
`Libelle.De(domaine, "bloc", fr)`) ; aucune n'est servie au back HEAD ; fr ≠ en ; ’ et jamais ' dans le fr ; la clé réutilisée de la Loi
est bien servie avec « Commis d’office » (contrôle positif du lecteur)."""
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
assert "'loi.bloc.commis_d_office': 'Commis d’office'" in st, 'contrôle positif : la clé réutilisée de la Loi'
d, t = [], {}
for l in open(os.path.join(ICI, '29-valeurs-servies-sans-mot.md'), encoding='utf-8'):
    m = re.match(r'\| `([a-z_.]+)` \| ([^|]+) \| ([^|]+) \| ([^|]+) \|', l)
    if m: t[m[1]] = (m[2].strip(), m[3].strip(), m[4])
for k, (fr, en, src) in t.items():
    dom = k.split('.')[0]
    if dom == 'building':
        val = {'failed': 'Failed'}.get(k.split('.')[-1], k.split('.')[-1])
        if k.split('.')[-1] != slug(val): d.append(f'{k} : dérivation')
    elif k != f'{dom}.bloc.{slug(fr)}': d.append(f'{k} ≠ {dom}.bloc.{slug(fr)}')
    # servie depuis (le back a repris la proposition) : conforme si le fr ET l'en servis sont exactement les nôtres
    servis = re.findall(r"^\s*'" + re.escape(k) + r"':\s*'((?:[^'\\]|\\.)*)'", st, re.M)
    if servis and sorted(x.replace("\\'", "'") for x in servis) != sorted([fr, en]): d.append(f'{k} servie avec d\'autres mots : {servis}')
    if fr == en: d.append(f'{k} : en == fr')
    if "'" in fr: d.append(f'{k} : apostrophe droite')
print(f'{len(t)} clés'); [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)
