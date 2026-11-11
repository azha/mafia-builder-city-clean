#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contrôle d'arithmétique du mandat (§5) — ㉚ La chaîne vue du graphe, mode maquette.
   |clés B| + |éléments M non appariés| = nombre de lignes de la table de couverture.
   Lancer : python3 -I controle-arithmetique.py
   Les clés B sont relues du CORPS MESURÉ (mesures/graph-dim3.json), jamais recopiées du rapport."""
import json, os, sys

ICI = os.path.dirname(os.path.abspath(__file__))

# ---- B : tout chemin de clé du corps réel de GET /v1/supply-chain/graph (hors enveloppe) ----
corps = json.load(open(os.path.join(ICI, 'graph-dim3.json'), encoding='utf-8'))['payload']['data']
B = []
for conteneur, lignes in corps.items():
    B.append(conteneur)                                   # le conteneur porte le CARDINAL de la liste
    assert isinstance(lignes, list) and lignes, f'{conteneur} mesuré vide — re-dimensionner'
    for k in lignes[0]:
        B.append(f'{conteneur}[].{k}')

# ---- appariements B ↔ M (une ligne de la table ; cf. rapport.md § Table de couverture) ----
APPARIES = {
    'nodes':                          'M19 cardinal des maillons (4 dessinés)',
    'nodes[].building_id':            'M09 4 emplacements « libellé à servir » du maillon',
    'nodes[].bucket':                 'M08 pastille + M10 mot d’état du maillon',
    'nodes[].has_arrow':              'M11 « ↳ refoule vers » (3/4)',
    'nodes[].arrow_to_building_id':   'M12 3 emplacements « libellé à servir » de la cible',
    'legs':                           'M20 cardinal des liaisons (4 dessinées)',
    'legs[].origin_building_id':      'M14 4 emplacements « libellé à servir » (origine) + M15 flèche →',
    'legs[].destination_building_id': 'M16 4 emplacements « libellé à servir » (destination)',
    'legs[].debt_bucket':             'M17 mot d’état + couleur de la liaison',
    'legs[].bypassed':                'M18 « contournée » + bordure pointillée (1/4)',
}

# ---- M non appariés : aucun champ de CETTE route ne les porte ----
M_NON_APPARIES = [
    'M01 ARGENT « 24 850 € »',
    'M02 CHALEUR — jauge (3 arcs + aiguille) + « Tiède »',
    'M03 « JOUR 12 »',
    'M04 « Plein jour » (phase du jour)',
    'M05 titre « La chaîne »',
    'M06 sous-titre « Chaque maillon, sa pression ; chaque liaison, son entretien. »',
    'M07 titron « Les maillons »',
    'M13 titron « Les liaisons »',
    'M22 le libellé LISIBLE d’une référence de bâtiment (les 15 emplacements)',
    'M21 l’ordre d’affichage par gravité croissante (maillons ET liaisons)',
]

nb_B = len(B)
nb_M_non_app = len(M_NON_APPARIES)
lignes = nb_B + nb_M_non_app

print(f'|clés B|                 = {nb_B}')
for b in B:
    print(f'    {b:34s} {"↔ " + APPARIES[b] if b in APPARIES else "—  (non apparié : ● – –)"}')
print(f'|B appariés|             = {len(APPARIES)}')
print(f'|B non appariés (● – –)| = {nb_B - len(APPARIES)}')
print(f'|M non appariés|         = {nb_M_non_app}')
for m in M_NON_APPARIES:
    print(f'    {m}')
print(f'|F sans source|          = 0 (mode maquette : la colonne F n’existe pas)')
print(f'SOMME = {nb_B} + {nb_M_non_app} + 0 = {lignes}  -> doit égaler le nombre de lignes de la table')
assert set(APPARIES) <= set(B), 'un appariement cite une clé absente du corps mesuré'
sys.exit(0)
