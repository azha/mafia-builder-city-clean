#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie `60-menu-plus-cles-2026-09-26.tsv` (f2 26/09 : tout mot affiché passe par une clé servie) : 5 titres `plus.groupe.*` + les
entrées `plus.entree.<idStable>` == les destinations du client (AppShell.cs DestinationsPlus à e575a536) moins `la_filiere` (au dock, D6) ;
chaque fr == le littéral du client, casse et apostrophe mises à part (mot inchangé) ; slug(fr) == fin de clé ; D10 (’), D17 ; en ≠ fr ;
aucune clé déjà servie (back main) ; les jumeaux notés servent la MÊME valeur fr et en."""
import csv, os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__)); TSV = os.path.join(ICI, '60-menu-plus-cles-2026-09-26.tsv')
g = lambda d, r: subprocess.run(['git', '-C', d, 'show', r], capture_output=True, text=True, check=True).stdout
shell = g(os.path.expanduser('~/project/mafia-unity-DA'), 'e575a536:Assets/Scripts/Shell/AppShell.cs')
dest = dict(re.findall(r'\("([a-z_]+)", "([^"]+)", \(\) => MountTenant', shell))
st = g(os.path.expanduser('~/project/mafia-clean-city'), 'main:services/game-back/src/i18n/string_table.ts')
def reg(n):
    d = st.index(f'export const {n}'); f = st.index('\n};', d)
    return {k: v.replace("\\'", "'") for k, v in re.findall(r"^\s*'([a-zA-Z0-9_.]+)':\s*(?:\n\s*)?'((?:[^'\\]|\\.)*)'", st[d:f], re.M)}
EN, FR = reg('EN_MESSAGES'), reg('FR_MESSAGES')
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
norm = lambda s: s.replace('’', "'").lower()
L = list(csv.DictReader(open(TSV, encoding='utf-8'), delimiter='\t', quoting=csv.QUOTE_NONE)); D = []
ent = {l['clé'][len('plus.entree.'):]: l for l in L if l['clé'].startswith('plus.entree.')}
grp = [l for l in L if l['clé'].startswith('plus.groupe.')]
if len(dest) != 21: D.append(f'client : {len(dest)} destinations, 21 attendues')
if set(ent) != set(dest) - {'la_filiere'}: D.append(f'entrées : en trop {set(ent) - set(dest)} ; manquantes {set(dest) - set(ent) - {"la_filiere"}}')
if len(grp) != 5 or len(L) != 25: D.append(f'{len(grp)} groupes / {len(L)} lignes')
for l in L:
    k, fr, en = l['clé'], l['fr'], l['en']
    if k.split('.')[-1] != slug(fr): D.append(f'{k} : slug(fr) = {slug(fr)}')
    if "'" in fr or "'" in en: D.append(f'{k} : apostrophe droite')
    if re.search(r'(?<! ):|(?<! )[;?!]', fr): D.append(f'{k} : D17')
    if fr == en: D.append(f'{k} : en == fr')
    if k in FR or k in EN: D.append(f'{k} : déjà servie')
    if l['statut'] != 'PROPOSÉ': D.append(f'{k} : statut')
    m = re.search(r'la clé servie ([a-z_.]+)', l['note'])
    if m and (norm(FR.get(m.group(1), '')) != norm(fr) or norm(EN.get(m.group(1), '')) != norm(en)): D.append(f'{k} : jumeau {m.group(1)} différent')
for i, l in ent.items():
    if norm(l['fr']) != norm(dest[i]): D.append(f'plus.entree.{i} : fr {l["fr"]!r} ≠ littéral {dest[i]!r}')
print(f'client {len(dest)} destinations ; table {len(L)} lignes ({len(grp)} groupes, {len(ent)} entrées) ; back main {len(FR)} clés FR')
for x in D: print('  ⛔', x)
print(f'{len(D)} défaut(s)'); sys.exit(1 if D else 0)
