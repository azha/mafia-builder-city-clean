#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rend les références de la SÉRIE 4 (`ecrans-brennar-4.html`) corrigées le 2026-09-22 : ⑯ (cadres 0-3), ⑨ (14, 16-18), ⑩ (15).

Pourquoi ces rendus sont dus (atelier, 2026-09-22) : les bustes des lieutenants passent à la capuche (règle par RÔLE du 02/09,
`8509195`, `18432fd`), l'anneau or vif du Don est retiré des lieutenants et de « La ville » (`0ccd8d5`), les phrases de v4-3
suivent `deviation_condition` et les noms servis (`30c8374`, `9e8a3e3`). Sans re-rendu, le juge compare un écran corrigé à une
image qui porte l'artefact qu'on vient de retirer.

Même discipline que `rendre-references-2026-09-22.py`, et les MÊMES gardes — importées de `rendre-references-dues.py`, pas
recopiées : l'index est APPARIÉ À SON ÉTIQUETTE avant tout rendu, la machine doit être libre (porte Unity, gate E2E, Unity
batchmode), le rendeur (`rendre-tel.py` → `rendre-maquette.py`) ouvre une fenêtre plus grande que le contenu et asserte « non
rogné » contre la géométrie du `.tel` (300 × 584 CSS), et la taille est relue sur le fichier écrit.
Seules différences : la PAGE (série 4 au lieu de série 6), et deux formats — `--echelle 3.6` (références 1080×2102 de l'INDEX)
et `--echelle 3.0` (les canons ratifiés `v4-<n>.png`, 900×1752, rendus ainsi le 2026-09-03).

Usage : rendre-references-serie4-2026-09-22.py --echelle 3.6|3.0 [--verifier] [--seul <index>]
"""
import importlib.util, os, sys

ICI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('dues', os.path.join(ICI, 'rendre-references-dues.py'))
dues = importlib.util.module_from_spec(spec); spec.loader.exec_module(dues)
dues.MOI = 'mafia-unity-DA'            # la porte tenue par ce worktree n'est pas une occupation
dues.PAGE = os.path.join(dues.ATELIER, 'ecrans-brennar-4.html')

ETQ = {
    0:  "Revue du jour — trois jetons sur le zinc",
    1:  "Revue du jour — personne au comptoir",
    2:  "Revue du jour — après vos verdicts",
    3:  "Revue du jour — avec les lots back L1 + L2",
    14: "Exceptions — la file au comptoir",
    15: "Exception — sa main de cartes (le détail)",
    16: "Exceptions — personne ne fait la queue",
    17: "Exceptions — après le tampon, le suivant s’avance",
    18: "Exceptions — avec les lots back",
}
POURQUOI = "capuche pour tout lieutenant, anneau du Don retiré, phrases et noms servis (atelier 0ccd8d5)"
FORMATS = {
    '3.6': ((1080, 2102), [
        (0,  'revue-du-jour/reference-1080x2102.png', "⑯ nominal (INDEX)"),
        (14, 'exceptions/reference-⑨-1080x2102.png', "⑨ nominal (INDEX)"),
        (15, 'exceptions/reference-⑩-1080x2102.png', "⑩ nominal (INDEX)"),
    ]),
    '3.0': ((900, 1752), [
        (0, 'revue-du-jour/v4-0.png', "⑯ canon ratifié"), (1, 'revue-du-jour/v4-1.png', "⑯ canon ratifié"),
        (2, 'revue-du-jour/v4-2.png', "⑯ canon ratifié"), (3, 'revue-du-jour/v4-3.png', "⑯ canon ratifié"),
        (14, 'exceptions/v4-14.png', "⑨ canon ratifié"), (15, 'exceptions/v4-15.png', "⑩ canon ratifié"),
        (16, 'exceptions/v4-16.png', "⑨ canon ratifié"), (17, 'exceptions/v4-17.png', "⑨ canon ratifié"),
        (18, 'exceptions/v4-18.png', "⑨ canon ratifié"),
    ]),
}
if '--echelle' not in sys.argv:
    print('⛔ --echelle 3.6|3.0 obligatoire'); sys.exit(2)
ech = sys.argv[sys.argv.index('--echelle') + 1]
if ech not in FORMATS:
    print('⛔ échelle inconnue : %s' % ech); sys.exit(2)
dues.ECHELLE = ech
dues.TAILLE, liste = FORMATS[ech]
DUS = [(i, ETQ[i], sortie, f'{role} — {POURQUOI}') for i, sortie, role in liste]
if '--seul' in sys.argv:
    seul = int(sys.argv[sys.argv.index('--seul') + 1])
    DUS = [d for d in DUS if d[0] == seul]
    if not DUS:
        print('⛔ --seul %d : aucun cadre de cet index à cette échelle' % seul); sys.exit(2)
dues.DUS = DUS
if __name__ == '__main__':
    dues.main()
