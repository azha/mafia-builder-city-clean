#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""La SOMME d'une table de mots (37, 40, 43, 44, 46… : colonnes mot · cadres · classe · clé · fr · en · note), pour que l'en-tête porte
« somme = total » (commande f2 du 23/09, après la réconciliation de la 44) : lignes, mots, compléments, lignes par classe, clés DISTINCTES à
valeur (ce que le back servira), continuations sans valeur (et la preuve que leur clé est portée par une ligne à valeur), doublons de clé à valeur.
Une ligne « servie » sans fr RENVOIE à la valeur servie (ce n'est pas une continuation) ; une ligne composée « a + b » affiche un
assemblage : ses clés comptent comme distinctes, sa valeur n'est pas celle de chaque partie. Exit 1 si une continuation n'a pas de ligne à valeur, ou si une clé a deux valeurs.
Usage : python3 Tools/atelier-2026-09-22/somme-table.py <table.tsv> [...]"""
import collections, sys
rc = 0
for f in sys.argv[1:]:
    L = [l.rstrip('\n').split('\t') for l in open(f, encoding='utf-8')][1:]
    comp = [c for c in L if c[0].startswith('(')]
    par = collections.Counter(c[2] for c in L)
    avec = [c for c in L if c[2] != 'note' and c[3] and c[4]]
    sans = [c for c in L if c[2] not in ('note', 'servie') and c[3] and not c[4]]
    vals = collections.defaultdict(set)
    for c in avec:
        ks = [x.strip() for x in c[3].split('+')]
        for k in ks: vals[k].add(c[4] if len(ks) == 1 else None)
    vals = {k: {x for x in v if x is not None} or {'(assemblage)'} for k, v in vals.items()}
    orphelines = {c[3] for c in sans} - set(vals) - {c[3] for c in avec}
    doubles = {k: v for k, v in vals.items() if len(v) > 1}
    print(f'{f} : {len(L)} lignes = {len(L) - len(comp)} mots + {len(comp)} compléments · par classe {dict(par)} · '
          f'clés distinctes à valeur {len(vals)} · continuations sans valeur {len(sans)} (clés {len({c[3] for c in sans})})'
          + (f' · ⛔ continuations orphelines {sorted(orphelines)}' if orphelines else '') + (f' · ⛔ clés à deux valeurs {doubles}' if doubles else ''))
    rc |= bool(orphelines or doubles)
sys.exit(rc)
