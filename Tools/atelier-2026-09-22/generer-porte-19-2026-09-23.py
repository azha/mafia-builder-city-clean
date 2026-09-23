#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""⑲ / ㉒ La porte « le coffre » — UN CADRE DE MISE À JOUR : ce que le back sert AUJOURD'HUI (GO f2 du 23/09 ; inventaire `35-…`).
Pas d'écran neuf : la porte ratifiée (série 6, cadres 95-97, par délégation le 02/09) reste la maquette. Ce cadre part du cadre 97 (« avec les
lots back », lu dans la page, jamais recopié à la main) et n'applique QUE des remplacements vérifiés (chacun doit trouver sa cible, une fois) :
  - L1 fermé : « Dire mes prix au marché » perd son lot, la bascule est allumée (`meta_market_visibility_enabled` = vrai, corps réel du 22/09) ;
  - L8 fermé : « La langue de la maison » perd son lot (`PATCH /v1/me/settings`) — « Français » (défaut du signup depuis le 02/09) ;
  - la bascule RATIFIÉE du cadre 95 « On vous explique encore » revient dans le tiroir (servie : `tutorials_opt_out`, `PATCH /v1/ui/tutorial-opt-out`) ;
  - le levier RATIFIÉ du cadre 95 « FERMER LE COFFRE · cette session seulement » revient, vivant (`POST /v1/auth/signout`) ;
  - L5, L10, L11 restent ouverts : « Depuis ce matin », « FERMER PARTOUT », « TOUT EFFACER » sont ÉTEINTS, avec leur lot (dettes de maquette).
Le tiroir « Le compte » (㉒) est celui du 97, inchangé (L7 ouvert). La note de DA du 97 est remplacée par celle de ce cadre.
Écrit `~/project/atelier3d-mafia/ecrans-brennar-porte-2026-09-23.html` (1 cadre). Aucun rendu : après le gate back, au tour de f2.
Usage : python3 Tools/atelier-2026-09-22/generer-porte-19-2026-09-23.py"""
import os, re
import importlib.util as _iu
_sp = _iu.spec_from_file_location('apos', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'apostrophes-maquettes-2026-09-23.py'))
_ap = _iu.module_from_spec(_sp); _sp.loader.exec_module(_ap)
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
S6 = open(os.path.join(ATELIER, 'ecrans-brennar-6.html'), encoding='utf-8').read()
SORTIE = os.path.join(ATELIER, 'ecrans-brennar-porte-2026-09-23.html')
C = [m.start() for m in re.finditer(r'<div class="cadre">', S6)] + [len(S6)]
f95, f97 = S6[C[95]:C[96]], S6[C[97]:C[98]]
assert 'Le compte — avec les lots back' in f97 and 'On vous explique encore' in f95, 'la porte a bougé : relire 35'
tete = re.sub(r'<header class="bandeau">.*?</header>',
              '<header class="bandeau"><h1>Écrans de Brennar — ⑲ ㉒ la porte « le coffre » : ce que le back sert aujourd’hui</h1><p>Un cadre de '
              'mise à jour de la porte ratifiée (série 6, cadres 95-97), pas un écran neuf. Un lot encore ouvert reste écrit, et son geste est '
              'éteint. Atelier / DA, 2026-09-23.</p></header>', S6[:C[0]], count=1, flags=re.S)

LOT = '<span class="val" style="color:#8fb8e8;font-size:6.5px">{}</span>'
TUTO = re.search(r'<div class="tir"><div class="poig"></div><div class="lab"><b>On vous explique encore</b>.*?<div class="tog on"><i></i></div></div>', f95).group(0)
COFFRE = re.search(r'<div class="lev">FERMER LE COFFRE<small>cette session seulement</small></div>', f95).group(0)
ETEINT = ' style="opacity:.42"'
R = [
    ('Le compte — avec les lots back', 'Le compte — ce que le back sert aujourd’hui'),
    (LOT.format('L1') + '<div class="tog"><i></i></div>', '<div class="tog on"><i></i></div>'),                       # L1 fermé
    (LOT.format('L8'), ''),                                                                                            # L8 fermé
    ('<span class="val">Français</span><span class="chev">›</span></div>',
     '<span class="val">Français</span><span class="chev">›</span></div>' + TUTO),                                    # la bascule ratifiée du 95
    ('<div class="tir"><div class="poig"></div><div class="lab"><b>Depuis ce matin</b>',
     f'<div class="tir"{ETEINT}><div class="poig"></div><div class="lab"><b>Depuis ce matin</b>'),                     # L5 ouvert
    ('<div class="leviers"><div class="lev">FERMER PARTOUT', f'<div class="leviers">{COFFRE}<div class="lev"{ETEINT}>FERMER PARTOUT'),  # L11
    ('<div class="lev rouge">TOUT EFFACER', f'<div class="lev rouge"{ETEINT}>TOUT EFFACER'),                         # L10
]
cadre = f97
for a, b in R:
    assert cadre.count(a) == 1, f'cible absente ou multiple : {a[:60]}'
    cadre = cadre.replace(a, b)
NOTE = ('<aside><h2>⑲ ㉒ La porte — mise à jour du 2026-09-23</h2><p>Ce que le back sert aujourd’hui (<code>35-inventaire-19-reglages.md</code>) : '
        '<b>L1 fermé</b> (la visibilité du marché se lit dans <code>GET /v1/me</code> et s’écrit par <code>PUT /v1/me/meta-market/visibility</code>) ; '
        '<b>L8 fermé</b> (<code>PATCH /v1/me/settings</code>) ; la bascule des tutoriels (<code>tutorials_opt_out</code>) et « Fermer le coffre » '
        '(<code>POST /v1/auth/signout</code>) reviennent du cadre 95. <b>Dettes de maquette</b>, éteintes avec leur lot : L5 « Depuis ce matin », '
        'L11 « Fermer partout », L10 « Tout effacer » — aucune route. Le tiroir « Le compte » (㉒) est inchangé (L7 ouvert).</p></aside>')
cadre = re.sub(r'<aside>.*?</aside>', NOTE, cadre, count=1, flags=re.S)
cadre = re.sub(r'<!--.*?-->\s*$', '', cadre, flags=re.S)
page = _ap.normaliser(tete + cadre + '</div>\n</div>\n')[0]
open(SORTIE, 'w', encoding='utf-8').write(page)
assert page.count('<div class="cadre">') == 1
print(f'écrit : {SORTIE} — 1 cadre, {len(R)} remplacements vérifiés ; aucun rendu')
