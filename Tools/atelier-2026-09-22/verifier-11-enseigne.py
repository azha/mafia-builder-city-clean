#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie `11-exceptions-inventaire.md` §3.11 (S03, la cible nommée) contre le client (arbre F) et le back (`mafia-back-suite`).

- les clés dérivées (§4) == `Libelle.De("exception_detail", "bloc", littéral)` (le `Slug` du client recopié), et chaque littéral est au site ;
- aucune clé du paquet n'est déjà servie (EN_MESSAGES, FR_MESSAGES du back, lus PAR NOM) ;
- chaque gabarit nommé porte `{enseigne}` une fois, en fr et en en ; jamais d'article ni de contraction juste avant (fr) ;
- ni pronom ni participe accordé au nom dans la proposition qui le suit ; les 72 enseignes de `building-signs.ts` : la longueur du tampon.
Contrôles : positifs (`au bâtiment touché` → `exceptions.bloc.au_batiment_touche`, servie ; « reste à l’arrêt » passe) ; négatifs
(« au {enseigne} » et « {enseigne} est rasé » doivent rougir).
Usage : python3 Tools/atelier-2026-09-22/verifier-11-enseigne.py"""
import os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__)); DOC = os.path.join(ICI, '11-exceptions-inventaire.md')
F, BACK, REV = '/home/erutheone/project/mafia-unity-F', '/home/erutheone/project/mafia-back-suite', '83b4f291'
sh = lambda d, *a: subprocess.run(['git', '-C', d, *a], capture_output=True, text=True).stdout

def slug(s):                                            # `Libelle.Slug` (Libelle.cs:100-111), recopié
    out = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): out += c.lower()
        elif out and out[-1] != '_': out += '_'
    return out.strip('_')

st = sh(BACK, 'show', f'{REV}:services/game-back/src/i18n/string_table.ts')
def cles(nom): d = st.index(nom); return set(re.findall(r"^\s*'([a-z0-9_.]+)':", st[d:st.index('\n};', d)], re.M))
servies = cles('export const EN_MESSAGES') | cles('export const FR_MESSAGES')
signes = sh(BACK, 'show', f'{REV}:services/game-back/src/common/building-signs.ts')
bloc = signes[signes.index('const ENSEIGNES'):signes.index('};', signes.index('const ENSEIGNES'))]
enseignes = re.findall(r"'([^']+)'", re.sub(r'^\s*\w+:', '', bloc, flags=re.M))
detail = sh(F, 'show', 'HEAD:Assets/Scripts/Operational/Exceptions/ExceptionDetailController.cs')

defauts = []
assert len(enseignes) == 72, f'lecteur : {len(enseignes)} enseignes lues, 72 attendues'
assert 'exceptions.bloc.au_batiment_touche' in servies and 'exceptions.bloc.' + slug('au bâtiment touché') == 'exceptions.bloc.au_batiment_touche', 'contrôle positif'

doc = open(DOC, encoding='utf-8').read(); sec = doc[doc.index('## 3.11 '):]
lignes = {}
for l in sec.split('\n'):
    if l.startswith('| `'):
        c = [x.strip() for x in l.strip().strip('|').split('|')]; lignes[c[0].strip('`')] = (c[1], c[2])
ARTICLE = re.compile(r"(?:\b(?:le|la|les|au|aux|du|des|de la|à la)\s+|\bl[’']\s*)\{enseigne\}", re.I)

def controle(k, fr, en):
    d = []
    if k.startswith('exception_detail.bloc.'):
        if k != 'exception_detail.bloc.' + slug(fr): d.append(f'{k} : ≠ slug du littéral ({slug(fr)})')
        if f'Lib("{fr}")' not in detail: d.append(f'{k} : littéral absent de ExceptionDetailController.cs')
    else:
        for lang, v in (('fr', fr), ('en', en)):
            if v.count('{enseigne}') != 1: d.append(f'{k} ({lang}) : {{enseigne}} × {v.count("{enseigne}")}')
        if ARTICLE.search(fr): d.append(f'{k} : article ou contraction devant {{enseigne}}')
        # l'accord : dans la proposition qui suit le nom, ni pronom repris ni participe passé (é, ée, és, ées) — ils prendraient son genre
        suite = re.split(r'[,;:—]', fr.split('{enseigne}', 1)[1])[0]
        if re.search(r'\b(lui|elle|il)\b|\b\w+é(e?s?)\b', suite): d.append(f'{k} : un mot s\'accorde avec {{enseigne}} (« {suite.strip()} »)')
    if fr == en: d.append(f'{k} : en == fr')
    if k in servies: d.append(f'{k} : déjà servie à {REV}')
    return d

assert controle('exceptions.bloc.x', 'au {enseigne}', 'at {enseigne}'), 'contrôle négatif : « au {enseigne} » doit rougir'
assert controle('exceptions.apres.x', '{enseigne} est rasé', '{enseigne} is razed'), 'contrôle négatif : « {enseigne} est rasé » doit rougir'
assert not controle('exceptions.apres.y', '{enseigne} reste à l’arrêt', '{enseigne} stays shut'), 'contrôle positif : « reste à l’arrêt » passe'
for k, (fr, en) in lignes.items(): defauts += controle(k, fr, en)
attendues = {'exceptions.bloc.chez_enseigne', 'exceptions.bloc.reparer_enseigne', 'exceptions.apres.repairing.enseigne',
             'exceptions.apres.repairing_slow.enseigne', 'exceptions.apres.deferred.enseigne',
             'exception_detail.bloc.appui_long_la_carte_se_ferme_le_batiment_lui_se_repare_avec_le_temps',
             'exception_detail.bloc.appui_long_la_carte_se_ferme'}
if set(lignes) != attendues: defauts.append(f'ensemble : en trop {set(lignes) - attendues} ; manquantes {attendues - set(lignes)}')
tampon = lignes.get('exceptions.bloc.reparer_enseigne', ('', ''))[0]
plus_long = max((tampon.replace('{enseigne}', e).upper() for e in enseignes), key=len)
print(f'{len(enseignes)} enseignes ({REV}) ; {len(lignes)} clés ; tampon le plus long : « {plus_long} » ({len(plus_long)} signes)')
for x in defauts: print('  ⛔', x)
print(f'{len(defauts)} défaut(s)'); sys.exit(1 if defauts else 0)
