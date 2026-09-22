#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie `21-en-16-cles-flux.md` : l'ensemble de clés == la liste « Nouvelles au-delà des 26 envoyées : 16 » de
`bundle-reel-construction-2026-09-23.md` (`mafia-builder-city-clean`, `26c605c5`) ; chaque fr (’ ramenée à ') == le `litteral` de la même
clé dans `sites-libelle-flux-83b4f291.json` au même commit (non servie) ; slug == clé (`Libelle.Slug` recopié) ; aucune apostrophe
droite dans le fr ; en ≠ fr ; capitales gardées ; « » en fr ⇒ “ ” en en ; aucune clé déjà servie au back ni déjà dans `20-…`.
Contrôles : positif (`distribution.titre.c_est_livre` a le littéral « C'est livré ») ; négatif (une clé des 26 n'est pas dans la liste)."""
import json, os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__)); DOC = os.path.join(ICI, '21-en-16-cles-flux.md')
SRC, REV = '/home/erutheone/project/mafia-builder-city-clean', '26c605c5'
BACK, BREV = '/home/erutheone/project/mafia-back-suite', 'd6a747b0'
sh = lambda d, *a: subprocess.run(['git', '-C', d, *a], capture_output=True, text=True).stdout

def slug(s):                                            # `Libelle.Slug` (Libelle.cs:100-111)
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')

source = sh(SRC, 'show', f'{REV}:Tools/juge-donnees/i18n/bundle-reel-construction-2026-09-23.md')
sec = source[source.index('**Nouvelles au-delà des 26 envoyées : 16**'):]
sec = sec[:sec.index('\n\n') if '\n\n' in sec else len(sec)]
attendu = re.findall(r'^- `([a-z0-9_.]+)`', sec, re.M)
flux = {e['cle']: e for v in json.loads(sh(SRC, 'show', f'{REV}:Tools/juge-donnees/i18n/sites-libelle-flux-83b4f291.json')).values() for e in v}
st = sh(BACK, 'show', f'{BREV}:services/game-back/src/i18n/string_table.ts')
def cles(nom): d = st.index(nom); return set(re.findall(r"^\s*'([a-z0-9_.]+)':", st[d:st.index('\n};', d)], re.M))
servies = cles('export const EN_MESSAGES') | cles('export const FR_MESSAGES')
vingt = set(re.findall(r'^\| `([a-z0-9_.]+)`', open(os.path.join(ICI, '20-en-26-cles.md'), encoding='utf-8').read(), re.M))

doc = open(DOC, encoding='utf-8').read(); mien = {}
for l in doc[doc.index('## Les 16 clés'):doc.index('## Notes')].split('\n'):
    if l.startswith('| `'):
        c = [x.strip() for x in l.strip().strip('|').split('|')]; mien[c[0].strip('`')] = (c[1], c[2])

defauts = []
assert len(attendu) == 16 and len(set(attendu)) == 16, f'source : {len(attendu)} clés lues, 16 attendues'
assert flux['distribution.titre.c_est_livre']['litteral'] == "C'est livré", 'contrôle positif'
assert 'appro.titre.la_commande_est_arrivee' not in attendu and len(vingt) == 26, 'contrôle négatif / lecture de 20-…'
if set(mien) != set(attendu): defauts.append(f'ensembles : en trop {set(mien) - set(attendu)} ; manquantes {set(attendu) - set(mien)}')
for k, (fr, en) in mien.items():
    lit = fr.replace('’', "'"); e = flux.get(k)
    if e is None: defauts.append(f'{k} : absente du json de flux')
    elif e['litteral'] != lit: defauts.append(f'{k} : fr {lit!r} ≠ littéral {e["litteral"]!r}')
    elif e['servie']: defauts.append(f'{k} : le json la dit servie')
    if k.split('.', 2)[2] != slug(lit): defauts.append(f'{k} : slug du fr = {slug(lit)}')
    if "'" in fr: defauts.append(f'{k} : apostrophe droite dans le fr')
    if fr == en: defauts.append(f'{k} : en == fr')
    if fr.isupper() != en.isupper(): defauts.append(f'{k} : capitales non gardées')
    if ('«' in fr) != ('“' in en) or '«' in en or '"' in en: defauts.append(f'{k} : guillemets')
    if k in servies: defauts.append(f'{k} : déjà servie à {BREV}')
    if k in vingt: defauts.append(f'{k} : déjà dans 20-…')
print(f'source {REV} : {len(attendu)} clés ; json de flux : {len(flux)} clés ; table {len(mien)} ; back {BREV}')
for x in defauts: print('  ⛔', x)
print(f'{len(defauts)} défaut(s)'); sys.exit(1 if defauts else 0)
