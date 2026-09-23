#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""㉙ — le TEXTE des cadres 59-64 de la série 6 mis à jour (commande f2 du 23/09, pour que l'user puisse ratifier ㉙ : maquette en retard,
point 19). Les cadres 65-66 sont la v1, remplacée : non touchés. Ce que l'outil applique, FRAGMENT PAR FRAGMENT, cadre par cadre :
  - les mots de la 40 v3 (`df041316`) : formes ÉPICÈNES (D13) à la place des mots genrés ;
  - les 5 AXES à la place des bâtiments visés (`target_holding_id` = un des 5 axes, `conflit.axe.*` de la 40) — un axe différent par cadre ;
  - l'aperçu du BUTIN retiré (aucune donnée servie avant l'envoi : la 40 le classe en note) ;
  - « Coup n°N » retiré tant que `strike_index` n'est pas servi (f2) : chaque ligne de l'historique dit « un envoi » et son issue ;
  - la phrase « La dernière fois chez eux : {issue}, et la ville a chauffé {chaleur}. » avec la forme minuscule de l'issue
    (`conflit.issue_phrase.*`, addendum 40) et U+00A0 avant « : » (D17 : c'est une valeur PROPOSÉE, écrite juste) ;
  - « autre bâtiment » → « autre cible » (40 : le back vise un axe) ; les gestes gardés sont ceux qui ont une route (`POST /v1/me/engagements`).
Pages : `ecrans-brennar-6.html` et sa copie `ecrans-brennar-6-sans-pastilles.html` (mêmes cadres, sans pastilles). Chaque fragment a un compte
ATTENDU par page et par cadre (mesuré, `--mesurer`) ; une page dont un compte diffère n'est pas écrite ; idempotent (une page passée rend 0).
Zones protégées : `<script>`, `<style>`, commentaires, et l'`<aside>` de DA du cadre (on ne réécrit que ce que le téléphone montre).
Aucun rendu : groupé au tour suivant avec les références de ② (signal f2).
Usage : texte-conflit-59-64-2026-09-23.py [--mesurer | --controle | --ecrire]"""
import os, re, sys
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
PAGES = ['ecrans-brennar-6.html', 'ecrans-brennar-6-sans-pastilles.html']
NB = ' '
TOUS = (59, 60, 61, 62, 63, 64)
# (cadres, ancien fragment HTML, nouveau fragment HTML, pourquoi)
F = [
 ((59, 60, 61), 'On choisit une famille, on choisit un homme, et on l’envoie. On saura demain.', 'On choisit une famille, on choisit qui y envoyer. On saura demain.', 'D13 (40 v3)'),
 ((59,), '<b>l’entrepôt de Dépôt-Est</b>', '<b>leurs installations</b>', 'axe `conflit.axe.infrastructure`'),
 ((60,), '<b>l’entrepôt de Dépôt-Est</b>', '<b>leur argent</b>', 'axe `conflit.axe.finance`'),
 ((61,), '<b>leur dépôt de Verrier</b>', '<b>leurs gros bras</b>', 'axe `conflit.axe.muscle`'),
 ((59,), '<div class="prise"><span>ce qu’on prend si ça marche</span><b>la ferraille de leur dépôt</b></div>', '', 'butin : aucune donnée servie'),
 ((60, 61), '<div class="prise"><span>ce qu’on prend si ça marche</span><b>leur entrepôt du quai 4</b></div>', '', 'butin : aucune donnée servie'),
 ((60,), 'La dernière fois chez eux : <b>percée</b>, et la ville a chauffé <b>beaucoup</b>.', f'La dernière fois chez eux{NB}: <b>une percée</b>, et la ville a chauffé <b>beaucoup</b>.', 'conflit.bloc.derniere_fois_chez_eux + conflit.issue_phrase.breakthrough ; D17'),
 ((59, 60, 61), 'on ne les a pas croisés', 'on n’a jamais croisé leur route', 'D13'),
 ((60, 61), 'on est allés chez eux', 'on leur a rendu visite', 'D13'),
 ((59, 60), 'on ne pourra plus le rappeler', 'pas de rappel possible', 'D13'),
 ((61,), 'Lt. Marr tient les comptes, il ne cogne pas.', 'Lt. Marr, c’est les comptes, pas les coups.', 'D13'),
 ((62,), 'Les hommes qu’on a envoyés et qui ne sont pas encore rentrés.', 'Ce qu’on a envoyé et qui n’est pas encore rentré.', 'D13'),
 ((62,), 'Partis, pas encore rentrés', 'En route, pas encore de retour', 'D13'),
 ((62,), '<i>parti chez Tarcum</i>', '<i>en route vers Tarcum</i>', 'D13'),
 ((62,), '<i>parti chez Gorge-de-Fer</i>', '<i>en route vers Gorge-de-Fer</i>', 'D13'),
 ((62,), 'on ne peut plus<br>le rappeler', 'plus de rappel<br>possible', 'D13'),
 ((62,), 'Déjà rentrés', 'Déjà de retour', 'D13'),
 ((62,), 'Deux hommes dehors.', 'Deux personnes dehors.', 'D13'),
 ((62,), 'EN ENVOYER UN AUTRE<small>autre famille, autre bâtiment</small>', 'ENVOYER QUELQU’UN D’AUTRE<small>autre famille, autre cible</small>', 'D13 ; axe'),
 ((63,), 'Ce que chaque homme a rapporté, et ce que ça nous a coûté.', 'Ce que chaque envoi a rapporté, et ce que ça nous a coûté.', 'D13'),
 ((63,), '<div class="titron">Il est rentré</div>', '<div class="titron">De retour</div>', 'D13'),
 ((63,), 'même famille, autre bâtiment', 'même famille, autre cible', 'axe'),
]
COUP = re.compile(r'<b>Coup n°\d+</b><i>un homme envoyé</i>')   # « Coup n°N » retiré : strike_index non servi
COUP_PAR = '<b>un envoi</b>'
PROTEGE = re.compile(r'(<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->|<aside>.*?</aside>)', re.S)

def cadres(s):
    C = [m.start() for m in re.finditer(r'<div class="cadre">', s)] + [len(s)]
    return C

def appliquer(fragment_cadre, i):
    """(texte, {fragment: n}) — hors zones protégées."""
    morceaux = PROTEGE.split(fragment_cadre); n = {}
    for j in range(0, len(morceaux), 2):
        for k, (ou, a, b, _) in enumerate(F):
            if i in ou:
                c = morceaux[j].count(a); n[k] = n.get(k, 0) + c; morceaux[j] = morceaux[j].replace(a, b)
        if i == 63:
            morceaux[j], c = COUP.subn(COUP_PAR, morceaux[j]); n['coup'] = n.get('coup', 0) + c
    return ''.join(morceaux), n

ATTENDU = {   # --mesurer, atelier ffb6f67, 2026-09-23 : page → {'cadre:fragment': compte} — 41 par page
    'ecrans-brennar-6.html': {'59:0': 1, '59:1': 1, '59:4': 1, '59:7': 4, '59:9': 1, '60:0': 1, '60:2': 1, '60:5': 1, '60:6': 1, '60:7': 1, '60:8': 3, '60:9': 1, '61:0': 1, '61:3': 1, '61:5': 1, '61:7': 1, '61:8': 3, '61:10': 1, '62:11': 1, '62:12': 1, '62:13': 1, '62:14': 1, '62:15': 2, '62:16': 1, '62:17': 1, '62:18': 1, '63:19': 1, '63:20': 1, '63:21': 1, '63:coup': 4},
    'ecrans-brennar-6-sans-pastilles.html': {'59:0': 1, '59:1': 1, '59:4': 1, '59:7': 4, '59:9': 1, '60:0': 1, '60:2': 1, '60:5': 1, '60:6': 1, '60:7': 1, '60:8': 3, '60:9': 1, '61:0': 1, '61:3': 1, '61:5': 1, '61:7': 1, '61:8': 3, '61:10': 1, '62:11': 1, '62:12': 1, '62:13': 1, '62:14': 1, '62:15': 2, '62:16': 1, '62:17': 1, '62:18': 1, '63:19': 1, '63:20': 1, '63:21': 1, '63:coup': 4},
}

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    defauts, total = [], 0
    for page in PAGES:
        p = os.path.join(ATELIER, page); s = open(p, encoding='utf-8').read(); C = cadres(s)
        if len(C) - 1 != 146: defauts.append(f'{page} : {len(C) - 1} cadres, 146 attendus'); continue
        neuf, compte = s[:C[59]], {}
        for i in TOUS:
            t, n = appliquer(s[C[i]:C[i + 1]], i); neuf += t
            for k, v in n.items():
                if v: compte[f'{i}:{k}'] = v
        neuf += s[C[65]:]
        total += sum(compte.values())
        if mode == '--mesurer':
            print(f'    {page!r}: {compte},'); continue
        att = ATTENDU.get(page, {})
        if compte and compte != att: defauts.append(f'{page} : comptes {compte} ≠ attendus {att} — la page a bougé')
        elif mode == '--ecrire' and compte:
            open(p, 'w', encoding='utf-8').write(neuf)
            s2 = open(p, encoding='utf-8').read(); C2 = cadres(s2)
            assert all(not any(appliquer(s2[C2[i]:C2[i + 1]], i)[1].values()) for i in TOUS), f'{page} : non idempotent'
        print(f'  {page:40} {sum(compte.values()):4} remplacements' + (' écrits' if mode == '--ecrire' and compte and not defauts else '' if compte else ' (déjà passée)'))
    if mode != '--mesurer':
        # garde : aucun des anciens fragments ne reste visible dans les cadres 59-64 de la série 6 après écriture
        s = open(os.path.join(ATELIER, PAGES[0]), encoding='utf-8').read(); C = cadres(s)
        restes = [(i, a[:40]) for i in TOUS for (ou, a, b, _) in F if i in ou and a in PROTEGE.sub('', s[C[i]:C[i + 1]])]
        if mode == '--ecrire' and restes: defauts.append(f'fragments restants : {restes}')
    print(f'total : {total}' + ('' if mode == '--mesurer' else f' · {len(defauts)} défaut(s)')); [print('  ⛔', x) for x in defauts]
    return 1 if defauts else 0

if __name__ == '__main__':
    sys.exit(main())
