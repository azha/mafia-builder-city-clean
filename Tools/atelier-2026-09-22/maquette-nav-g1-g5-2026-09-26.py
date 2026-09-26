#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""G1 (rouvrir l'Accueil) et G5 (le menu Plus à 21 entrées) — maquettes PROPOSÉES (file f2 du 26/09, point 3 ; délégation user D26 :
meilleure reco, sans attente). Écrit `~/project/atelier3d-mafia/ecrans-brennar-navigation.html` (3 cadres), DÉRIVÉE, jamais redessinée :
tête + cadre carte de `ecrans-brennar-3-presence.html`, cadres et dock de `ecrans-brennar-accueil.html` (lus au commit HEAD).

Le « revenir » est DÉJÀ codé (client e575a536, AppShell.cs:425-433, ARBITRAGES §C.14) : flèche retirée ; toucher l'onglet ACTIF ramène
à sa racine ; le retour système dépile. Ce qui manquait (design-shell-nav.md §C) :
- G1 — RECO : sur la carte (racine d'Empire), toucher encore l'onglet ACTIF Empire rouvre l'Accueil — aujourd'hui ce geste ne fait rien
  (`Depiler` rend `racine`). Le retour système depuis l'Accueil le referme sur la carte (déjà codé). Aucun chrome ni mot neuf.
  Cadre 0 : la carte, Empire actif ; cadre 1 : l'Accueil rouvert (le cadre 1 de ④, état cible).
- G5 — RECO : cinq groupes titrés EN MOTS (PROPOSÉS, soulignés en pointillé), entrées en deux colonnes, tout tient sans défiler.
  Les libellés d'entrée sont les littéraux servis (AppShell.cs DestinationsPlus, e575a536), inchangés. « LA FILIÈRE » sort : le dock la
  monte déjà (ARBITRAGES D6). Aucun écran vide n'est masqué (un écran masqué ne se découvre plus — design-shell-nav.md §C).
Comptes exigés, garde de styles (0 classe perdue). Usage : maquette-nav-g1-g5-2026-09-26.py [--controle | --ecrire]"""
import os, re, subprocess, sys
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
SORTIE = os.path.join(ATELIER, 'ecrans-brennar-navigation.html')
CLIENT_REF = 'e575a536'
GROUPES = [
    ('Vos journées', ['LA REVUE DU JOUR', 'LES ORDRES DU SOIR', 'CE QUE VOUS AVEZ CONFIÉ', 'LA SEMAINE']),
    ('Vos affaires', ['LA CHAÎNE D\'APPRO', 'LA DISTRIBUTION', 'LA VENTE', 'RASER UN SITE']),
    ('Ce qui se dit', ['LE JOURNAL & LA RUE', 'LA RÉPUTATION', 'LE CONFLIT']),
    ('Ce qui vous guette', ['LA LOI', 'LES INSPECTIONS', 'LE COMMISSARIAT', 'LE DOSSIER']),
    ('Vous', ['L\'HORIZON DES POSSIBLES', 'VOTRE PROFIL', 'LA VITRINE', 'LA PREMIÈRE FOIS', 'LES RÉGLAGES']),
]
RETIREE = {'LA FILIÈRE'}
CSS = """
/* ═══ G5 — le menu Plus en cinq groupes, PROPOSÉ le 2026-09-26 (titres en mots, deux colonnes, sans défilement) ═══ */
.plus5{height:406px;display:flex;flex-direction:column;justify-content:flex-end;padding:0 12px 6px;font-family:'DejaVu Sans',sans-serif}
.plus5 *{box-sizing:border-box}
.plus5 .grp5{font:700 6.6px/1 'DejaVu Sans';letter-spacing:.28em;text-transform:uppercase;color:#b08d3e;margin:9px 2px 4px}
.plus5 .ent5{display:flex;flex-wrap:wrap;gap:4px}
.plus5 .e5{flex:1 1 calc(50% - 4px);padding:7px 6px;border-radius:7px;background:#0c1320e6;border:1px solid #ffffff17;
  font:400 8px/1.2 'DejaVu Sans';letter-spacing:.08em;color:#eae0c8;text-align:center;text-transform:uppercase}
"""
BANDEAU = ('<header class="bandeau"><h1>Écrans de Brennar — la navigation : rouvrir l’Accueil (G1), le menu Plus (G5)</h1><p>Le retour '
           'passe par l’onglet actif et le retour système ; la flèche est retirée (ARBITRAGES §C.14, codé). G1 : sur la carte, toucher '
           'EMPIRE rouvre l’Accueil. G5 : les vingt entrées en cinq groupes ; la Filière est au dock (D6). Un mot souligné en pointillé est '
           '<b>proposé, non ratifié</b> (délégation du 26/09, D26). Atelier / DA, 2026-09-26.</p></header>')
git = lambda d, f: subprocess.run(['git', '-C', d, 'show', f], capture_output=True, text=True, check=True).stdout

def cadres(html):
    C = [m.start() for m in re.finditer(r'<div class="cadre">', html)]
    return [html[a:b].rstrip() for a, b in zip(C, C[1:] + [html.index('\n</div>\n</div>', C[-1]) if '\n</div>\n</div>' in html[C[-1]:] else len(html)])]

def classes(h): return {c for m in re.finditer(r'class="([^"]*)"', h) for c in m.group(1).split()}
def regles(h): return set(re.findall(r'\.([a-zA-Z][\w-]*)', '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', h, re.S))))

def construire():
    pres, acc = git(ATELIER, 'HEAD:ecrans-brennar-3-presence.html'), git(ATELIER, 'HEAD:ecrans-brennar-accueil.html')
    shell = git(os.path.expanduser('~/project/mafia-unity-DA'), f'{CLIENT_REF}:Assets/Scripts/Shell/AppShell.cs')
    servies = re.findall(r'\("[a-z_]+", "([^"]+)", \(\) => MountTenant', shell)
    comptes = {'entrées servies': len(servies)}
    miennes = [e for _, es in GROUPES for e in es]
    manque = set(servies) - set(miennes) - RETIREE; inventees = set(miennes) - set(servies)
    tete = pres[:pres.index('<div class="page">')].replace('</style>', CSS + '</style>', 1)
    # ⛔ le bloc de styles de ④ (.acc4, .dock9…) est posé DANS la rangée de la page Accueil, pas dans sa tête (piège du 23/09) : on le reprend
    m = re.search(r'<style>\n/\* ═══ ④ L\'ACCUEIL.*?</style>', acc, re.S)
    comptes['styles de ④'] = int(bool(m))
    tete += m.group(0) + '\n' if m else ''
    tete = re.sub(r'<title>[^<]*</title>', '<title>Écrans de Brennar — la navigation (G1, G5)</title>', tete, count=1)
    carte = cadres(pres)[0]; acc_c = cadres(acc)
    i = acc_c[1].index('<div class="dock9">'); j = acc_c[1].index('Plus</div></div>', i) + len('Plus</div></div>')
    dock_empire = acc_c[1][i:j]
    comptes['dock empire actif'] = dock_empire.count('class="db actif"')
    # cadre 0 : la carte, dock posé après carte-wrap, Empire actif
    p = carte.index('<div class="carte-pied">'); p = carte.index('</div>', p) + 6; p = carte.index('</div>', p) + 6
    c0 = carte[:p] + dock_empire + carte[p:]
    c0, comptes['étiquette 0'] = re.subn(r'<div class="etiquette">[^<]*</div>',
        '<div class="etiquette">G1 · 1 — sur la carte, toucher EMPIRE (l’onglet actif) rouvre l’Accueil (PROPOSÉ)</div>', c0, count=1)
    c1, comptes['étiquette 1'] = re.subn(r'<div class="etiquette">[^<]*</div>',
        '<div class="etiquette">G1 · 2 — l’Accueil rouvert ; le retour système le referme sur la carte</div>', acc_c[1], count=1)
    # cadre 2 : G5, le panneau de ④ cadre 0 remplacé par le menu, Plus actif
    base = acc_c[0]
    a = base.index('<div class="panneau">'); b = base.index('<div class="dock9">', a)
    # ⛔ les MOTS affichés sont ceux de la table 60 (servis demain), pas les littéraux du client (apostrophe droite) — relecture du 26/09
    import csv
    t60 = {r['clé']: r['fr'] for r in csv.DictReader(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
           '60-menu-plus-cles-2026-09-26.tsv'), encoding='utf-8'), delimiter='\t', quoting=csv.QUOTE_NONE)}
    ids = {lib: i for i, lib in re.findall(r'\("([a-z_]+)", "([^"]+)", \(\) => MountTenant', shell)}
    gid = {'Vos journées': 'vos_journees', 'Vos affaires': 'vos_affaires', 'Ce qui se dit': 'ce_qui_se_dit',
           'Ce qui vous guette': 'ce_qui_vous_guette', 'Vous': 'vous'}
    comptes['mots de la 60'] = sum(1 for _, es in GROUPES for e in es if 'plus.entree.' + ids[e] in t60) + sum(
        1 for g, _ in GROUPES if 'plus.groupe.' + gid[g] in t60)
    menu = '<div class="panneau"><div class="plus5">' + ''.join(
        f'<div class="grp5 prop">{t60["plus.groupe." + gid[g]]}</div><div class="ent5">' + ''.join(
            f'<div class="e5">{t60["plus.entree." + ids[e]]}</div>' for e in es) + '</div>'
        for g, es in GROUPES) + '</div></div>'
    c2 = base[:a] + menu + base[b:]
    c2 = c2.replace('<div class="db actif">', '<div class="db">', 1)
    k = c2.rindex('<div class="db">'); c2 = c2[:k] + '<div class="db actif">' + c2[k + len('<div class="db">'):]
    c2, comptes['étiquette 2'] = re.subn(r'<div class="etiquette">[^<]*</div>',
        '<div class="etiquette">G5 — le menu Plus : vingt entrées, cinq groupes, sans défiler (PROPOSÉ)</div>', c2, count=1)
    comptes['plus actif'] = int(c2.count('<div class="db actif">') == 1 and 'actif">' in c2[c2.rindex('<div class="db'):])
    comptes['entrées dessinées'] = c2.count('class="e5"')
    page = tete + '<div class="page">\n' + BANDEAU + '\n<div class="rangee">\n' + '\n'.join([c0, c1, c2]) + '\n</div>\n</div>\n'
    perdues = (classes(c0 + c1 + c2) & (regles(pres) | regles(acc) | regles(CSS))) - regles(page)
    return page, comptes, manque, inventees, perdues

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    page, comptes, manque, inventees, perdues = construire()
    print(comptes)
    attendu = {'entrées servies': 21, 'styles de ④': 1, 'dock empire actif': 1, 'étiquette 0': 1, 'étiquette 1': 1, 'étiquette 2': 1, 'plus actif': 1,
               'entrées dessinées': 20, 'mots de la 60': 25}
    if comptes != attendu: print(f'⛔ comptes ≠ {attendu}'); return 1
    if manque or inventees: print(f'⛔ entrées manquantes {manque} / inventées {inventees}'); return 1
    if perdues: print(f'⛔ classes sans règle : {sorted(perdues)}'); return 1
    ancien = open(SORTIE, encoding='utf-8').read() if os.path.exists(SORTIE) else None
    if ancien == page: print('déjà écrite (identique)'); return 0
    print('page à écrire' if mode != '--ecrire' else f'écrite : {SORTIE}')
    if mode == '--ecrire': open(SORTIE, 'w', encoding='utf-8').write(page)
    return 0

if __name__ == '__main__':
    sys.exit(main())
