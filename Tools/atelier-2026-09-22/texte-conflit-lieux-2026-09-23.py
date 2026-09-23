#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""㉙ — second passage sur le texte des cadres 59-61 de la série 6 (f2, 23/09 : « ce que l'user ratifie doit être ce que le jeu dira ») :
les deux valeurs tranchées de la 40 v3.1 (`31c95595`) —
  « les ferrailleurs de Spine » → « la ferraille, à Spine » (59, 60, 61) ;
  « La dernière fois chez eux : » → « La dernière fois là-bas : » (60 ; U+00A0 gardé, D17).
Le premier passage (`texte-conflit-59-64-2026-09-23.py`) est clos : ses comptes décrivent une page d'avant, il n'est pas rejoué ici.
Même forme : comptes ATTENDUS par page et par cadre, zones protégées (script, style, commentaires, aside), idempotent, garde des restes.
Aucun rendu : au prochain tour que donne f2 (`rendre-tour-2026-09-23b.py` rend 59-64).
Usage : texte-conflit-lieux-2026-09-23.py [--mesurer | --controle | --ecrire]"""
import os, re, sys
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
PAGES = ['ecrans-brennar-6.html', 'ecrans-brennar-6-sans-pastilles.html']
NB = ' '
F = [((59, 60, 61), 'les ferrailleurs de Spine', 'la ferraille, à Spine'),
     ((60,), f'La dernière fois chez eux{NB}:', f'La dernière fois là-bas{NB}:')]
PROTEGE = re.compile(r'(<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->|<aside>.*?</aside>)', re.S)
ATTENDU = {   # --mesurer, atelier 05d05b1, 2026-09-23 — 4 par page
    'ecrans-brennar-6.html': {'59:0': 1, '60:0': 1, '60:1': 1, '61:0': 1},
    'ecrans-brennar-6-sans-pastilles.html': {'59:0': 1, '60:0': 1, '60:1': 1, '61:0': 1},
}

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
    d, total = [], 0
    for page in PAGES:
        p = os.path.join(ATELIER, page); s = open(p, encoding='utf-8').read(); C = cadres(s)
        if len(C) - 1 != 146: d.append(f'{page} : {len(C) - 1} cadres'); continue
        neuf, compte = s[:C[59]], {}
        for i in (59, 60, 61):
            t, n = appliquer(s[C[i]:C[i + 1]], i); neuf += t
            compte.update({f'{i}:{k}': v for k, v in n.items() if v})
        neuf += s[C[62]:]; total += sum(compte.values())
        if mode == '--mesurer': print(f'    {page!r}: {compte},'); continue
        if compte and compte != ATTENDU.get(page): d.append(f'{page} : {compte} ≠ attendus {ATTENDU.get(page)}')
        elif mode == '--ecrire' and compte:
            open(p, 'w', encoding='utf-8').write(neuf)
            s2 = open(p, encoding='utf-8').read(); C2 = cadres(s2)
            assert not any(v for i in (59, 60, 61) for v in appliquer(s2[C2[i]:C2[i + 1]], i)[1].values()), f'{page} : non idempotent'
        print(f'  {page:40} {sum(compte.values()):3}' + (' écrits' if mode == '--ecrire' and compte and not d else ' (déjà passée)' if not compte else ''))
    print(f'total : {total} · {len(d)} défaut(s)'); [print('  ⛔', x) for x in d]
    return 1 if d else 0

if __name__ == '__main__':
    sys.exit(main())
