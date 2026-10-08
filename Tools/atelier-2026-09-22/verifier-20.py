#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie `20-en-26-cles.md` : l'ensemble de clés == les 26 de la section « Correction : la dette n'est pas 0, elle est de 26 » de
`Tools/juge-donnees/i18n/bundle-reel-construction-2026-09-23.md` (`mafia-builder-city-clean`, `641fae6c`) ; chaque fr (’ ramenée à ')
est le littéral du contrôleur NOMMÉ par la source, au même commit (les concaténations `" + "` recollées), et son slug == la clé
(`Libelle.Slug` recopié) ; en ≠ fr ; capitales gardées ; aucune clé servie au back (EN_MESSAGES, FR_MESSAGES lus par nom) ; les trois
avocats == l'en servi de `game.legal.lawyer_tier.*`.
Contrôles : positif (le fr de `appro.titre.la_commande_est_arrivee` se retrouve) ; négatif (un fr inventé ne se retrouve pas)."""
import os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__)); DOC = os.path.join(ICI, '20-en-26-cles.md')
SRC, REV = '/home/erutheone/project/mafia-builder-city-clean', '641fae6c'
BACK, BREV = '/home/erutheone/project/mafia-back-suite', '6f6dc8f6'
sh = lambda d, *a: subprocess.run(['git', '-C', d, *a], capture_output=True, text=True).stdout

def slug(s):                                            # `Libelle.Slug` (Libelle.cs:100-111)
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')

source = sh(SRC, 'show', f'{REV}:Tools/juge-donnees/i18n/bundle-reel-construction-2026-09-23.md')
sec = source[source.index('## Correction : la dette n'):]
attendu = dict(re.findall(r'^- `([a-z0-9_.]+) \((\w+)\)`', sec, re.M))
fichiers = sh(SRC, 'ls-tree', '-r', '--name-only', REV, '--', 'Assets/Scripts').split('\n')
def code(ctrl):
    p = [f for f in fichiers if f.endswith(f'/{ctrl}.cs')]; assert len(p) == 1, (ctrl, p)
    return re.sub(r'"\s*\+\s*"', '', sh(SRC, 'show', f'{REV}:{p[0]}'))    # recolle "…" + "…" (y compris sur plusieurs lignes)
codes = {c: code(c) for c in set(attendu.values())}

st = sh(BACK, 'show', f'{BREV}:services/game-back/src/i18n/string_table.ts')
def registre(nom):
    d = st.index(nom); t = st[d:st.index('\n};', d)]
    return {m.group(1): m.group(2).replace("\\'", "'") for m in re.finditer(r"^\s*'([a-z0-9_.]+)':\s*\n?\s*'((?:[^'\\]|\\.)*)'", t, re.M)}
EN, FR = registre('export const EN_MESSAGES'), registre('export const FR_MESSAGES')

doc = open(DOC, encoding='utf-8').read(); mien = {}
for l in doc[doc.index('## Les 26 clés'):doc.index('## Notes')].split('\n'):
    if l.startswith('| `'):
        c = [x.strip() for x in l.strip().strip('|').split('|')]; mien[c[0].strip('`')] = (c[1], c[2])

defauts = []
assert len(attendu) == 26, f'source : {len(attendu)} clés lues, 26 attendues'
assert '"La commande est arrivée"' in codes['ChaineDApproScreenController'], 'contrôle positif'
assert '"La commande est partie en fumée"' not in codes['ChaineDApproScreenController'], 'contrôle négatif'
if set(mien) != set(attendu): defauts.append(f'ensembles : en trop {set(mien) - set(attendu)} ; manquantes {set(attendu) - set(mien)}')
for k, (fr, en) in mien.items():
    lit = fr.replace('’', "'")
    if k in attendu and f'"{lit}"' not in codes[attendu[k]]: defauts.append(f'{k} : fr {lit!r} absent de {attendu[k]}')
    if k.split('.', 2)[2] != slug(lit): defauts.append(f'{k} : slug du fr = {slug(lit)}')
    if "'" in fr: defauts.append(f'{k} : apostrophe droite dans le fr')
    if fr == en: defauts.append(f'{k} : en == fr')
    if fr.isupper() != en.isupper(): defauts.append(f'{k} : capitales non gardées')
    if k in EN or k in FR: defauts.append(f'{k} : déjà servie à {BREV}')
for k, t in (('loi.bloc.commis_d_office', 'public_defender'), ('loi.bloc.un_cabinet', 'boutique'), ('loi.bloc.la_filiere', 'corruption_pipeline')):
    servi = EN.get(f'game.legal.lawyer_tier.{t}')
    if k in mien and mien[k][1] != servi: defauts.append(f'{k} : en {mien[k][1]!r} ≠ lawyer_tier servi {servi!r}')
print(f'source {REV} : {len(attendu)} clés ({", ".join(sorted(set(attendu.values())))}) ; table {len(mien)} ; back {BREV}')
for x in defauts: print('  ⛔', x)
print(f'{len(defauts)} défaut(s)'); sys.exit(1 if defauts else 0)
