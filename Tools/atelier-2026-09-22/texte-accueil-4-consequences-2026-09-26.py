#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""④ — la ligne de conséquence sous chaque option, dans la maquette `ecrans-brennar-accueil.html` (commande f2 du 24/09, reprise le 26/09 ;
design HL v7.6 `mafia-clean-city` e418ff65, amendement A9 et §6-C : « cadre 1 » = l'état `Available`, les DEUX branches de rendu).
- Cadre 1, branche A (carte ordinaire, 7 fournisseurs sur 8) : les deux options deviennent deux lignes (`recommandationText`, `alternativeText`
  du client, rangs 7 et 8 — la maquette les joignait par « · »), chacune suivie de SA conséquence, sous le LIBELLÉ, jamais sur un bouton.
- Cadre 2, branche B (carte des rapports, `autonomy_reports`) : les options SONT les boutons ; la conséquence se pose sous chaque bouton.
Les mots sont LUS dans `57-hl-consequences-2026-09-26.tsv` (même octet que ce que le back recopiera), soulignés en pointillé = PROPOSÉS.
Comptes attendus, idempotent. Aucun rendu ici (le rendu se fait au créneau navigateur donné par f2).
Usage : texte-accueil-4-consequences-2026-09-26.py [--controle | --ecrire]"""
import csv, os, re, sys
ICI = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.expanduser('~/project/atelier3d-mafia/ecrans-brennar-accueil.html')
TSV = os.path.join(ICI, '57-hl-consequences-2026-09-26.tsv')

def csq(option):
    with open(TSV, encoding='utf-8') as f:
        for l in csv.DictReader(f, delimiter='\t', quoting=csv.QUOTE_NONE):
            if l['clé'] == f'hl.option.{option}.projected_consequence':
                assert not re.search(r'[<>&"]', l['fr']), option
                return l['fr']
    raise KeyError(option)

A_AVANT = '<div class="sous">Mettre en réparation · Laisser en l’état</div>'
A_APRES = ('<div class="opt4"><div class="lib4">Mettre en réparation</div>'
           f'<div class="csq4 prop">{csq("damaged_building.repair_via_queue")}</div></div>'
           '<div class="opt4"><div class="lib4">Laisser en l’état</div>'
           f'<div class="csq4 prop">{csq("damaged_building.leave_damaged")}</div></div>')
B_AVANT = '<div class="gestes"><div class="g or">Lire maintenant</div><div class="g">Laisser en attente</div></div>'
B_APRES = (B_AVANT + '<div class="csq4-rang">'
           f'<div class="csq4 prop">{csq("autonomy_reports.review_now")}</div>'
           f'<div class="csq4 prop">{csq("autonomy_reports.leave_pending")}</div></div>')
CSS_ANCRE = '.acc4 .prop{text-decoration:underline dotted #b9ad92;text-underline-offset:2px}\n'
CSS_AJOUT = """/* la ligne de conséquence sous chaque option (design HL v7.6, A9 et §6-C ; mots : client `57-hl-consequences-2026-09-26.tsv`), PROPOSÉE
   le 2026-09-26 — branche A (cadre 1) : sous le LIBELLÉ de chaque option, jamais un bouton ; branche B (cadre 2) : sous chaque bouton */
.acc4 .opt4{margin-top:7px;text-align:center}
.acc4 .lib4{font:400 9.6px/1.3 'DejaVu Sans';color:#eae0c8}
.acc4 .csq4{font:400 8px/1.35 'DejaVu Sans';color:#b9ad92;margin-top:2px;text-wrap:balance}
.acc4 .csq4-rang{display:flex;gap:8px;margin-top:5px}
.acc4 .csq4-rang .csq4{flex:1;text-align:center;margin-top:0}
"""
DATE_AVANT = 'Atelier / DA, 2026-09-23.</p>'
DATE_APRES = 'Atelier / DA, 2026-09-23 ; la conséquence de chaque option (cadres 1 et 2), 2026-09-26.</p>'

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    s = open(PAGE, encoding='utf-8').read()
    C = [m.start() for m in re.finditer(r'<div class="cadre">', s)] + [len(s)]
    if len(C) != 5: print(f'⛔ {len(C) - 1} cadres ≠ 4'); return 1
    c1, c2 = s[C[1]:C[2]], s[C[2]:C[3]]
    avant = [c1.count(A_AVANT), c2.count(B_AVANT) - c2.count(B_APRES), s.count(CSS_ANCRE + CSS_AJOUT) == 0, s.count(DATE_AVANT)]
    apres = [c1.count(A_APRES), c2.count(B_APRES), s.count(CSS_ANCRE + CSS_AJOUT), s.count(DATE_APRES)]
    if avant == [0, 0, False, 0] and apres == [1, 1, 1, 1]: print('déjà passée (0 remplacement)'); return 0
    if avant != [1, 1, True, 1] or apres != [0, 0, 0, 0] or s.count(CSS_ANCRE) != 1:
        print(f'⛔ comptes avant {avant} ≠ [1, 1, True, 1] ou après {apres} ≠ [0, 0, 0, 0]'); return 1
    t = s[:C[1]] + c1.replace(A_AVANT, A_APRES) + c2.replace(B_AVANT, B_APRES) + s[C[3]:]
    t = t.replace(CSS_ANCRE, CSS_ANCRE + CSS_AJOUT).replace(DATE_AVANT, DATE_APRES)
    print('4 remplacements (cadre 1, cadre 2, style, bandeau)' + (' écrits' if mode == '--ecrire' else ' à écrire'))
    if mode == '--ecrire': open(PAGE, 'w', encoding='utf-8').write(t)
    return 0

if __name__ == '__main__':
    sys.exit(main())
