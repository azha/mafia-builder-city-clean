#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie `30-litteraux-nommes-2026-09-23.tsv` contre la table de CLIENT-2 (`14dffe6d`) et le back HEAD : mêmes 107 sites dans le même
ordre ; clé == `<domaine>.<rôle>.` + slug(fr) (`Libelle.Slug` recopié), le domaine et le rôle de la source ; aucun `'` dans le fr ; un en
pour chaque ligne ; en ≠ fr sauf les noms propres déclarés ; une clé déjà servie l'est avec NOS mots (fr et en).
v1 : témoin de structure seulement — la v2 est servie (back `58d2eaaa`), la comparaison au servi ne vaut plus que pour elle.
v2 (défaut) : `30-litteraux-nommes-v2-2026-09-23.tsv` — les lignes « D12 AJOUT » s'ajoutent aux sites de la source (leur ordre est gardé),
le domaine `commissariat.bloc` devient `police.bloc` (validé par f2 le 23/09), et aucun mot genré retiré par D13 ne revient.
Usage : verifier-30.py [v1|v2]"""
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
V = (sys.argv[1] if len(sys.argv) > 1 else 'v2')
_31 = os.path.join(ICI, '31-en-types-batiment-2026-09-23.tsv')   # 31 (23/09) : l'en du joueur pour les types ; ses dérivés sont des clés de 30
EN31 = {c[0]: c[3] for c in (l.split('\t') for l in open(_31, encoding='utf-8').read().split('\n')[1:] if l)} if os.path.exists(_31) else {}
mien = open(os.path.join(ICI, '30-litteraux-nommes-2026-09-23.tsv' if V == 'v1' else '30-litteraux-nommes-v2-2026-09-23.tsv'),
            encoding='utf-8').read().rstrip('\n').split('\n')[1:]
DOMAINE = {} if V == 'v1' else {'commissariat.bloc': 'police.bloc'}
GENRES = set() if V == 'v1' else {'Récent', 'Acclimaté', 'Aguerri', 'Ancien', 'Enraciné', 'nouveau venu', 'INACTIF', 'ABSENT', 'COMPROMIS',
                                    'arrivé', 'prêt', 'trois ponts', 'Une société-écran', 'la planque-coffre'}
ajouts = [b for b in mien if b.split('\t')[8:9] and b.split('\t')[8].startswith('D12 AJOUT')]
base = [b for b in mien if b not in ajouts]
d = []
if [l.split('\t')[0] for l in base] != [l.split('\t')[0] for l in src]: d.append('les sites ne sont pas ceux de la source, dans son ordre')
for b in ajouts:
    sb = b.split('\t'); cle, fr, en = sb[3], sb[4], sb[5]
    if cle != '.'.join(cle.split('.')[:2]) + '.' + slug(fr): d.append(f'ajout {cle} : clé ≠ slug(fr)')
    if "'" in fr or not en or fr == en: d.append(f'ajout {cle} : fr/en')
    if cle in FR and (FR[cle], EN.get(cle)) != (fr, en): d.append(f'ajout {cle} servie avec d’autres mots')
for a, b in zip(src, base):
    sa, sb = a.split('\t'), b.split('\t'); cle, fr, en = sb[3], sb[4], sb[5]
    dom = '.'.join((sa[3] if '<' not in sa[3] else 'famille.regle.x').split('.')[:2]); dom = DOMAINE.get(dom, dom)
    if fr in GENRES: d.append(f'{cle} : « {fr} » retiré par D12-D15')
    if cle != f'{dom}.{slug(fr)}': d.append(f'{sb[0]} : clé {cle} ≠ {dom}.{slug(fr)}')
    if "'" in fr: d.append(f'{cle} : apostrophe droite')
    if not en: d.append(f'{cle} : en vide')
    if fr == en and fr not in MEMES: d.append(f'{cle} : en == fr')
    if V == 'v2' and cle in FR and (FR[cle], EN.get(cle)) not in ((fr, en), (fr, EN31.get(cle))):   # l'en proposé par 31 est aussi le nôtre
        d.append(f'{cle} servie : fr {FR[cle]!r} / en {EN.get(cle)!r} ≠ {fr!r} / {en!r}')
print(f'{V} : {len(mien)} sites ({len(ajouts)} ajoutés) · {len({l.split(chr(9))[3] for l in mien})} clés'); [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)
