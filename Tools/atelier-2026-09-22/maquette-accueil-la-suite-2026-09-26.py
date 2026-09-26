#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""④ pour un joueur NEUF, sans carte à fort levier : « la suite » (commande f2 du 26/09, maquette PROPOSÉE, délégation D26).
Ajoute à `ecrans-brennar-accueil.html` un cadre 4 (les cadres 0-3 gardent leurs index), dérivé du cadre 0 (même tête, même scène,
même dock) : au plus 3 lignes, chacune un état SERVI du compte neuf + son geste vers l'écran qui le porte, au-dessus de la file.
L'état dessiné est celui du compte neuf mesuré (corps ux_vide_2609, pile 66060cc1) : labo IDLE + Pyralin NONE sans commande (A1),
aucun dealer (B), aucun lieutenant avec une règle (D) ; la file porte la carte d'accueil de Lt. Tull (session/open, corps 002).
Mots lus dans `72-accueil-la-suite-2026-09-26.tsv` ({precurseur} résolu en « Pyralin », building.precursor.pyralin servi).
Pas d'icône. Comptes exigés, idempotent (le cadre 4 est réécrit s'il existe). Usage : [--controle | --ecrire]"""
import csv, os, re, sys
ICI = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.expanduser('~/project/atelier3d-mafia/ecrans-brennar-accueil.html')
ETIQ = '④ L’ouverture — un joueur neuf, sans carte de tête : la suite (PROPOSÉ)'
CSS_ANCRE = '/* le dock du canon HUD'
CSS = """/* « la suite » d'un joueur neuf (cadre 4, PROPOSÉ le 2026-09-26 ; mots : client 72-accueil-la-suite-2026-09-26.tsv) — sans icône */
.acc4 .suite4 .sur{margin-bottom:4px}
.acc4 .suite4 .r4{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid #ffffff12}
.acc4 .suite4 .sur+.r4{border-top:0}
.acc4 .suite4 .t4{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0}
.acc4 .suite4 .t4 b{font:400 11px/1.25 'DejaVu Serif';color:#f2c96b}
.acc4 .suite4 .t4 span{font:400 8.4px/1.35 'DejaVu Sans';color:#b9ad92}
.acc4 .suite4 .g4{font:700 8px/1 'DejaVu Sans';letter-spacing:.14em;text-transform:uppercase;padding:8px 10px;border-radius:8px;
  border:1px solid #ffffff2a;background:#ffffff0a;color:#eae0c8;white-space:nowrap}
.acc4 .suite4 .g4.or{background:linear-gradient(180deg,#e9c56b,#c99a37);color:#241804;border-color:#8a611c}

"""

def mots():
    t = {}
    for r in csv.DictReader(open(os.path.join(ICI, '72-accueil-la-suite-2026-09-26.tsv'), encoding='utf-8'), delimiter='\t',
                            quoting=csv.QUOTE_NONE):
        if r['clé'] != '—': t[(r['ligne'], r['clé'])] = r['fr']
    par = {}
    for (ligne, cle), fr in t.items(): par.setdefault(ligne, []).append(fr.replace('{precurseur}', 'Pyralin'))
    return par

def cadre(base, par):
    def ligne(nom, primaire=False):
        titre, phrase, geste = par[nom][0], par[nom][1], par[nom][2]
        return (f'<div class="r4"><div class="t4"><b class="prop">{titre}</b><span class="prop">{phrase}</span></div>'
                f'<div class="g4{" or" if primaire else ""} prop">{geste}</div></div>')
    suite = (f'<div class="verre suite4"><div class="sur prop">{par["bloc"][0]}</div>' + ligne('A1 labo', True) + ligne('B vente') +
             ligne('D règles') + '</div>')
    file_ = ('<div class="suivant"><div class="qui">Lt. Tull attend vos ordres<small>grave</small></div>'
             '<span class="act">trancher</span></div>')
    a = base.index('<div class="acc4" style="height:406px">'); b = base.index('<div class="dock9">')
    neuf = base[:a] + '<div class="acc4" style="height:406px">' + suite + file_ + '</div></div></div>' + base[b:]
    return re.sub(r'<div class="etiquette">[^<]*</div>', f'<div class="etiquette">{ETIQ}</div>', neuf, count=1)

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    s = open(PAGE, encoding='utf-8').read(); par = mots()
    C = [m.start() for m in re.finditer(r'<div class="cadre">', s)]
    fin = s.rindex('\n</div>\n</div>')
    base = s[C[0]:C[1]].rstrip()
    assert base.count('<div class="dock9">') == 1 and base.count('<div class="acc4" style="height:406px">') == 1
    nouveau = cadre(base, par)
    if len(C) == 5:                                     # déjà ajouté : on le réécrit
        t = s[:C[4]] + nouveau + s[fin:]
    elif len(C) == 4:
        t = s[:fin] + '\n' + nouveau + s[fin:]
    else:
        print(f'⛔ {len(C)} cadres'); return 1
    if CSS not in t:
        if t.count(CSS_ANCRE) != 1: print('⛔ ancre de style'); return 1
        t = t.replace(CSS_ANCRE, CSS + CSS_ANCRE, 1)
    comptes = {'cadres': t.count('<div class="cadre">'), 'lignes': nouveau.count('class="r4"'), 'gestes': nouveau.count('class="g4'),
               'icônes': len(re.findall(r'<svg|<img', nouveau[nouveau.index('suite4'):nouveau.index('dock9')]))}
    print(comptes)
    if comptes != {'cadres': 5, 'lignes': 3, 'gestes': 3, 'icônes': 0}: print('⛔ comptes'); return 1
    if t == s: print('déjà écrite (identique)'); return 0
    print('à écrire' if mode != '--ecrire' else 'écrite')
    if mode == '--ecrire': open(PAGE, 'w', encoding='utf-8').write(t)
    return 0

if __name__ == '__main__':
    sys.exit(main())
