#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Compte les findings d'un tour de juges visuels DANS LES TABLES des rapports — jamais dans les synthèses.

Règle du gabarit (dossier-gabarit.md) : « le compte se prend dans la table, jamais dans la synthèse » —
mesuré sur cinq tours de ㊲ : deux résumés annonçaient 6 et 3 majeurs là où leurs tables en portaient 8 et 8.
Une ligne de finding = `| `<id>` | <gravité> | …` (id `F<n>`, `B<n>`, `M<n>`… — jamais `C<n>`, réservé au contrôle positif) ;
la gravité est la 2ᵉ cellule, dépouillée de ` * `. Mesuré : un motif limité à `F` rendait 9 findings pour le r5 de ① qui en portait 24.

Usage : python3 Tools/juge-visuel/compter-findings-tour.py <date>   (ex. 2026-09-06)
Sortie : une ligne par rapport `r*-<date>/rapport.md` trouvé, puis la somme. Plancher anti-vacuité : 0 rapport ⇒ exit 2.
"""
import re, sys, pathlib
date = sys.argv[1] if len(sys.argv) > 1 else '2026-09-06'
racine = pathlib.Path(__file__).resolve().parent
rapports = sorted(racine.glob(f'*/r*-{date}/rapport.md'))
if not rapports:
    print(f'⛔ aucun rapport r*-{date}/rapport.md sous {racine}', file=sys.stderr); sys.exit(2)
tot = {'BLOQUANT': 0, 'MAJEUR': 0, 'MINEUR': 0}; n_tot = 0
for f in rapports:
    rows = [l for l in f.read_text(encoding='utf-8').splitlines() if re.match(r'^\| (?:\*\*|`)?(?!C\d)[A-Za-z]{1,2}\d+(?:\*\*|`)? \|', l)]
    c = {k: 0 for k in tot}; autres = 0
    for l in rows:
        cells = [x.strip(' *`') for x in l.split('|')]
        g = cells[2] if len(cells) > 2 else ''
        hit = [k for k in c if g.startswith(k)]
        if hit: c[hit[0]] += 1
        else: autres += 1
    verdict = next((l.strip() for l in f.read_text(encoding='utf-8').splitlines() if l.startswith('## Verdict')), '?')
    n = sum(c.values())   # un finding = une ligne à id ET gravité reconnue ; les lignes à id sans gravité (annexes,
                          # inventaires) ne comptent pas, mais sont dites
    print(f'{f.parent.parent.name:18s} {f.parent.name:16s} findings={n:2d}  B={c["BLOQUANT"]} M={c["MAJEUR"]} m={c["MINEUR"]}'
          + (f'  ({autres} ligne(s) à id sans gravité, hors compte)' if autres else '') + f'   {verdict[:60]}')
    for k in tot: tot[k] += c[k]
    n_tot += n
print(f'— {len(rapports)} rapports · {n_tot} findings · B={tot["BLOQUANT"]} M={tot["MAJEUR"]} m={tot["MINEUR"]}'
      + ('' if n_tot == sum(tot.values()) else f'  ⚠️ somme des gravités {sum(tot.values())} ≠ {n_tot}'))
