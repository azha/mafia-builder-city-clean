#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""② Ash — la dette de maquette « Honorer le rendez-vous » (table 37, PROPOSÉ, `bc49b7e6`) dessinée dans un cadre NEUF, marqué PROPOSÉ
(commande f2 du 24/09). Les cadres ratifiés 92-94 ne sont PAS modifiés et la série 6 n'est pas renumérotée : le cadre neuf vit dans sa propre
page, `~/project/atelier3d-mafia/ecrans-brennar-ash-honorer-2026-09-24.html` (1 cadre), dérivé du cadre 92 (lu dans la page, jamais recopié
à la main), comme la porte de ⑲.
QUAND le geste paraît — lu au back (`operational/ash/ash-appointment.controller.ts:72-86`, `ash-appointment.service.ts:56-66, 170-211`) :
  - `POST /v1/operational/appointment/:id/honor` vend l'Ash présente au lieu et passe le rendez-vous HONORED (la SEULE voie de vente de l'Ash) ;
  - refus : 404 (pas au joueur / inexistant) ; 409 si le rendez-vous n'est pas SCHEDULED (déjà HONORED, ou EXPIRED) ; 409 si SCHEDULED mais
    AUCUNE Ash au lieu (NO_STOCK) ;
  - la projection `GET …/appointment/:id` ne sert que `status` (SCHEDULED | HONORED | EXPIRED) et `payout_band` : la présence d'Ash au lieu
    n'est PAS servie avant l'appui.
  ⇒ le bouton paraît quand `status` = SCHEDULED — l'état du cadre 92 « Un rendez-vous est pris » — et JAMAIS sur 93 (honoré) ni 94 (passé) ;
    « pas d'Ash sur place » ne peut se dire qu'APRÈS l'appui, par le refus 409 (ses mots : à écrire, hors de ce cadre).
Grammaire : celle des boutons de ② (`.labo6 .geste`, reprise sous une classe suffixée `.hon6` : aucune règle de la série n'est touchée),
SANS en-tête de section (« ACTIONS » est retiré), sans sous-titre (un sous-titre serait un mot neuf sans clé). Le mot est
`building.action.honorer_le_rendez_vous` « Honorer le rendez-vous », en capitales comme les autres gestes de ②.
Aucun rendu ici : `rendre-tour-2026-09-24.py` le rend avec le lot, au signal f2.
Usage : python3 Tools/atelier-2026-09-22/generer-honorer-ash-2026-09-24.py"""
import os, re, sys
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
S6 = open(os.path.join(ATELIER, 'ecrans-brennar-6.html'), encoding='utf-8').read()
SORTIE = os.path.join(ATELIER, 'ecrans-brennar-ash-honorer-2026-09-24.html')
C = [m.start() for m in re.finditer(r'<div class="cadre">', S6)] + [len(S6)]
f92 = S6[C[92]:C[93]]
assert 'Un rendez-vous est pris' in f92 and 'RÉSERVÉ' in f92, 'le cadre 92 a bougé'
tete = re.sub(r'<header class="bandeau">.*?</header>',
              '<header class="bandeau"><h1>Écrans de Brennar — ② Ash : honorer le rendez-vous (PROPOSÉ)</h1><p>Un cadre NEUF, dérivé du cadre 92 '
              'ratifié (qui n’est pas modifié) : le geste « Honorer le rendez-vous », seule voie de vente de l’Ash, dessiné pour ratification. '
              'Atelier / DA, 2026-09-24.</p></header>', S6[:C[0]], count=1, flags=re.S)
# les styles de section posés ENTRE les cadres (leçon de la porte : sans eux, le rendu sort sans style)
SECTIONS = ''.join(m.group(0) for m in re.finditer(r'<style[^>]*>\s*/\* ═══.*?</style>', S6[C[0]:C[95]], re.S))
assert '.ecrin6' in SECTIONS or '.ecrin6' in tete, 'le style de la scène Ash a bougé'
STYLE = """<style>/* ═══ ② Ash — honorer (PROPOSÉ, 24/09) — préfixé .hon6, aucune règle de la série touchée ═══ */
.ecrin6.hon6{flex-direction:column;justify-content:flex-start;padding:0 0 12px}
.ecrin6.hon6 svg.ecr{flex:1;min-height:0;height:auto;width:100%}
.hon6 .geste{align-self:stretch;margin:8px 12px 0;display:flex;align-items:center;justify-content:center;gap:8px;padding:9px 11px;
  border-radius:3px;border:1px solid #5a4a2a;background:#241c11;font:700 9.5px/1 'DejaVu Sans';letter-spacing:.7px;color:#d9ab4e}
.hon6 .prop{outline:1px dashed #8fb8e8;outline-offset:2px}
</style>"""
cadre = f92
R = [('<div class="etiquette">Ash — rendez-vous réservé</div>',
      '<div class="etiquette">Ash — rendez-vous réservé : HONORER (PROPOSÉ — dette de maquette, point 19 ; les cadres 92-94 ratifiés ne changent pas)</div>'),
     ('<div class="ecrin6">', '<div class="ecrin6 hon6">')]
for a, b in R:
    assert cadre.count(a) == 1, f'cible absente ou multiple : {a[:60]}'
    cadre = cadre.replace(a, b)
# le geste, sous la scène, dans le même écrin
i = cadre.index('<div class="ecrin6 hon6">'); j = cadre.index('</svg>', i) + len('</svg>')
cadre = cadre[:j] + '<div class="geste prop">HONORER LE RENDEZ-VOUS</div>' + cadre[j:]
NOTE = ('<aside><h2>② Ash — honorer le rendez-vous (PROPOSÉ)</h2><p>Le geste que la maquette ratifiée ne dessinait pas (table 37, '
        '<code>building.action.honorer_le_rendez_vous</code>, dette de maquette, point 19). <code>POST /v1/operational/appointment/:id/honor</code> '
        'vend l’Ash présente au lieu : c’est la <b>seule</b> voie de vente de l’Ash. Le bouton paraît quand le rendez-vous est <b>SCHEDULED</b> '
        '(cet état, celui du cadre 92) ; jamais quand il est honoré (93) ou passé (94). La présence d’Ash au lieu n’est pas servie avant l’appui : '
        '« pas d’Ash sur place » se dit après, par le refus 409 (mots à écrire). Pas d’en-tête de section (« ACTIONS » retiré), pas de sous-titre '
        '(il faudrait un mot sans clé). Le liseret pointillé bleu marque le PROPOSÉ.</p></aside>')
cadre = re.sub(r'<aside>.*?</aside>', NOTE, cadre, count=1, flags=re.S) if '<aside>' in cadre else cadre.replace('</div></div></div></div>', '</div></div></div>' + NOTE + '</div>', 1)
page = tete + SECTIONS + STYLE + cadre + '</div>\n</div>\n'
open(SORTIE, 'w', encoding='utf-8').write(page)
n = len(re.findall(r'<div class="cadre">', page))
print(f'{os.path.basename(SORTIE)} : {n} cadre, geste « HONORER LE RENDEZ-VOUS » sous la scène du 92 ; styles de section {len(SECTIONS)} car.')
sys.exit(0 if n == 1 else 1)
