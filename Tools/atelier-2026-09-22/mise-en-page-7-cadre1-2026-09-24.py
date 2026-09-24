#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""⑦ cadre 1 — mise en page seulement (les mots de la table 55 ne changent pas) : depuis l'alignement sur la 55 (`d870715`), la réplique
« Lt. Quist écoute autre chose que vos ordres » passe sur 2 lignes (« Il écoute… » tenait sur une) et pousse la rangée des 4 repères sous le
dock (rendu du 24/09, 14:51). Ce cadre SEUL est marqué, en MISE EN PAGE seulement — l'échelle typographique de la série est gardée
(la question reste à 12 px, sur 2 lignes ; réserve de f2 sur une 1re version à 11 px) : la question perd 4 px de marge haute et 1 px de
rembourrage en haut et en bas (`.q2l`), les gestes serrent leurs espacements (`.serre` : gap 4 px, padding 6/8 px) — ≈ 16 px CSS repris pour
les ≈ 14,4 px de la 2ᵉ ligne ; à VÉRIFIER au re-rendu (sinon : la question revient à la 55, mesure en px à l'appui). Un bloc `<style>` est posé DANS le cadre 1 (la page n'a pas de `</head>`), préfixé par
ses classes : aucune règle des autres cadres n'est touchée. Comptes attendus (1 + 1 + 1), idempotent.
Usage : mise-en-page-7-cadre1-2026-09-24.py [--controle | --ecrire]"""
import os, re, sys
PAGE = os.path.expanduser('~/project/atelier3d-mafia/ecrans-brennar-7-lieutenant.html')
STYLE = ('<style>/* ═══ ⑦ cadre 1 serré (24/09) — MISE EN PAGE seule, corps 12 px gardé (f2) ; préfixé .q2l / .serre ═══ */'
         '.question.q2l{margin-top:6px;padding-top:4px;padding-bottom:4px}.gestes.serre{gap:4px;padding:6px 12px 8px}</style>')
F = [('<div class="question"><b class="prop">Lt. Quist', '<div class="question q2l"><b class="prop">Lt. Quist'),
     ('<div class="gestes">', '<div class="gestes serre">')]

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    s = open(PAGE, encoding='utf-8').read()
    C = [m.start() for m in re.finditer(r'<div class="cadre">', s)] + [len(s)]
    f = s[C[1]:C[2]]
    if STYLE in f: print('déjà passée'); return 0
    comptes = [f.count(a) for a, _ in F]
    if comptes != [1, 1]: print(f'⛔ comptes {comptes} ≠ [1, 1]'); return 1
    for a, b in F: f = f.replace(a, b, 1)
    f = f.replace('<div class="cadre">', '<div class="cadre">' + STYLE, 1)
    print(f'cadre 1 : 2 remplacements + 1 bloc de style' + (' écrits' if mode == '--ecrire' else ' à écrire'))
    if mode == '--ecrire':
        open(PAGE, 'w', encoding='utf-8').write(s[:C[1]] + f + s[C[2]:])
    return 0

if __name__ == '__main__':
    sys.exit(main())
