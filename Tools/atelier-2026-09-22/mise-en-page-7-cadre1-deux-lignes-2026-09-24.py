#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""⑦ cadre 1 — le cadre tient DEUX lignes de réplique par construction (voie (b), f2 du 24/09 après le rendu de 15:02) : la réplique porte un
NOM SERVI de longueur variable, une phrase courte ne règle rien (et « Il écoute… » présumait le genre, D13).
Mesure du rendu `d7eba9dd` (×3,6) : haut des repères 1775, bord du cadre 1797, repère haut de 44 px → coupé de 22 px ; marge des cadres 0, 2, 3
(bas du geste → bord) = 16, 8, 16 px → il faut le bas des repères ≤ 1781, soit ≈ 38 px de rendu (≈ 10,6 px CSS) à reprendre.
L'étiquette « ce qui est écouté à la place : » RESTE : c'est une clé de la 55 (`famille.ecran.ce_qui_est_ecoute_a_la_place`, DEMANDÉE par le
client), et aucun autre cadre ne porte le geste « Brouiller » — la condition de retrait posée par f2 n'est pas remplie.
MISE EN PAGE seule, échelle typographique de la série gardée (question 12 px, gestes 9 px, étiquette 7,4 px, repères 7 px) :
  - les 3 gestes de ce cadre : rembourrage vertical 7 → 5 px (3 × 4 = 12 px CSS) ;
  - les repères : rembourrage vertical 2 → 1 px (le repère passe de ≈ 44 à ≈ 37 px de rendu).
  Attendu : repères ≈ 43 px plus haut, bas ≈ 1769, marge ≈ 28 px ≥ 16 — à VÉRIFIER au rendu (`mesurer-7-cadre1-2026-09-24.py`).
Les règles sont posées dans le bloc `<style>` du cadre 1 (outil `mise-en-page-7-cadre1-2026-09-24.py`), préfixées `.gestes.serre` : aucun autre
cadre n'est touché. Compte attendu 1, idempotent.
Usage : mise-en-page-7-cadre1-deux-lignes-2026-09-24.py [--controle | --ecrire]"""
import os, re, sys
PAGE = os.path.expanduser('~/project/atelier3d-mafia/ecrans-brennar-7-lieutenant.html')
AVANT = '.gestes.serre{gap:4px;padding:6px 12px 8px}</style>'
APRES = ('.gestes.serre{gap:4px;padding:6px 12px 8px}'
         '.gestes.serre .g{padding-top:5px;padding-bottom:5px}.gestes.serre .reperes span{padding-top:1px;padding-bottom:1px}</style>')

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    s = open(PAGE, encoding='utf-8').read()
    C = [m.start() for m in re.finditer(r'<div class="cadre">', s)] + [len(s)]
    if len(C) - 1 != 4: print(f'⛔ {len(C) - 1} cadres ≠ 4'); return 1
    f = s[C[1]:C[2]]
    if APRES in f: print('déjà passée'); return 0
    autres = sum(s[C[i]:C[i + 1]].count('gestes serre') for i in (0, 2, 3))
    if f.count(AVANT) != 1 or autres: print(f'⛔ comptes : cadre 1 {f.count(AVANT)} ≠ 1, autres cadres {autres} ≠ 0'); return 1
    f = f.replace(AVANT, APRES, 1)
    print('cadre 1 : 1 remplacement (2 règles)' + (' écrit' if mode == '--ecrire' else ' à écrire'))
    if mode == '--ecrire':
        open(PAGE, 'w', encoding='utf-8').write(s[:C[1]] + f + s[C[2]:])
        assert APRES in open(PAGE, encoding='utf-8').read(), 'non écrit'
    return 0

if __name__ == '__main__':
    sys.exit(main())
