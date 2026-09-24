#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Le tour de rendu d'après le gate du 24/09 (f2) — UNE commande, au signal, jamais avant (ni pendant un gate) :
  - ⑦ : les 4 cadres de `ecrans-brennar-7-lieutenant.html` après l'alignement sur la table 55 (atelier `d870715`) — MAQUETTE À RATIFIER,
    à leur place : `famille/maquette-7-2026-09-23/cadre-<n>-1080x2102.png` ;
  - ㉜ : les cadres 73-78 de la série 6 après l'alignement sur les tables 44 et 56 v1.1 (atelier `0564998`) — MAQUETTE À RATIFIER dans
    `ecran_delegation/maquette-2026-09-24/cadre-<n>-1080x2102.png`, et les 2 références du dossier re-rendues (73 nominal, 78 « réserve »).
Même chaîne (`rendre-tel.py`, ×3,6, DejaVu) ; même garde : machine libre (0 mcc-e2e, porte Unity LIBRE) ou rien. Imprime « FIN DU NAVIGATEUR ».
  - ② : le cadre NEUF « honorer le rendez-vous » (PROPOSÉ, `ecrans-brennar-ash-honorer-2026-09-24.html`) → `fiche-batiment/honorer-2026-09-24/`.
  - ㉙ : les 2 cadres PROPOSÉS (choisir, aucun gros bras) → `ecran_conflit/proposes-2026-09-24/`, et 59, 60, 61, 63 + la référence 59 re-rendus
    (réplique sans orateur, doublon « jamais » retiré, atelier `e732cee`).
Usage : python3 Tools/juge-visuel/rendre-tour-2026-09-24.py [--a-blanc] [--lieutenant | --delegation | --honorer | --conflit | --refaire | --ratif]"""
import importlib.util, os, sys
ICI = os.path.dirname(os.path.abspath(__file__))
sp = importlib.util.spec_from_file_location('lot', os.path.join(ICI, 'rendre-lot-2026-09-23.py'))
lot = importlib.util.module_from_spec(sp); sp.loader.exec_module(lot)
S6 = os.path.join(lot.ATELIER, 'ecrans-brennar-6.html'); P7 = os.path.join(lot.ATELIER, 'ecrans-brennar-7-lieutenant.html')
JV = 'Tools/juge-visuel'

def commandes():
    c = [(f'⑦ cadre {n}', P7, n, os.path.join(JV, 'famille/maquette-7-2026-09-23', f'cadre-{n}-1080x2102.png')) for n in range(4)]
    c += [(f'㉜ cadre {n}', S6, n, os.path.join(JV, 'ecran_delegation/maquette-2026-09-24', f'cadre-{n}-1080x2102.png')) for n in range(73, 79)]
    c += [('㉜ référence 73', S6, 73, os.path.join(JV, 'ecran_delegation/reference-1080x2102.png')),
          ('㉜ référence 78', S6, 78, os.path.join(JV, 'ecran_delegation/reference-reserve-1080x2102.png'))]
    c += [('② honorer (PROPOSÉ)', os.path.join(lot.ATELIER, 'ecrans-brennar-ash-honorer-2026-09-24.html'), 0,
           os.path.join(JV, 'fiche-batiment/honorer-2026-09-24/cadre-0-1080x2102.png'))]
    P25 = os.path.join(lot.ATELIER, 'ecrans-brennar-25-tutoriel.html')   # --ratif : ㉕ aligné (D17, atelier f3122c7) ; ④ et ⑲ inchangés
    c += [(f'㉕ ratif cadre {n}', P25, n, os.path.join(JV, 'compte/maquette-25-2026-09-23', f'cadre-{n}-1080x2102.png')) for n in range(4)]
    PC = os.path.join(lot.ATELIER, 'ecrans-brennar-conflit-proposes-2026-09-24.html')
    c += [(f'㉙ proposé {n}', PC, n, os.path.join(JV, 'ecran_conflit/proposes-2026-09-24', f'cadre-{n}-1080x2102.png')) for n in range(2)]
    c += [(f'㉙ série 6 cadre {n}', S6, n, os.path.join(JV, 'ecran_conflit/maquette-2026-09-23', f'cadre-{n}-1080x2102.png')) for n in (59, 60, 61, 63)]
    c += [('㉙ référence 59', S6, 59, os.path.join(JV, 'ecran_conflit/reference-1080x2102.png'))]
    return [(nom, [sys.executable, 'Tools/rendre-tel.py', page, str(n), sortie, '3.6']) for nom, page, n, sortie in c]

def main():
    cmds = commandes()
    if '--lieutenant' in sys.argv: cmds = [c for c in cmds if c[0].startswith('⑦')]
    if '--delegation' in sys.argv: cmds = [c for c in cmds if c[0].startswith('㉜')]
    if '--honorer' in sys.argv: cmds = [c for c in cmds if c[0].startswith('②')]
    if '--conflit' in sys.argv: cmds = [c for c in cmds if c[0].startswith('㉙')]
    if '--ratif' in sys.argv: cmds = [c for c in cmds if c[0].startswith('㉕ ratif')]
    if '--refaire' in sys.argv: cmds = [c for c in cmds if c[0] in ('⑦ cadre 1', '㉙ proposé 0', '㉙ proposé 1', '② honorer (PROPOSÉ)')]   # les 4 re-rendus du 24/09
    if '--a-blanc' in sys.argv:
        [print(' '.join(c)) for _, c in cmds]; print(f'{len(cmds)} rendus'); return
    occ = lot.machine_libre()
    if occ: sys.exit(f'⛔ machine occupée ({occ}) : rien lancé')
    for d in ('ecran_delegation/maquette-2026-09-24', 'fiche-batiment/honorer-2026-09-24', 'ecran_conflit/proposes-2026-09-24'): os.makedirs(os.path.join(ICI, d), exist_ok=True)
    print(f'DÉBUT {lot.heure()}')
    for nom, c in cmds: lot.etape(nom, c)
    print(f'FIN DU NAVIGATEUR {lot.heure()}')

if __name__ == '__main__':
    main()
