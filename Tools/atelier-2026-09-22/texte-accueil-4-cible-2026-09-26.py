#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""④ cadre 1 — l'ÉTAT CIBLE de la branche A (décision f2 du 26/09, sous la délégation user « continue sans me demander ») : celui que le
chunk 3 de HL rend vrai. Les DEUX boutons portent les libellés servis des deux options (option 0 = agir, option 1 = laisser), chacun avec SA
conséquence dessous, en rangée (la forme de la branche B, cadre 2) ; « Prendre acte », « Pas maintenant » et la ligne « prendre acte n’agit pas à
votre place » sortent de la cible. L'étiquette le dit : en attendant le chunk 3, le client garde Prendre acte / Pas maintenant SANS ligne de
conséquence — jamais l'effet d'« agir » affiché sans le geste qui le déclenche.
S'applique APRÈS `texte-accueil-4-consequences-2026-09-26.py`. Mots lus dans `57-hl-consequences-2026-09-26.tsv`. Comptes attendus, idempotent.
Usage : texte-accueil-4-cible-2026-09-26.py [--controle | --ecrire]"""
import csv, os, re, sys
ICI = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.expanduser('~/project/atelier3d-mafia/ecrans-brennar-accueil.html')
TSV = os.path.join(ICI, '57-hl-consequences-2026-09-26.tsv')

def csq(option):
    with open(TSV, encoding='utf-8') as f:
        for l in csv.DictReader(f, delimiter='\t', quoting=csv.QUOTE_NONE):
            if l['clé'] == f'hl.option.{option}.projected_consequence':
                return l['fr']
    raise KeyError(option)

R, L = csq('damaged_building.repair_via_queue'), csq('damaged_building.leave_damaged')
ETQ_AVANT = '<div class="etiquette">④ L’ouverture — une carte de tête</div>'
ETQ_APRES = ('<div class="etiquette">④ L’ouverture — une carte de tête · état cible, HL chunk 3 ; en attendant, le client garde '
             'Prendre acte / Pas maintenant, sans ligne de conséquence</div>')
A_AVANT = ('<div class="opt4"><div class="lib4">Mettre en réparation</div>'
           f'<div class="csq4 prop">{R}</div></div>'
           '<div class="opt4"><div class="lib4">Laisser en l’état</div>'
           f'<div class="csq4 prop">{L}</div></div>'
           '<div class="gestes"><div class="g or"><span class="prop">Prendre acte</span></div>'
           '<div class="g"><span class="prop">Pas maintenant</span></div></div>'
           '<div class="sous prop" style="font-size:8px">prendre acte n’agit pas à votre place</div>')
A_APRES = ('<div class="gestes"><div class="g or">Mettre en réparation</div><div class="g">Laisser en l’état</div></div>'
           f'<div class="csq4-rang"><div class="csq4 prop">{R}</div><div class="csq4 prop">{L}</div></div>')
CSS_AVANT = """/* la ligne de conséquence sous chaque option (design HL v7.6, A9 et §6-C ; mots : client `57-hl-consequences-2026-09-26.tsv`), PROPOSÉE
   le 2026-09-26 — branche A (cadre 1) : sous le LIBELLÉ de chaque option, jamais un bouton ; branche B (cadre 2) : sous chaque bouton */
.acc4 .opt4{margin-top:7px;text-align:center}
.acc4 .lib4{font:400 9.6px/1.3 'DejaVu Sans';color:#eae0c8}
"""
CSS_APRES = """/* la ligne de conséquence sous chaque option (design HL v7.6, A9 et §6-C ; mots : client `57-hl-consequences-2026-09-26.tsv`), PROPOSÉE
   le 2026-09-26 — sous CHAQUE BOUTON, en rangée, dans les deux branches : cadre 2 (carte des rapports) et cadre 1 (carte ordinaire, état
   cible du chunk 3 de HL, où les boutons portent les deux options — décision f2 du 26/09) */
"""

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    s = open(PAGE, encoding='utf-8').read()
    C = [m.start() for m in re.finditer(r'<div class="cadre">', s)] + [len(s)]
    if len(C) != 5: print(f'⛔ {len(C) - 1} cadres ≠ 4'); return 1
    c1 = s[C[1]:C[2]]
    avant = [c1.count(ETQ_AVANT), c1.count(A_AVANT), s.count(CSS_AVANT)]
    apres = [c1.count(ETQ_APRES), c1.count(A_APRES), s.count(CSS_APRES)]
    if avant == [0, 0, 0] and apres == [1, 1, 1]: print('déjà passée (0 remplacement)'); return 0
    if avant != [1, 1, 1] or apres != [0, 0, 0]: print(f'⛔ comptes avant {avant} ≠ [1, 1, 1] ou après {apres} ≠ [0, 0, 0]'); return 1
    t = s[:C[1]] + c1.replace(ETQ_AVANT, ETQ_APRES).replace(A_AVANT, A_APRES) + s[C[2]:]
    t = t.replace(CSS_AVANT, CSS_APRES)
    print('3 remplacements (étiquette, carte, style)' + (' écrits' if mode == '--ecrire' else ' à écrire'))
    if mode == '--ecrire': open(PAGE, 'w', encoding='utf-8').write(t)
    return 0

if __name__ == '__main__':
    sys.exit(main())
