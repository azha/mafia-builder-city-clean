#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Porte les décisions RATIFIÉES sur le chrome des maquettes de l'atelier — pour que les juges cessent de noter des écarts ratifiés.

Sources (registre `Tools/juge-visuel/ARBITRAGES-user-2026-09-07.md`, ratifié f2 le 07/09) :
  - point 10 : format monétaire « 9 627 820 € », sans centimes, espace fine insécable (U+202F) ;
  - point 11 : le MOT de la bande dans le médaillon, pas un pourcentage ;
  - point 19 : « HEAT », « $ 24 850 » dans les références = maquettes en retard (le client a raison) ;
  - `front.md` §4 A (ruling user du 25/08) : le dock dit « Filière » (le canon ① seulement : les séries n'ont pas de dock).
Les séries 4, 6 et 1 sont éditées EN PLACE (leurs versions ratifiées restent dans l'historique git) ; `hud-brennar.html` ne l'est jamais :
son canon est DÉRIVÉ par `Tools/juge-visuel/rendre-canon-1-2026-09-23.py`, qui porte les mêmes décisions.

Chaque remplacement a un compte ATTENDU, mesuré le 2026-09-23 à l'atelier `72e4202` : un compte différent ⇒ rien n'est écrit (la page a
bougé). Idempotent : une page déjà portée rend 0 occurrence de l'ancien motif et le compte attendu du nouveau.
Usage : python3 Tools/atelier-2026-09-22/maj-chrome-canon-2026-09-23.py [--controle]"""
import os, sys
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
F = ' '                                             # espace fine insécable (point 10)
ARGENT = f'24{F}850{F}€'
OPS = {
    'ecrans-brennar-4.html': [
        ('<span class="val">$ 24 850</span>', f'<span class="val">{ARGENT}</span>', 31),                   # 10, 19
        ('<span class="val">tiède</span><span class="lib">Heat</span>',
         '<span class="val">Tiède</span><span class="lib">CHALEUR</span>', 31),                             # 11, 19 — la forme de la série 6
    ],
    'ecrans-brennar-6.html': [
        ('<span class="val">24 850,00 €</span>', f'<span class="val">{ARGENT}</span>', 146),              # 10 — la barre
        ('<b>24 850,00 €</b><small>ARGENT</small>', f'<b>{ARGENT}</b><small>ARGENT</small>', 3),        # 10 — les plaques de ㉒
    ],
    'ecrans-brennar.html': [
        ('<b>$ 24 850</b><span>Propre</span>', f'<b>{ARGENT}</b><span>Propre</span>', 1),                  # 10, 19
    ],
}

def main():
    controle = '--controle' in sys.argv; defauts = []; ecrits = {}
    for page, ops in OPS.items():
        s = open(os.path.join(ATELIER, page), encoding='utf-8').read(); t = s
        for avant, apres, n in ops:
            a, b = t.count(avant), t.count(apres)
            if (a, b) == (0, n): print(f'  {page} : déjà porté ({n} × nouveau)'); continue
            if a != n: defauts.append(f'{page} : « {avant[:50]} » × {a}, {n} attendu(s)'); continue
            t = t.replace(avant, apres); print(f'  {page} : {n} remplacement(s) — {avant[:48]} → {apres[:48]}')
        if t != s: ecrits[page] = t
    for x in defauts: print('  ⛔', x)
    if defauts: print('rien écrit'); sys.exit(1)
    if not controle:
        for page, t in ecrits.items(): open(os.path.join(ATELIER, page), 'w', encoding='utf-8').write(t)
    # contrôle après écriture : plus aucun ancien motif, le nouveau au compte attendu
    for page, ops in OPS.items():
        s = open(os.path.join(ATELIER, page), encoding='utf-8').read()
        for avant, apres, n in ops:
            if not controle and (s.count(avant), s.count(apres)) != (0, n): defauts.append(f'{page} après : {s.count(avant)} / {s.count(apres)}')
    print('0 défaut' if not defauts else '\n'.join('⛔ ' + d for d in defauts)); sys.exit(1 if defauts else 0)

if __name__ == '__main__':
    main()
