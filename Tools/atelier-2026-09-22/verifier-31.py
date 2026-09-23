#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie `31-en-types-batiment-2026-09-23.tsv` : les 12 types du catalogue, chacun avec ses deux dérivés (`30-…` v2) ; le fr et l'en « servis »
de la table sont ceux du back HEAD ; chaque dérivé = article + le mot proposé du type, en minuscule ; un en proposé par ligne, sans trait d'union
d'identifiant ; l'état dit vrai (inchangé ⇔ en servi == en proposé). Quand le back aura servi la table, toutes les lignes seront « inchangé »."""
import os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__))
st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'],
                    capture_output=True, text=True).stdout
def reg(n):
    d = st.index(n); t = st[d:st.index('\n};', d)]
    return {m.group(1): m.group(2).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*'((?:[^'\\]|\\.)*)'", t, re.M)}
EN, FR = reg('export const EN_MESSAGES'), reg('export const FR_MESSAGES')
L = [l.split('\t') for l in open(os.path.join(ICI, '31-en-types-batiment-2026-09-23.tsv'), encoding='utf-8').read().rstrip('\n').split('\n')[1:]]
T = {c[0]: c for c in L}; d = []
types = sorted(k[len('building.type.'):] for k in FR if k.startswith('building.type.'))
if sorted(k[len('building.type.'):] for k in T if k.startswith('building.type.')) != types: d.append('les types ne sont pas ceux du catalogue')
for cle, fr, en, prop, etat, raison in L:
    if (fr, en) != (FR.get(cle, '(non servie)'), EN.get(cle, '(non servie)')): d.append(f'{cle} : fr/en servis périmés ({fr!r}/{en!r})')
    if not prop or re.search(r'\w-\w', prop): d.append(f'{cle} : en proposé vide ou à trait d’union ({prop!r})')
    if (etat == 'inchangé') != (en == prop): d.append(f'{cle} : état faux')
    if not raison: d.append(f'{cle} : sans raison')
for cle, fr, en, prop, etat, raison in L:
    m = re.search(r'`building\.type\.([a-z_]+)`', raison) if not cle.startswith('building.type.') else None
    if m:
        w = T[f'building.type.{m.group(1)}'][3]; w = w[0].lower() + w[1:]
        att = ('the ' + w) if cle.startswith('distribution.') else (('An ' if w[0] in 'aeiou' else 'A ') + w)
        if prop != att: d.append(f'{cle} : {prop!r} ≠ dérivé {att!r}')
A = [l.split('\t') for l in open(os.path.join(ICI, '31-addendum-fr-d12-2026-09-23.tsv'), encoding='utf-8').read().rstrip('\n').split('\n')[1:]]
for cle, fr, en, cle_s, fr_s, raison in A:   # addendum : le fr servi est bien celui du back, l'en ne bouge pas, plus aucun mot heurté
    if (FR.get(cle_s), EN.get(cle_s)) != (fr_s, en) and (FR.get(cle), EN.get(cle)) != (fr, en): d.append(f'addendum {cle_s} : servi périmé')
    if re.search(r'façade|planque', fr): d.append(f'addendum {cle} : mot heurté encore là')
    if "'" in fr: d.append(f'addendum {cle} : apostrophe droite')
n_der = sum(1 for c in L if not c[0].startswith('building.type.'))
if n_der != 2 * len(types): d.append(f'{n_der} dérivés pour {len(types)} types')
print(f'{len(L)} clés · {len(types)} types · {sum(c[4] == "PROPOSÉ" for c in L)} PROPOSÉ(S)'); [print('  ⛔', x) for x in d]
print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)
