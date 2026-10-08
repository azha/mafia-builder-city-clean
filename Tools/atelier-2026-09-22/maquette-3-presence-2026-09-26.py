#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""③ la carte — maquette PROPOSÉE « où vous avez des bâtiments » (ruling user du 24/09, ARBITRAGES D21 ; délégation D26 : meilleure reco,
sans attente de ratification). Écrit `~/project/atelier3d-mafia/ecrans-brennar-3-presence.html` (1 cadre), DÉRIVÉ du cadre ③·22 ratifié
de la série 6 (lu au commit, `git show HEAD:ecrans-brennar-6.html`), jamais redessiné :
- les districts où le joueur a des bâtiments portent l'état RATIFIÉ `mien` (sol chaud, nom en or, série 6 l.388 et l.391) : la PRÉSENCE ;
- sous le nom, une ligne en mots « 4 BÂTIMENTS » / « 1 BÂTIMENT » : le NOMBRE (servable : `GET /v1/me/buildings` porte `district_id` par
  bâtiment, le client compte ; aucune route neuve). Clé proposée `carte.presence.batiments`, ICU `{n, plural, one {# bâtiment} other {# bâtiments}}` ;
- SANS ICÔNE : le pin « VOUS ÊTES ICI · ⌂ 4 » (`.moi`) sort — le ⌂ était l'icône, et il ne marquait qu'UN district ;
- les carrés peints des 3 districts Glass (`rect.tour`, 5 par quartier glass, 15) sortent, comme de la texture (`ville-peinte/rendre-ville-peinte.py`).
Tout le reste du cadre ratifié est gardé tel quel (chaleur, écussons, descente, rose, pied).
Garde de styles (piège du 23/09 : les styles de section entre cadres) : chaque classe du cadre qui a une règle dans la série 6 doit en avoir une
dans la tête de la page dérivée. La tête vient de `ecrans-brennar-accueil.html` (dérivée de la série 6, règles `.carte` incluses).
Usage : maquette-3-presence-2026-09-26.py [--controle | --ecrire]"""
import os, re, subprocess, sys
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
SORTIE = os.path.join(ATELIER, 'ecrans-brennar-3-presence.html')
PRESENCE = {'LA LISIÈRE': 4, 'MARNE-BASSE': 2, 'LES FRICHES': 1}     # La Lisière = « chez vous » de ③·24 (4 bâtiments) ; 1 et N montrés
MOT = lambda n: f'{n} BÂTIMENT' + ('S' if n > 1 else '')
CSS = """
/* ═══ ③ LA CARTE — présence du joueur, PROPOSÉE le 2026-09-26 (ARBITRAGES D21) : l'état ratifié `mien` + le nombre en mots, sans icône ═══ */
.carte .nbq{font-family:'DejaVu Sans',sans-serif;font-size:4.6px;font-weight:700;letter-spacing:.22em;fill:#f2c96b;text-anchor:middle;
  paint-order:stroke;stroke:#080d14;stroke-width:2}
"""
BANDEAU = ('<header class="bandeau"><h1>Écrans de Brennar — ③ la Carte, où vous avez des bâtiments</h1><p>Dérivée du cadre ③·22 ratifié '
           '(série 6). Ruling user du 24/09 (ARBITRAGES D21) : les districts où vous avez des bâtiments sont marqués — présence et nombre, '
           'sans icône ; les carrés peints des districts Glass sont retirés. <b>Proposé, non ratifié</b> (délégation du 26/09, D26). '
           'Atelier / DA, 2026-09-26.</p></header>')
ETIQUETTE = '③ La Carte — où vous avez des bâtiments (PROPOSÉ, D21)'
git = lambda f: subprocess.run(['git', '-C', ATELIER, 'show', f'HEAD:{f}'], capture_output=True, text=True, check=True).stdout

def classes(html):
    return {c for m in re.finditer(r'class="([^"]*)"', html) for c in m.group(1).split()}

def regles(html):
    css = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', html, re.S))
    return {c for c in re.findall(r'\.([a-zA-Z][\w-]*)', css)}

def construire():
    s6, acc = git('ecrans-brennar-6.html'), git('ecrans-brennar-accueil.html')
    i = s6.index('SÉRIE 6 · ③ LA CARTE · 22'); c = s6.index('<div class="cadre">', i); n = s6.index('<div class="cadre">', c + 10)
    cadre = s6[c:n].rstrip()
    comptes = {}
    cadre, comptes['tours glass'] = re.subn(r'<rect class="tour"[^>]*/>', '', cadre)
    cadre, comptes['pin moi'] = re.subn(r'<g class="moi"[^>]*>.*?</g>', '', cadre, flags=re.S)
    cadre, comptes['mien retiré'] = re.subn(r'(<g class="q [^"]*?) mien"', r'\1"', cadre)
    qs = [m.start() for m in re.finditer(r'<g class="q ', cadre)]
    for nom, nb in PRESENCE.items():
        m = re.search(r'<text class="nomq" x="([\d.]+)" y="([\d.]+)" transform="([^"]+)">' + re.escape(nom) + '</text>', cadre)
        q = [x for x in qs if x < m.start()][-1]
        ouv = cadre.index('">', q)
        ajout = f'<text class="nbq" x="{m.group(1)}" y="{float(m.group(2)) + 7.2:.1f}" transform="{m.group(3)}">{MOT(nb)}</text>'
        cadre = cadre[:m.end()] + ajout + cadre[m.end():]
        cadre = cadre[:ouv] + ' mien' + cadre[ouv:]
        qs = [x + (len(' mien') if x > ouv else 0) for x in qs]
    comptes['mien posé'] = cadre.count(' mien"'); comptes['nbq'] = cadre.count('class="nbq"')
    cadre, comptes['étiquette'] = re.subn(r'<div class="etiquette">[^<]*</div>', f'<div class="etiquette">{ETIQUETTE}</div>', cadre, count=1)
    tete = acc[:acc.index('<div class="page">')]
    tete = tete.replace('</style>', CSS + '</style>', 1)
    tete, comptes['titre'] = re.subn(r'<title>[^<]*</title>', '<title>Écrans de Brennar — ③ la Carte, où vous avez des bâtiments</title>', tete, count=1)
    page = tete + '<div class="page">\n' + BANDEAU + '\n<div class="rangee">\n' + cadre + '\n</div>\n</div>\n'   # le squelette de la maison : ni <html> ni <body>
    # garde de styles : ce que la série 6 style dans ce cadre, la page dérivée doit le styler aussi
    perdues = (classes(cadre) & regles(s6)) - regles(page)
    return page, comptes, perdues

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    page, comptes, perdues = construire()
    attendu = {'tours glass': 15, 'pin moi': 1, 'mien retiré': 1, 'mien posé': 3, 'nbq': 3, 'étiquette': 1, 'titre': 1}
    print(comptes)
    if comptes != attendu: print(f'⛔ comptes ≠ {attendu}'); return 1
    if perdues: print(f'⛔ classes sans règle dans la page dérivée : {sorted(perdues)}'); return 1
    ancien = open(SORTIE, encoding='utf-8').read() if os.path.exists(SORTIE) else None
    if ancien == page: print('déjà écrite (identique)'); return 0
    print('page à écrire' if mode != '--ecrire' else f'écrite : {SORTIE}')
    if mode == '--ecrire': open(SORTIE, 'w', encoding='utf-8').write(page)
    return 0

if __name__ == '__main__':
    sys.exit(main())
