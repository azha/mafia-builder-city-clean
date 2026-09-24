#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""㉙ — deux cadres NEUFS, marqués PROPOSÉ (décisions f2 du 24/09, après l'inventaire du client à e176f06a), dans leur propre page
`~/project/atelier3d-mafia/ecrans-brennar-conflit-proposes-2026-09-24.html` : la série 6 n'est pas renumérotée, les cadres 59-64 ne changent pas.
Dérivés du cadre 59 (lu dans la page, jamais recopié à la main).
  0. « choisir » — ADOPTÉ du client (ajouts 1 et 2) : le POST exige `lieutenant_id` et `target_holding_id`, la maquette n'avait aucun cadre de
     choix. Sous la fiche d'ordre : une ligne par gros bras (le NOM servi, et « {archétype} · {ancienneté} » par les mots servis
     `famille.archetype.gros_bras`, `famille.anciennete.*` — les deux champs réels que le client affiche, `ConflitScreenController.cs:905-925`),
     puis les 5 axes (`conflit.axe.*`, 40 v3), un choisi. Pas de titre de section (le client n'en a pas : ce seraient des mots sans clé).
  1. « aucun gros bras » — l'arrivée de TOUT joueur neuf (P1 : 0 MUSCLE au signup), ATTEIGNABLE, que le client GARDE (fiche `OrdreIncomplet`,
     `:1016-1060`). Distinct du 61 (un homme choisi qui n'est pas un gros bras : inatteignable, L4). Mots servis que le client affiche :
     `conflit.bloc.aucun_de_vos_lieutenants_n_est_du_genre_gros_bras` sur la fiche, `conflit.bloc.c_est_lui_qui_part_la_nuit_…` en note
     (valeur v3.1), et le geste `famille.ecran.recruter_un_nouveau_lieutenant` (route du recrutement, L7). La table des familles reste.
⚠️ Le fr servi de `aucun_de_vos_lieutenants_…` porte une apostrophe DROITE (« n'est ») : la maquette écrit ’ (D10) — défaut du servi à signaler.
Aucun rendu ici : `rendre-tour-2026-09-24.py` les rend avec le lot, au signal f2.
Usage : python3 Tools/atelier-2026-09-22/generer-conflit-proposes-2026-09-24.py"""
import os, re, sys
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
S6 = open(os.path.join(ATELIER, 'ecrans-brennar-6.html'), encoding='utf-8').read()
SORTIE = os.path.join(ATELIER, 'ecrans-brennar-conflit-proposes-2026-09-24.html')
C = [m.start() for m in re.finditer(r'<div class="cadre">', S6)] + [len(S6)]
f59 = S6[C[59]:C[60]]
assert 'Le coup de ce soir' in f59 and 'on choisit qui y envoyer' in f59, 'le cadre 59 a bougé (texte v3 attendu)'
tete = re.sub(r'<header class="bandeau">.*?</header>',
              '<header class="bandeau"><h1>Écrans de Brennar — ㉙ le conflit : deux cadres PROPOSÉS</h1><p>Dérivés du cadre 59 (la série 6 '
              'n’est pas modifiée) : « choisir » (l’homme et l’axe, adoptés du client) et « aucun gros bras » (l’arrivée du joueur neuf). '
              'Atelier / DA, 2026-09-24.</p></header>', S6[:C[0]], count=1, flags=re.S)
SECTIONS = ''.join(m.group(0) for m in re.finditer(r'<style[^>]*>\s*/\* ═══.*?</style>', S6[C[0]:], re.S))   # TOUTE la page : le style .cfl6 est posé après le cadre 94 (payé au rendu du 24/09, 14:51)
AV = '<div class="av"><svg viewBox="0 0 32 32"><use href="#buste-homburg"/></svg></div>'
STYLE = """<style>/* ═══ ㉙ cadres PROPOSÉS (24/09) — préfixé .cho6, aucune règle de la série touchée ═══ */
.cho6 .hom{display:flex;align-items:center;gap:8px;padding:6px 9px;margin-top:5px;border-radius:3px;border:1px solid #3a2d20;background:#1c1610}
.cho6 .hom.on{border-color:#8a6a22;background:#2a2014}
.cho6 .hom .av{width:22px;height:22px;flex:none}
.cho6 .hom .av svg{width:100%;height:100%}
.cho6 .hom b{display:block;font:700 9px/1.2 'DejaVu Serif';color:#f0dfc4}
.cho6 .hom i{display:block;font:italic 6.5px/1.3 'DejaVu Sans';color:#a2906c}
.cho6 .axes{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
.cho6 .axes span{font:600 7px/1 'DejaVu Sans';padding:5px 7px;border-radius:10px;border:1px solid #5a4938;color:#c9a86a}
.cho6 .axes span.on{border-color:#d9ab4e;background:#4a3618;color:#f0dfc4}
.cho6 .note-p{font:7.5px/1.35 'DejaVu Sans';color:#8d99a6;margin-bottom:6px}
.cho6 .prop{outline:1px dashed #8fb8e8;outline-offset:2px}
</style>"""

def entre(t, debut, fin):
    i = t.index(debut); j = t.index(fin, i) + len(fin); return i, j

def cadre_choisir():
    f = f59
    f = f.replace('<div class="etiquette">Le premier coup — on n’a jamais croisé personne</div>',
                  '<div class="etiquette">㉙ Choisir — l’homme et l’axe (PROPOSÉ, adopté du client ; la table des familles reste, cadre 59)</div>', 1)
    f = f.replace('<div class="cfl6"', '<div class="cfl6 cho6"', 1)
    i, _ = entre(f, '<div class="titron">Les quatre familles de Brennar</div>', '</div>')
    j = f.index('<div class="bas">')
    hommes = (f'<div class="hom on prop">{AV}<div><b>Lt. Kest</b><i>Gros bras · Depuis peu</i></div></div>'
              f'<div class="hom prop">{AV}<div><b>Lt. Voss</b><i>Gros bras · Du métier</i></div></div>')
    axes = ('<div class="axes prop">' + ''.join(f'<span class="{"on" if a == "leurs installations" else ""}">{a}</span>'
            for a in ('leurs gros bras', 'leur argent', 'leurs informateurs', 'leurs installations', 'leur tête')) + '</div>')
    f = f[:i] + hommes + axes + '</div>' + f[j:]
    return f

def cadre_aucun():
    f = f59
    f = f.replace('<div class="etiquette">Le premier coup — on n’a jamais croisé personne</div>',
                  '<div class="etiquette">㉙ Aucun gros bras — l’arrivée du joueur neuf (PROPOSÉ ; atteignable, gardé par le client)</div>', 1)
    f = f.replace('<div class="cfl6"', '<div class="cfl6 cho6"', 1)
    i, j = entre(f, '<div class="phrase">', '</div>')
    f = f[:i] + '<div class="phrase">Aucun de vos lieutenants n’est du genre Gros bras.</div>' + f[j:]
    f = f.replace('<div class="fam visee">', '<div class="fam">', 1).replace('<div class="visee-tag">CE SOIR</div>', '', 1)
    i, j = entre(f, '<div class="bas">', '</div></div>')
    f = f[:i] + ('<div class="bas"><div class="note-p">C’est le gros bras qui part la nuit. Il vous en manque un — ce n’est pas cassé, '
                 'vous n’en avez tout simplement pas encore.</div><div class="geste prop">RECRUTER UN NOUVEAU LIEUTENANT</div></div>') + f[j:]
    return f

def main():
    a, b = cadre_choisir(), cadre_aucun()
    NOTE = ('<aside><h2>㉙ — deux cadres PROPOSÉS (24/09)</h2><p>« Choisir » : adopté du client (le POST exige l’homme et l’axe) ; les mots sont '
            'SERVIS (nom, archétype, ancienneté, axes). « Aucun gros bras » : l’arrivée de tout joueur neuf (0 MUSCLE au signup), distinct du 61 '
            '(inatteignable) ; mots servis, geste de recrutement (L7). Le liseret bleu pointillé marque le PROPOSÉ.</p></aside>')
    for x in (a, b):
        assert '<div class="cadre">' in x
    assert '<aside>' not in a + b   # pas d'aside dans la série 6 : la note est dans le bandeau d'en-tête
    page = tete + SECTIONS + STYLE + a + b + '</div>\n</div>\n'
    open(SORTIE, 'w', encoding='utf-8').write(page)
    n = len(re.findall(r'<div class="cadre">', page))
    reste = [w for w in ('Lt. Kest :', '<b>jamais</b>', 'homme') if w in re.sub(r'<aside>.*?</aside>|<style\b.*?</style>|<script\b.*?</script>', '', a + b, flags=re.S)]
    print(f'{os.path.basename(SORTIE)} : {n} cadres (0 choisir, 1 aucun gros bras) ; restes interdits : {reste or "aucun"}')
    return 0 if n == 2 and not reste else 1

if __name__ == '__main__':
    sys.exit(main())
