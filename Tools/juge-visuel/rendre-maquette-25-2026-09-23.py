#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Le rendu de ㉕ (la première fois) — 4 cadres, UNE commande, au tour navigateur que donne f2, jamais avant.
Page : `~/project/atelier3d-mafia/ecrans-brennar-25-tutoriel.html` (générée par `generer-maquette-25-2026-09-23.py`). Sortie : MAQUETTE À RATIFIER,
jamais une référence : `Tools/juge-visuel/compte/maquette-25-2026-09-23/cadre-{0..3}-1080x2102.png`. Même chaîne que le lot du 23/09
(`rendre-tel.py`, ×3,6, polices DejaVu) ; même garde : machine libre (0 mcc-e2e, porte Unity LIBRE) ou rien. Imprime « FIN DU NAVIGATEUR ».
Usage : python3 Tools/juge-visuel/rendre-maquette-25-2026-09-23.py [--a-blanc]   (--a-blanc : les commandes, rien lancé)"""
import importlib.util, os, sys
ICI = os.path.dirname(os.path.abspath(__file__))
sp = importlib.util.spec_from_file_location('lot', os.path.join(ICI, 'rendre-lot-2026-09-23.py'))
lot = importlib.util.module_from_spec(sp); sp.loader.exec_module(lot)
PAGE = os.path.join(lot.ATELIER, 'ecrans-brennar-25-tutoriel.html'); DOSSIER = 'compte/maquette-25-2026-09-23'

def main():
    cmds = [(f'㉕ cadre {i}', [sys.executable, 'Tools/rendre-tel.py', PAGE, str(i), os.path.join('Tools/juge-visuel', DOSSIER, f'cadre-{i}-1080x2102.png'), '3.6'])
            for i in range(4)]
    if '--a-blanc' in sys.argv:
        [print(' '.join(c)) for _, c in cmds]; return
    occ = lot.machine_libre()
    if occ: sys.exit(f'⛔ machine occupée ({occ}) : rien lancé')
    os.makedirs(os.path.join(ICI, DOSSIER), exist_ok=True)
    print(f'DÉBUT {lot.heure()}')
    for nom, c in cmds: lot.etape(nom, c)
    print(f'FIN DU NAVIGATEUR {lot.heure()}')

if __name__ == '__main__':
    main()
