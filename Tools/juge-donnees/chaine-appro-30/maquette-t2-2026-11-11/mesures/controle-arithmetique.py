#!/usr/bin/env python3
# -I conseillé.  Recompte la table de couverture DEPUIS couverture.tsv (jamais depuis la synthèse).
# Contrôle du mandat (temps 5) : |clés B| + |éléments M non appariés| = nombre de lignes.
# Mode maquette : pas de colonne F, donc pas de terme |F sans source|.
import csv
import os
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
TSV = os.path.join(ICI, 'couverture.tsv')

lignes = []
with open(TSV, encoding='utf-8') as f:
    for row in csv.reader(f, delimiter='\t'):
        if not row or row[0].startswith('#'):
            continue
        lignes.append(row)

b = [r for r in lignes if r[1] == 'B']
m = [r for r in lignes if r[1] == 'M']
autres = [r for r in lignes if r[1] not in ('B', 'M')]

# Garde de forme : la colonne B vaut ● pour une clé B, – pour un élément M non apparié (et l'inverse).
mauvais = [r[0] for r in b if r[3] != '●'] + [r[0] for r in m if r[3] != '–' or r[4] != '●']

# Contrôle POSITIF du parseur : il doit voir la numérotation 1..N sans trou.
numeros = [int(r[0]) for r in lignes]
trous = [i for i in range(1, len(lignes) + 1) if i not in numeros]

print('|cles B|                 =', len(b))
print('|M non apparies|         =', len(m))
print('somme                    =', len(b) + len(m))
print('nombre de lignes de table=', len(lignes))
print('lignes hors cote B/M     =', len(autres))
print('lignes de forme fausse   =', mauvais if mauvais else 'aucune')
print('trous de numerotation    =', trous if trous else 'aucun')
print('ASSUME (ecarts assumes ou libelles statiques) =',
      len([r for r in lignes if r[6] == 'ASSUME']))

ok = (len(b) + len(m) == len(lignes)) and not autres and not mauvais and not trous
print('CONTROLE', 'VERT' if ok else 'ROUGE')
sys.exit(0 if ok else 1)
