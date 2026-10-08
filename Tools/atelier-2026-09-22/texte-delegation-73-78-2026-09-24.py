#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""㉜ — le TEXTE des cadres 73-78 de la série 6 aligné sur les tables 44 et 56 (v1.1, `b20b1bdb`) : « ce que l'user ratifie = ce que le jeu
dira » (f2, 24/09). ㉜ n'est pas ratifiée : D13. Fragment par fragment, cadre par cadre :
  - la sous-ligne des plaques à vous : « vous la faites » → la MAÎTRISE par état (`delegation.maitrise.*`), une par charge, choisie pour que
    chaque état se voie et que le 74 soit vrai : les tournées NASCENT « vous apprenez encore », l'embauche LEARNING « pas encore prête »,
    l'approvisionnement ELIGIBLE « prête à confier » (c'est elle qu'on confie au 74 : seule ELIGIBLE se confie), la chaleur PRACTICED
    « presque prête » ;
  - la sous-ligne des plaques confiées : « depuis 6 jours » (aucune source) → « tenue pour vous » (`delegation.maitrise.tenue`) ;
  - 74 : la réplique de l'approvisionnement (VRAIE pour cette charge, `delegation.replique.supply_sourcing`), U+00A0 dans « » et avant « : » ;
  - 76 : sans locuteur, la maison prévient (56) ; l'aperçu : « Ce qui a été appris », « Rancune », « Sa relève » (56 v1.1) ; la note avec
    U+00A0 avant « : » (44) ;
  - 77 : « aujourd’hui » à la place de « ce matin » (44) ; U+00A0 avant « : » dans le pavé (44) ;
  - 78 : RETIRÉ du client — NOTÉ dans l'étiquette, pas retiré (la numérotation 0-based de la série sert partout), comme ㉙ 61.
Pages : `ecrans-brennar-6.html` et `ecrans-brennar-6-sans-pastilles.html`. Comptes ATTENDUS par page et par cadre ; idempotent ; zones
protégées (script, style, commentaires, aside) ; l'étiquette du 78 est hors du .tel (aucun rendu pour elle). Aucun rendu (après le gate).
Usage : texte-delegation-73-78-2026-09-24.py [--mesurer | --controle | --ecrire]"""
import os, re, sys
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
PAGES = ['ecrans-brennar-6.html', 'ecrans-brennar-6-sans-pastilles.html']
NB = ' '
TOUS = (73, 74, 75, 76, 77, 78)
def soi(charge, sous, mot):   # une plaque à vous : la sous-ligne de maîtrise
    a = f'<b>{charge}</b><i>{sous}</i></div><div class="tenu vous"><b>vous</b><i>vous la faites</i>'
    return a, a.replace('<i>vous la faites</i>', f'<i>{mot}</i>')
F = [
 ((73, 74, 75, 77),) + soi('Les tournées', 'qui livre quoi, et par où', 'vous apprenez encore'),
 ((73, 74),) + soi('L’embauche', 'qui entre dans la maison', 'pas encore prête'),
 ((73, 74),) + soi('L’approvisionnement', 'ce qu’on commande, et à qui', 'prête à confier'),
 ((73, 74, 75, 77),) + soi('La chaleur', 'ce qu’on fait quand la ville s’échauffe', 'presque prête'),
 ((75, 76, 77), '<i>depuis 6 jours</i>', '<i>tenue pour vous</i>'),
 ((74,), '<b>Lt. Hara :</b> « Donnez-moi l’approvisionnement. Je m’en occupe, et vous ne verrez plus passer les commandes. »',
         f'<b>Lt. Hara{NB}:</b> «{NB}Donnez-moi l’approvisionnement. Je m’en occupe, et vous ne verrez plus passer les commandes.{NB}»'),
 ((76,), '<u>Ce qu’il a appris</u>', '<u>Ce qui a été appris</u>'),
 ((76,), '<u>Il vous en veut</u>', '<u>Rancune</u>'),
 ((76,), '<u>Celui qu’il formait</u>', '<u>Sa relève</u>'),
 ((76,), 'Ceci est un avertissement, pas un mur : le jeu', f'Ceci est un avertissement, pas un mur{NB}: le jeu'),
 ((76,), '<b>Lt. Rin :</b> « Vous pouvez la reprendre. Il ne le prendra pas bien, et ce qu’il savait faire, vous devrez le réapprendre. »',
         'Vous pouvez la reprendre. Ce sera mal pris, et tout ce qui s’y était appris, il faudra le réapprendre.'),
 ((77,), 'Vous avez déjà confié <b>l’embauche</b> ce matin.', 'Vous avez déjà confié <b>l’embauche</b> aujourd’hui.'),
 ((77,), 'Ce n’est pas une limite d’énergie : c’est', f'Ce n’est pas une limite d’énergie{NB}: c’est'),
 ((78,), '<div class="etiquette">Les huit qui n’existent pas encore</div>',
         '<div class="etiquette">Les huit qui n’existent pas encore — RETIRÉ du client (pas un écran joueur) ; gardé pour la numérotation de la série</div>'),
]
PROTEGE = re.compile(r'(<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->|<aside>.*?</aside>)', re.S)
ATTENDU = {   # --mesurer, atelier d870715, 2026-09-24 — 26 par page
    'ecrans-brennar-6.html': {'73:0': 1, '73:1': 1, '73:2': 1, '73:3': 1, '74:0': 1, '74:1': 1, '74:2': 1, '74:3': 1, '74:5': 1, '75:0': 1, '75:3': 1, '75:4': 2, '76:4': 1, '76:6': 1, '76:7': 1, '76:8': 1, '76:9': 1, '76:10': 1, '77:0': 1, '77:3': 1, '77:4': 2, '77:11': 1, '77:12': 1, '78:13': 1},
    'ecrans-brennar-6-sans-pastilles.html': {'73:0': 1, '73:1': 1, '73:2': 1, '73:3': 1, '74:0': 1, '74:1': 1, '74:2': 1, '74:3': 1, '74:5': 1, '75:0': 1, '75:3': 1, '75:4': 2, '76:4': 1, '76:6': 1, '76:7': 1, '76:8': 1, '76:9': 1, '76:10': 1, '77:0': 1, '77:3': 1, '77:4': 2, '77:11': 1, '77:12': 1, '78:13': 1},
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
        neuf, compte = s[:C[73]], {}
        for i in TOUS:
            t, n = appliquer(s[C[i]:C[i + 1]], i); neuf += t
            compte.update({f'{i}:{k}': v for k, v in n.items() if v})
        neuf += s[C[79]:]; total += sum(compte.values())
        if mode == '--mesurer': print(f'    {page!r}: {compte},'); continue
        if compte and compte != ATTENDU.get(page): d.append(f'{page} : {compte} ≠ attendus {ATTENDU.get(page)}')
        elif mode == '--ecrire' and compte:
            open(p, 'w', encoding='utf-8').write(neuf)
            s2 = open(p, encoding='utf-8').read(); C2 = cadres(s2)
            assert not any(v for i in TOUS for v in appliquer(s2[C2[i]:C2[i + 1]], i)[1].values()), f'{page} : non idempotent'
        print(f'  {page:40} {sum(compte.values()):3}' + (' écrits' if mode == '--ecrire' and compte and not d else ' (déjà passée)' if not compte else ''))
    if mode == '--ecrire' and not d:
        s = open(os.path.join(ATELIER, PAGES[0]), encoding='utf-8').read(); C = cadres(s)
        import html as _h
        for i in TOUS[:-1]:
            t = _h.unescape(re.sub(r'<[^>]+>', ' ', PROTEGE.sub(' ', s[C[i]:C[i + 1]])))
            r = re.findall(r'vous la faites|depuis 6 jours|ce matin|\bIl ne le prendra\b|Ce qu’il a appris|Celui qu’il formait|Il vous en veut', t)
            if r: d.append(f'cadre {i} : restes {r}')
    print(f'total : {total} · {len(d)} défaut(s)'); [print('  ⛔', x) for x in d]
    return 1 if d else 0

if __name__ == '__main__':
    sys.exit(main())
