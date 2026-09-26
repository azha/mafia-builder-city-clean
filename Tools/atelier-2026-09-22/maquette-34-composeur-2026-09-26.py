#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""㉞ les ordres du soir — le COMPOSEUR et l'état vide vrai, maquette PROPOSÉE (commande f2 du 26/09 ; délégation D26).
Écrit `~/project/atelier3d-mafia/ecrans-brennar-34-composeur.html` (3 cadres), tête et chrome dérivés de `ecrans-brennar-accueil.html`
(le bloc de styles de ④, posé dans la rangée, est repris dans la tête — piège du 23/09), dock « Plus » actif (㉞ est au menu Plus).
- cadre 0 : le carnet d'un joueur NEUF (kit mesuré : 4 locaux opérationnels, l'ardoise du labo en attente, 0 itinéraire, 0 candidat) —
  ce qui manque, ce qu'il peut déjà poser (avec un geste), et les types sans cible, LISIBLES mais SANS geste ;
- cadre 1 : le composeur, étape 2 « Sur quoi ? » après « Faire l'entretien » : les 4 locaux, un déjà posé grisé ;
- cadre 2 : le carnet à 4 ordres, la 5ᵉ ligne « Poser un ordre », « appui long pour déplacer », et « Lancer la soirée » (n'existe qu'à 4).
Mots : table 73 (PROPOSÉS) + valeurs SERVIES lues au back 18dfa633 (carnet.ordre.*, carnet.bloc.*). Aucune icône. Comptes et garde de
styles exigés. Usage : [--controle | --ecrire]"""
import csv, os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__))
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
SORTIE = os.path.join(ATELIER, 'ecrans-brennar-34-composeur.html')
NB, FI = ' ', ' '
git = lambda d, r: subprocess.run(['git', '-C', d, 'show', r], capture_output=True, text=True, check=True).stdout
LIEUX = ['Outillage Halde', 'Cellier Marrek', 'Photo Ilm', 'Garde-meubles Sallo']   # enseignes servies du kit (corps 003)
CSS = """
/* ═══ ㉞ le composeur du carnet du soir, PROPOSÉ le 2026-09-26 — sans icône ═══ */
.cmp34{height:406px;display:flex;flex-direction:column;justify-content:flex-end;padding:0 12px 6px;font-family:'DejaVu Sans',sans-serif;color:#eae0c8}
.cmp34 *{box-sizing:border-box}
.cmp34 .verre{margin:0}
.cmp34 .cpt{font:700 6.6px/1 'DejaVu Sans';letter-spacing:.22em;color:#b9ad92;text-align:center;margin-top:5px}
.cmp34 .dit{font:400 9px/1.4 'DejaVu Sans';color:#eae0c8;text-align:center;margin-top:7px}
.cmp34 .grp{font:700 6.6px/1 'DejaVu Sans';letter-spacing:.24em;text-transform:uppercase;color:#b08d3e;margin:10px 0 3px}
.cmp34 .r{display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid #ffffff12}
.cmp34 .grp+.r{border-top:0}
.cmp34 .r .n{font:400 10px/1 'DejaVu Serif';color:#b08d3e;width:12px}
.cmp34 .r .t{flex:1;min-width:0;font:400 9.4px/1.3 'DejaVu Sans'}
.cmp34 .r .t small{display:block;font-size:7.6px;color:#b9ad92;margin-top:2px}
.cmp34 .r.eteint .t{color:#7d7666}
.cmp34 .r.vide .t{color:#b9ad92;font-style:italic}
.cmp34 .g{font:700 7.4px/1 'DejaVu Sans';letter-spacing:.14em;text-transform:uppercase;padding:7px 9px;border-radius:8px;border:1px solid #ffffff2a;
  background:#ffffff0a;color:#eae0c8;white-space:nowrap}
.cmp34 .g.or{background:linear-gradient(180deg,#e9c56b,#c99a37);color:#241804;border-color:#8a611c}
.cmp34 .lancer{display:block;text-align:center;margin-top:10px;padding:10px;border-radius:9px;font:700 9px/1 'DejaVu Sans';letter-spacing:.16em;
  text-transform:uppercase;background:linear-gradient(180deg,#e9c56b,#c99a37);color:#241804;border:1px solid #8a611c}
.cmp34 .pied{font:400 7.6px/1.3 'DejaVu Sans';color:#b9ad92;text-align:center;margin-top:5px}
"""

def servi():
    st = git(os.path.expanduser('~/project/mafia-clean-city'), '18dfa633:services/game-back/src/i18n/string_table.ts')
    d = st.index('export const FR_MESSAGES'); f = st.index('\n};', d); fr = {}
    for m in re.finditer(r"^\s*'([a-zA-Z0-9_.-]+)':\s*\n?((?:\s*'(?:[^'\\]|\\.)*'\s*\+?\s*\n?)+),", st[d:f], re.M):
        fr[m.group(1)] = re.sub(r"\\(.)", r"\1", ''.join(re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(2))))
    return fr

def t73():
    return {r['clé']: r['fr'] for r in csv.DictReader(open(os.path.join(ICI, '73-carnet-composeur-2026-09-26.tsv'), encoding='utf-8'),
            delimiter='\t', quoting=csv.QUOTE_NONE)}

def cibles(n):  # la branche ICU de carnet.vide.n_cibles, rendue pour la maquette
    return f'{n}{NB}cible' + ('s' if n > 1 else '') if n > 1 else 'une cible'

def construire():
    fr, m = servi(), t73()
    O = {k: fr[f'carnet.ordre.{k}'] for k in ('distribution_run', 'maintenance_batch', 'recruitment_step', 'exception_batch_resolution')}
    a = lambda lieu: fr['carnet.bloc.a_batiment_quartier'].replace('{batiment}', lieu).replace('{quartier}', 'La Lisière')
    tete_titre = (f'<div class="sur">{fr["carnet.bloc.carnet_du_soir"]}</div><div class="titre">{fr["carnet.bloc.les_ordres_de_ce_soir"]}</div>')
    poser = m['carnet.composeur.poser_un_ordre']; rien = m['carnet.composeur.rien_a_viser_pour_l_instant']
    c0 = ('<div class="verre">' + tete_titre + f'<div class="cpt">0{fr["carnet.bloc.ordres_sur_8"]}</div>'
          f'<div class="dit prop">{m["carnet.vide.il_faut_au_moins_quatre_ordres_pour_une_soiree"]}</div>'
          f'<div class="grp prop">{m["carnet.vide.vous_pouvez_deja_poser"]}</div>'
          f'<div class="r"><div class="t">{O["maintenance_batch"]}<small class="prop">{cibles(4)}</small></div><div class="g or prop">{poser}</div></div>'
          f'<div class="r"><div class="t">{O["exception_batch_resolution"]}<small class="prop">{cibles(1)}</small></div><div class="g prop">{poser}</div></div>'
          f'<div class="r eteint"><div class="t">{O["distribution_run"]}<small class="prop">{rien}</small></div></div>'
          f'<div class="r eteint"><div class="t">{O["recruitment_step"]}<small class="prop">{rien}</small></div></div></div>')
    c1 = ('<div class="verre">' + f'<div class="sur prop">{m["carnet.composeur.quel_ordre"]} · {O["maintenance_batch"]}</div>'
          f'<div class="titre prop">{m["carnet.composeur.sur_quoi"]}</div>'
          + ''.join(f'<div class="r{" eteint" if i == 0 else ""}"><div class="t">{a(l)}'
                    + (f'<small class="prop">{m["carnet.composeur.deja_dans_le_carnet"]}</small>' if i == 0 else '') + '</div>'
                    + ('' if i == 0 else f'<div class="g prop">{m["carnet.composeur.choisir"]}</div>') + '</div>' for i, l in enumerate(LIEUX)) + '</div>')
    lignes = [(O['exception_batch_resolution'], a(LIEUX[0]))] + [(O['maintenance_batch'], a(l)) for l in LIEUX[1:]]
    c2 = ('<div class="verre">' + tete_titre + f'<div class="cpt">4{fr["carnet.bloc.ordres_sur_8"]}</div>'
          + ''.join(f'<div class="r"><span class="n">{i + 1}</span><div class="t">{o}<small>{c}</small></div></div>' for i, (o, c) in enumerate(lignes))
          + f'<div class="r vide"><span class="n">5</span><div class="t prop">{poser}</div></div>'
          f'<div class="pied prop">{m["carnet.composeur.appui_long_pour_deplacer"]}</div>'
          f'<div class="lancer">{fr["carnet.bloc.lancer_la_soiree"]}</div>'
          f'<div class="pied">{fr["carnet.bloc.une_fois_partie_on_ne_la_reprend_pas"]}</div></div>')
    return [('㉞ Le carnet — un joueur neuf : ce qui manque, ce qu’on peut déjà poser (PROPOSÉ)', c0),
            ('㉞ Le composeur — « Sur quoi ? » après « Faire l’entretien » (PROPOSÉ)', c1),
            ('㉞ Le carnet à quatre ordres — « Lancer la soirée » n’existe qu’à partir de quatre (PROPOSÉ)', c2)]

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    acc = git(ATELIER, 'HEAD:ecrans-brennar-accueil.html')
    C = [x.start() for x in re.finditer(r'<div class="cadre">', acc)]
    base = acc[C[0]:C[1]].rstrip()
    a = base.index('<div class="panneau">'); b = base.index('<div class="dock9">')
    base = base.replace('<div class="db actif">', '<div class="db">', 1)
    k = base.rindex('<div class="db">'); base = base[:k] + '<div class="db actif">' + base[k + len('<div class="db">'):]
    a = base.index('<div class="panneau">'); b = base.index('<div class="dock9">')
    cadres = []
    for etq, contenu in construire():
        c = base[:a] + '<div class="panneau"><div class="cmp34">' + contenu + '</div></div>' + base[b:]
        c = re.sub(r'<div class="etiquette">[^<]*</div>', f'<div class="etiquette">{etq}</div>', c, count=1)
        cadres.append(c)
    tete = acc[:acc.index('<div class="page">')]
    style4 = re.search(r'<style>\n/\* ═══ ④ L\'ACCUEIL.*?</style>', acc, re.S).group(0)
    tete = re.sub(r'<title>[^<]*</title>', '<title>Écrans de Brennar — ㉞ le composeur du carnet du soir</title>', tete, count=1)
    tete = tete.replace('</style>', CSS + '</style>', 1) + style4 + '\n'
    bandeau = ('<header class="bandeau"><h1>Écrans de Brennar — ㉞ les ordres du soir : composer une soirée</h1><p>Le carnet ratifié (cadres '
               '90-91) montre un carnet rempli sans dire comment on pose un ordre. Ici : ce qui manque à un joueur neuf et ce qu’il peut déjà poser ; '
               'le choix d’une cible servie ; le lancement, qui n’existe qu’à quatre ordres. Types réservés jamais offerts ; aucun bouton qui ne peut '
               'aboutir. Un mot souligné en pointillé est <b>proposé, non ratifié</b>. Atelier / DA, 2026-09-26.</p></header>')
    page = tete + '<div class="page">\n' + bandeau + '\n<div class="rangee">\n' + '\n'.join(cadres) + '\n</div>\n</div>\n'
    classes = {c for x in re.finditer(r'class="([^"]*)"', ''.join(cadres)) for c in x.group(1).split()}
    regles = set(re.findall(r'\.([a-zA-Z][\w-]*)', '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', page, re.S))))
    perdues = classes & (set(re.findall(r'\.([a-zA-Z][\w-]*)', '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', acc, re.S)))) | set(re.findall(r'\.([a-zA-Z][\w-]*)', CSS))) - regles
    comptes = {'cadres': page.count('<div class="cadre">'), 'div équilibrées': all(c.count('<div') == c.count('</div>') for c in cadres),
               'icônes': sum(len(re.findall(r'<svg|<img', c[c.index('cmp34'):c.index('dock9')])) for c in cadres),
               'lancer': page.count('class="lancer"'), 'plus actif': sum(c.count('<div class="db actif">') for c in cadres)}
    print(comptes)
    if comptes != {'cadres': 3, 'div équilibrées': True, 'icônes': 0, 'lancer': 1, 'plus actif': 3} or perdues:
        print('⛔', perdues); return 1
    ancien = open(SORTIE, encoding='utf-8').read() if os.path.exists(SORTIE) else None
    if ancien == page: print('déjà écrite (identique)'); return 0
    print('à écrire' if mode != '--ecrire' else 'écrite')
    if mode == '--ecrire': open(SORTIE, 'w', encoding='utf-8').write(page)
    return 0

if __name__ == '__main__':
    sys.exit(main())
