#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Le tour de rendu groupé demandé par f2 (23/09, après le créneau de CLIENT-2) — UNE commande, au signal, jamais avant :
  - ㉙ : les cadres 59-64 de la série 6 après la mise à jour du texte (atelier `9f38a24`, `texte-conflit-59-64-2026-09-23.py`) —
    rangés comme MAQUETTE À RATIFIER dans `ecran_conflit/maquette-2026-09-23/cadre-<n>-1080x2102.png` (㉙ n'est pas ratifiée, décision f2) ;
    les deux références du dossier (59 nominal, 64 « manque ») sont re-rendues au même endroit qu'avant, pour que l'INDEX et le dossier r3
    pointent sur le texte à jour ;
  - ② : les 15 cadres rattachés (serre 36-38, labo 39-44, fourneau 45-47, Ash 92-94) — aucune référence à jour n'existait (dossier r1) ;
    rangés dans `fiche-batiment/serie6-2026-09-23/cadre-<n>-1080x2102.png` (statuts cadre par cadre : voir le dossier `fiche-batiment/r1-2026-09-23`).
Même chaîne que le lot du 23/09 (`rendre-tel.py`, ×3,6, polices DejaVu) ; même garde : machine libre (0 mcc-e2e, porte Unity LIBRE) ou rien.
Imprime « FIN DU NAVIGATEUR ». Après : relire chaque cadre, mettre à jour les dossiers (`preparer-dossiers-2026-09-23.py --refaire ②,㉙`).
Usage : python3 Tools/juge-visuel/rendre-tour-2026-09-23b.py [--a-blanc] [--conflit]   (--conflit : ㉙ seul)   (--a-blanc : les commandes, rien lancé)"""
import importlib.util, os, sys
ICI = os.path.dirname(os.path.abspath(__file__))
sp = importlib.util.spec_from_file_location('lot', os.path.join(ICI, 'rendre-lot-2026-09-23.py'))
lot = importlib.util.module_from_spec(sp); sp.loader.exec_module(lot)
S6 = os.path.join(lot.ATELIER, 'ecrans-brennar-6.html')
JV = 'Tools/juge-visuel'

def commandes():
    c = []
    for n in range(59, 65):
        c.append((f'㉙ cadre {n}', os.path.join(JV, 'ecran_conflit/maquette-2026-09-23', f'cadre-{n}-1080x2102.png'), n))
    c.append(('㉙ référence 59', os.path.join(JV, 'ecran_conflit/reference-1080x2102.png'), 59))
    c.append(('㉙ référence 64', os.path.join(JV, 'ecran_conflit/reference-manque-1080x2102.png'), 64))
    for n in list(range(36, 48)) + [92, 93, 94]:
        c.append((f'② cadre {n}', os.path.join(JV, 'fiche-batiment/serie6-2026-09-23', f'cadre-{n}-1080x2102.png'), n))
    return [(nom, [sys.executable, 'Tools/rendre-tel.py', S6, str(n), sortie, '3.6']) for nom, sortie, n in c]

def main():
    cmds = commandes()
    if '--conflit' in sys.argv: cmds = [c for c in cmds if c[0].startswith('㉙')]   # ㉙ seul (59-64 + ses 2 références)
    if '--a-blanc' in sys.argv:
        [print(' '.join(c)) for _, c in cmds]; print(f'{len(cmds)} rendus'); return
    occ = lot.machine_libre()
    if occ: sys.exit(f'⛔ machine occupée ({occ}) : rien lancé')
    for d in ('ecran_conflit/maquette-2026-09-23', 'fiche-batiment/serie6-2026-09-23'):
        os.makedirs(os.path.join(ICI, d), exist_ok=True)
    print(f'DÉBUT {lot.heure()}')
    for nom, c in cmds: lot.etape(nom, c)
    print(f'FIN DU NAVIGATEUR {lot.heure()}')

if __name__ == '__main__':
    main()
