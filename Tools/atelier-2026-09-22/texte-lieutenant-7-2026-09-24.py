#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""⑦ — le TEXTE de la maquette `ecrans-brennar-7-lieutenant.html` aligné sur la table 55 (`a6159d89`) : « ce que l'user ratifie = ce que le
jeu dira » (f2, 23-24/09). Trois fragments, cadres 1 et 2 :
  - « Il écoute autre chose que vos ordres » → « Lt. Quist écoute autre chose que vos ordres » (n° 13, D13 : le NOM servi, `{nom}`) ;
  - « ce qu’il écoute à la place : » → « ce qui est écouté à la place : » avec U+00A0 (n° 17, D13 + D17) ;
  - « En faire la règle ? » → U+202F avant « ? » (n° 18, D17).
Le cadre 3 (l'éditeur de ⑧ en ordre permanent) est DÉJÀ mot pour mot la table 42 : non touché. Les étiquettes de cadre (hors du .tel) non plus.
⚠️ La page vient de `generer-maquette-7-2026-09-23.py` puis d'outils de passage (phase, apostrophes, cadre 3) : ce passage-ci en est un de plus.
Comptes ATTENDUS (mesurés), idempotent, zones protégées (script, style, commentaires, aside). Aucun rendu (après le gate back, au signal f2).
Usage : texte-lieutenant-7-2026-09-24.py [--mesurer | --controle | --ecrire]"""
import os, re, sys
PAGE = os.path.expanduser('~/project/atelier3d-mafia/ecrans-brennar-7-lieutenant.html')
NB, NNB = ' ', ' '
F = [((1,), '<b class="prop">Il écoute autre chose que vos ordres</b>', '<b class="prop">Lt. Quist écoute autre chose que vos ordres</b>'),
     ((1,), '<span class="prop">ce qu’il écoute à la place :</span>', f'<span class="prop">ce qui est écouté à la place{NB}:</span>'),
     ((2,), '<b class="prop">En faire la règle ?</b>', f'<b class="prop">En faire la règle{NNB}?</b>')]
PROTEGE = re.compile(r'(<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->|<aside>.*?</aside>)', re.S)
ATTENDU = {'1:0': 1, '1:1': 1, '2:2': 1}   # --mesurer, atelier 731521f5, 2026-09-24

def cadres(s):
    return [m.start() for m in re.finditer(r'<div class="cadre">', s)] + [len(s)]

def appliquer(t, i):
    morceaux = PROTEGE.split(t); n = {}
    for j in range(0, len(morceaux), 2):
        for k, (ou, a, b) in enumerate(F):
            if i in ou:
                c = morceaux[j].count(a); n[k] = n.get(k, 0) + c; morceaux[j] = morceaux[j].replace(a, b)
    return ''.join(morceaux), n

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    s = open(PAGE, encoding='utf-8').read(); C = cadres(s); d = []
    if len(C) - 1 != 4: sys.exit(f'⛔ {len(C) - 1} cadres, 4 attendus')
    neuf, compte = s[:C[0]], {}
    for i in range(4):
        t, n = appliquer(s[C[i]:C[i + 1]], i); neuf += t
        compte.update({f'{i}:{k}': v for k, v in n.items() if v})
    if mode == '--mesurer': print(compte); return 0
    if compte and compte != ATTENDU: d.append(f'{compte} ≠ attendus {ATTENDU}')
    elif mode == '--ecrire' and compte:
        open(PAGE, 'w', encoding='utf-8').write(neuf)
        s2 = open(PAGE, encoding='utf-8').read(); C2 = cadres(s2)
        assert not any(v for i in range(4) for v in appliquer(s2[C2[i]:C2[i + 1]], i)[1].values()), 'non idempotent'
    print(f'  {os.path.basename(PAGE)} : {sum(compte.values())} remplacement(s)' + (' écrits' if mode == '--ecrire' and compte and not d else ' (déjà passée)' if not compte else ''))
    for x in d: print('  ⛔', x)
    return 1 if d else 0

if __name__ == '__main__':
    sys.exit(main())
