#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie `59-titres-cartes-pluriel-2026-09-26.tsv` (D30, f2 26/09, restreint par la mesure) : exactement les 3 fournisseurs à LISTE
exécutants (target_count = longueur de la liste d'ids, design HL v7.6 §2-bis (1), back e418ff65) ; clés servies dans les deux registres ;
ICU `{n, plural, one {…} other {…}}`, mêmes branches fr/en, ni chiffre ni `#` ; la branche `one` == la valeur servie aujourd'hui (le singulier
ratifié est gardé à l'octet) ; D10. Les 5 autres titres NE sont PAS dans la table : target_count y vaut 1 (affaire) ou 0 (4 navigations)."""
import csv, os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__)); TSV = os.path.join(ICI, '59-titres-cartes-pluriel-2026-09-26.tsv')
BACK, BREV = os.path.expanduser('~/project/mafia-clean-city'), 'e418ff65'
st = subprocess.run(['git', '-C', BACK, 'show', f'{BREV}:services/game-back/src/i18n/string_table.ts'], capture_output=True, text=True, check=True).stdout
def registre(nom):
    d = st.index(f'export const {nom}'); f = st.index('\n};', d)
    return dict(re.findall(r"^\s*'([a-zA-Z0-9_.]+)':\s*(?:\n\s*)?'((?:[^'\\]|\\.)*)'", st[d:f], re.M))
EN, FR = registre('EN_MESSAGES'), registre('FR_MESSAGES')
ATTENDU = {'decision.type.DAMAGED_BUILDING_REPAIR', 'decision.type.SEVERED_ROUTE_REBUILD', 'decision.type.MYCELIAL_STRESSED_LEG'}
ICU = re.compile(r'\{n, plural, one \{([^{}]+)\} other \{([^{}]+)\}\}')
D = []
lignes = list(csv.DictReader(open(TSV, encoding='utf-8'), delimiter='\t', quoting=csv.QUOTE_NONE))
if {l['clé'] for l in lignes} != ATTENDU or len(lignes) != 3: D.append(f'ensemble : {sorted(l["clé"] for l in lignes)}')
for l in lignes:
    k = l['clé']
    for lang, reg in (('fr', FR), ('en', EN)):
        m = ICU.fullmatch(l[lang])
        if not m: D.append(f'{k} {lang} : forme ICU'); continue
        if k not in reg: D.append(f'{k} : non servie en {lang}'); continue
        if m.group(1) != reg[k]: D.append(f'{k} {lang} : branche one {m.group(1)!r} ≠ servie {reg[k]!r}')
        if re.search(r'[0-9#]', l[lang]) or "'" in l[lang]: D.append(f'{k} {lang} : chiffre, # ou apostrophe droite')
        if m.group(1) == m.group(2): D.append(f'{k} {lang} : one == other')
    if not l['statut'].startswith('PROPOSÉ'): D.append(f'{k} : statut')
print(f'{len(lignes)} lignes ; registres EN {len(EN)} / FR {len(FR)} à {BREV}')
for x in D: print('  ⛔', x)
print(f'{len(D)} défaut(s)'); sys.exit(1 if D else 0)
