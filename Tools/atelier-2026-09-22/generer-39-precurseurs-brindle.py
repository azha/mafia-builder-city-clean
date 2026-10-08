#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""39 — les 3 précurseurs du Brindle au catalogue `building.precursor.*` (commande f2 du 23/09, D12 : un mot par précurseur).
Mesure du back (f2) : l'enum `precursor_type` porte `pyralin`, `thalmite`, `garnet_salt` (`0017_operational_chain.sql:15`) ; le catalogue ne sert
que les 3 précurseurs des autres substances (Racine verdoyante · Résine de lull · Lys de verre) — les 3 du Brindle n'ont aucune clé.
Les mots viennent du canon : `gdd/04a_operational_systems.md` §« Brindle precursors » et le glossaire `gdd/15_glossary.md` :
- « Pyralin », « Thalmite » : noms propres de fiction, « Never lowercase » → fr == en (déclaré) ;
- « Garnet salt » (« Garnet » capitalisé, « salt » minuscule) → en tel quel ; fr « Sel de grenat » : PROPOSÉ, sur le précédent du catalogue qui
  traduit la part commune et garde la part inventée (Glass lily → Lys de verre, Lull resin → Résine de lull, Verdant root → Racine verdoyante).
Contrôles : les 3 clés = l'enum ; aucune n'est encore servie ; D10 ; casse du glossaire (jamais en minuscule) ; en == fr seulement pour les noms propres.
Sortie : `39-precurseurs-brindle-2026-09-23.tsv`. Usage : python3 Tools/atelier-2026-09-22/generer-39-precurseurs-brindle.py"""
import os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__)); BACK = os.path.expanduser('~/project/mafia-back-suite')
L = [  # (valeur d'enum, fr, en, statut, source)
 ('pyralin', 'Pyralin', 'Pyralin', 'canon (nom propre, fr == en)', 'gdd/04a §Brindle precursors ; glossaire « Pyralin » : « Never lowercase »'),
 ('thalmite', 'Thalmite', 'Thalmite', 'canon (nom propre, fr == en)', 'gdd/04a ; glossaire « Thalmite » : « Never lowercase »'),
 ('garnet_salt', 'Sel de grenat', 'Garnet salt', 'en : canon · fr : PROPOSÉ',
  'glossaire « Garnet salt » (« Garnet » capitalisé) ; fr sur le précédent du catalogue (Lys de verre, Résine de lull, Racine verdoyante)'),
]
enum = re.search(r'"precursor_type"\s+AS ENUM \(([^)]*)\)', subprocess.run(['git', '-C', BACK, 'show',
       'HEAD:services/game-back/src/db/migrations/0017_operational_chain.sql'], capture_output=True, text=True).stdout).group(1)
enum = re.findall(r"'([a-z_]+)'", enum)
st = subprocess.run(['git', '-C', BACK, 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'], capture_output=True, text=True).stdout
servies = set(re.findall(r"^\s*'(building\.precursor\.[a-z_]+)':", st, re.M))
d, out = [], ['\t'.join(['clé', 'fr', 'en', 'statut', 'source'])]
if sorted(v for v, *_ in L) != sorted(enum): d.append(f'enum {enum} ≠ table')
for v, fr, en, statut, src in L:
    cle = f'building.precursor.{v}'
    if cle in servies: d.append(f'{cle} : déjà servie')
    if "'" in fr + en: d.append(f'{cle} : apostrophe droite')
    if fr == en and 'nom propre' not in statut: d.append(f'{cle} : fr == en non déclaré')
    if fr[0].islower() or en[0].islower(): d.append(f'{cle} : minuscule (le glossaire l’interdit)')
    out.append('\t'.join([cle, fr, en, statut, src]))
open(os.path.join(ICI, '39-precurseurs-brindle-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(f'{len(L)} clés · enum {enum} · catalogue servi avant : {sorted(servies)}'); [print('  ⛔', x) for x in d]
print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)
