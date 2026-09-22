#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rend les références DUES par le commit atelier 20d006d (le trou en fiction) et le dossier ⑮.

Même discipline que `rendre-references-dues.py` : l'index est APPARIÉ À SON ÉTIQUETTE et vérifié
avant tout rendu ; la machine doit être libre (porte Unity, gate E2E, Unity batchmode) ; la taille
de sortie est re-vérifiée sur le fichier écrit. Les fonctions de garde sont importées de ce
script, pas recopiées.

Pourquoi ces rendus sont dus : le client réécrit ses chaînes de classe B dans la langue de la
maison (da/2026-09-22, 56717d98) et quatre cadres disaient encore « serveur », « branché »,
« surface joueur » (atelier 20d006d). Sans re-rendu, le juge du lot B compare un écran réécrit à
une image qui porte le registre qu'on vient de retirer, et rend un faux écart. Les cadres 64, 78,
120, 121 ne sont pas les nominaux de leur dossier : ce sont des références NOMMÉES, en plus —
jamais à la place. ⑮ : nominal 32 (le registre de dispatch, échangé avec ⑰ le 2026-09-07) rendu
au SHA du jour, et ses quatre cadres d'état rendus dans le dossier du tour r2.

Usage : rendre-references-2026-09-22.py [--verifier]
"""
import importlib.util, os, subprocess, sys

ICI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('dues', os.path.join(ICI, 'rendre-references-dues.py'))
dues = importlib.util.module_from_spec(spec); spec.loader.exec_module(dues)
dues.MOI = 'mafia-unity-DA'            # la porte tenue par ce worktree n'est pas une occupation

R2 = 'police/r2-⑮-2026-09-22'
DUS = [
    (64,  "Ce qu'on ne peut pas faire",                 'ecran_conflit/reference-manque-1080x2102.png',
          "㉙·64 : « Personne n'y touche encore » et trois « rien derrière » à la place des comptes de routes (atelier 20d006d)"),
    (78,  "Les huit qui n'existent pas encore",         'ecran_delegation/reference-reserve-1080x2102.png',
          "㉜·78 : « Personne ne les tient encore » / « il n'y a rien derrière » (atelier 20d006d)"),
    (120, "Rien n'a encore déteint",                    'reputation/reference-1080x2102.png',
          "㊲·120 est le NOMINAL de ㊲ (TABLE : nominal 120 ; mesuré : le PNG commité = cadre 120 à 2,4 %, pas 119 comme l'INDEX "
          "l'écrivait à la main) — re-rendu sur place : « personne ne jugera votre constance » (atelier 20d006d)"),
    (121, "Vous vous écartez de vos propres règles",    'reputation/reference-derive-1080x2102.png',
          "㊲·121 : « ce n'est pas un choix, c'est ce qui manque encore » (atelier 20d006d)"),
    (108, "La caisse de Oskar — pleine à ras",          'vente/reference-1080x2102.png',
          "㉟ : la TABLE a corrigé le nominal 107 → 108 le 2026-09-07 sans re-rendre le PNG — mesuré : le fichier commité était le "
          "cadre 107 (7,1 % d'écart contre 34,3 % avec 108). Même classe de défaut que ⑮"),
    (32,  "La police — le registre de dispatch",        'police/reference-⑮-1080x2102.png',
          "⑮ nominal = 32 depuis l'échange du 2026-09-07 ; re-rendu au SHA du jour pour le tour r2"),
    (31,  "La police — le tableau : ce qu’ils savent",  'police/reference-⑰-1080x2102.png',
          "⑰ nominal = 31 depuis l'échange du 2026-09-07 — mesuré le 2026-09-22 : le PNG commité était le cadre 32 (0,3 % d'écart), "
          "l'échange avait été écrit dans la TABLE, jamais rendu. Les deux dossiers police montraient chacun la référence de l'autre"),
    (31,  "La police — le tableau : ce qu’ils savent",  R2 + '/etats/cadre-31-tableau.png', "⑮ état : le tableau (c'est le nominal de ⑰)"),
    (33,  "La police — déposer un signalement",         R2 + '/etats/cadre-33-signalement.png', "⑮ état : déposer (D3 — 422 mesuré côté back)"),
    (34,  "La police — le retour de bâton",             R2 + '/etats/cadre-34-retour-de-baton.png', "⑮ état : représailles (backlash)"),
    (35,  "La police — avec les lots back",             R2 + '/etats/cadre-35-lots-back.png', "⑮ état : avec les lots back (cadre d'atelier, le bas est une note)"),
]
dues.DUS = DUS
if __name__ == '__main__':
    dues.main()
