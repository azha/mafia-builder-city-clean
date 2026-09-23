#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie `30-litteraux-nommes-2026-09-23.tsv` contre la table de CLIENT-2 (`14dffe6d`) et le back HEAD : mêmes 107 sites dans le même
ordre ; clé == `<domaine>.<rôle>.` + slug(fr) (`Libelle.Slug` recopié), le domaine et le rôle de la source ; aucun `'` dans le fr ; un en
pour chaque ligne ; en ≠ fr sauf les noms propres déclarés ; une clé déjà servie l'est avec NOS mots (fr et en)."""
import os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__))
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
src = subprocess.run(['git', '-C', '/home/erutheone/project/mafia-builder-city-clean', 'show', '14dffe6d:Tools/juge-donnees/i18n-litteraux-nommes-2026-09-23.tsv'],
                     capture_output=True, text=True).stdout.rstrip('\n').split('\n')[1:]
st = subprocess.run(['git', '-C', '/home/erutheone/project/mafia-back-suite', 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'], capture_output=True, text=True).stdout
def reg(n):
    d = st.index(n); t = st[d:st.index('\n};', d)]
    return {m.group(1): m.group(2).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*'((?:[^'\\]|\\.)*)'", t, re.M)}
EN, FR = reg('export const EN_MESSAGES'), reg('export const FR_MESSAGES')
MEMES = {'Tarcum', 'Saltline', 'Port', 'Avenue'}    # noms propres des familles rivales, et deux mots identiques dans les deux langues
mien = open(os.path.join(ICI, '30-litteraux-nommes-2026-09-23.tsv'), encoding='utf-8').read().rstrip('\n').split('\n')[1:]
d = []
if [l.split('\t')[0] for l in mien] != [l.split('\t')[0] for l in src]: d.append('les sites ne sont pas ceux de la source, dans son ordre')
for a, b in zip(src, mien):
    sa, sb = a.split('\t'), b.split('\t'); cle, fr, en = sb[3], sb[4], sb[5]
    dom = '.'.join((sa[3] if '<' not in sa[3] else 'famille.regle.x').split('.')[:2])
    if cle != f'{dom}.{slug(fr)}': d.append(f'{sb[0]} : clé {cle} ≠ {dom}.{slug(fr)}')
    if "'" in fr: d.append(f'{cle} : apostrophe droite')
    if not en: d.append(f'{cle} : en vide')
    if fr == en and fr not in MEMES: d.append(f'{cle} : en == fr')
    if cle in FR and (FR[cle], EN.get(cle)) != (fr, en): d.append(f'{cle} servie : fr {FR[cle]!r} / en {EN.get(cle)!r} ≠ {fr!r} / {en!r}')
print(f'{len(mien)} sites · {len({l.split(chr(9))[3] for l in mien})} clés'); [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)
