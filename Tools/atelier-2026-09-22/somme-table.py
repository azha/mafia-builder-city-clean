#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""La SOMME d'une table de mots (37, 40, 43, 44, 46… : colonnes mot · cadres · classe · clé · fr · en · note), pour que l'en-tête porte
« somme = total » (commande f2 du 23/09, après la réconciliation de la 44) : lignes, mots, compléments, lignes par classe, clés DISTINCTES à
valeur (ce que le back servira), continuations sans valeur (et la preuve que leur clé est portée par une ligne à valeur), doublons de clé à valeur.
Une ligne « servie » sans fr RENVOIE à la valeur servie (ce n'est pas une continuation). Une ligne COMPOSÉE « a + b [+ …] » est une
COMPOSITION affichée, pas une continuation (signal du back sur la 50, 23/09) : le client assemble les parties, le back ne sert pas le composé ;
son fr (s'il y en a un) montre l'assemblage et n'est la valeur d'aucune partie ; chaque PARTIE doit avoir sa valeur sur une ligne simple
de la table OU être servie (FR_MESSAGES du back, lu par son nom à `git show HEAD` de ~/project/mafia-back-suite ; « x.* » = une clé servie x.…).
Exit 1 si une continuation n'a pas de ligne à valeur, si une partie de composition n'a de valeur nulle part, ou si une clé a deux valeurs.
Usage : python3 Tools/atelier-2026-09-22/somme-table.py <table.tsv> [...]"""
import collections, os, re, subprocess, sys
_st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'],
                     capture_output=True, text=True, check=True).stdout
_d = _st.index('export const FR_MESSAGES')
SERVIES = set(re.findall(r"^\s*'([^'\s]+)':", _st[_d:_st.index('\n};', _d)], re.M))
servie = lambda k: (any(x.startswith(k[:-1]) for x in SERVIES) if k.endswith('*') else k in SERVIES)
rc = 0
ATTENDUES = ['mot', 'cadres', 'classe', 'clé', 'fr', 'en', 'note']   # le format des tables de mots (37, 40, 43, 44, 46-48…)
for f in sys.argv[1:]:
    toutes = [l.rstrip('\n').split('\t') for l in open(f, encoding='utf-8')]
    tete = toutes[0] if toutes else []
    # ⛔ REFUSER une table dont on ne reconnaît pas les colonnes, au lieu de mal compter (signalé par le back sur l'addendum de la 45 :
    #    « statut » au lieu de « classe » — les « clés à deux valeurs » étaient un artefact de l'outil)
    if tete[:len(ATTENDUES)] != ATTENDUES:
        manquantes = [c for c in ATTENDUES if c not in tete]
        print(f'⛔ {f} : colonnes non reconnues {tete} — attendues {ATTENDUES}' + (f' ; manquantes : {manquantes}' if manquantes else ' (ordre différent)'))
        rc = 1; continue
    L = toutes[1:]
    comp = [c for c in L if c[0].startswith('(')]
    par = collections.Counter(c[2] for c in L)
    compose = lambda c: '+' in c[3]
    compos = [c for c in L if c[2] != 'note' and c[3] and compose(c)]                  # compositions affichées (à valeur ou non)
    avec = [c for c in L if c[2] != 'note' and c[3] and c[4] and not compose(c)]       # lignes simples à valeur : ce que le back servira
    sans = [c for c in L if c[2] not in ('note', 'servie') and c[3] and not c[4] and not compose(c)]   # continuations
    vals = collections.defaultdict(set)
    for c in avec: vals[c[3]].add(c[4])
    orphelines = {c[3] for c in sans} - set(vals)
    parties = {k.strip() for c in compos for k in c[3].split('+')}
    parties_servies = {k for k in parties - set(vals) if servie(k)}
    parties_orphelines = sorted(parties - set(vals) - parties_servies)
    doubles = {k: v for k, v in vals.items() if len(v) > 1}
    print(f'{f} : {len(L)} lignes = {len(L) - len(comp)} mots + {len(comp)} compléments · par classe {dict(par)} · '
          f'clés distinctes à valeur {len(vals)} · continuations sans valeur {len(sans)} (clés {len({c[3] for c in sans})})'
          f' · compositions {len(compos)} (à valeur affichée {sum(1 for c in compos if c[4])} ; parties {len(parties)}, dont servies par le back hors table {len(parties_servies)})'
          + (f' · ⛔ continuations orphelines {sorted(orphelines)}' if orphelines else '')
          + (f' · ⛔ parties de composition sans valeur {parties_orphelines}' if parties_orphelines else '')
          + (f' · ⛔ clés à deux valeurs {doubles}' if doubles else ''))
    rc |= bool(orphelines or parties_orphelines or doubles)
sys.exit(rc)
