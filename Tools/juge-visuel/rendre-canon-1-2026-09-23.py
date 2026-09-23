#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Le canon propre de ① (ARBITRAGES-user-2026-09-07 points 15, 16, 17, et 18 pour la police) — une PAGE de l'atelier, puis son rendu.

La page `~/project/atelier3d-mafia/hud-brennar-canon.html` (atelier `72e4202`) est DÉRIVÉE de `hud-brennar.html` (validé user, `5983267`, jamais édité) :
  - 17 : l'échafaudage d'atelier MASQUÉ (`.co`, `.floater`, `#bascule`, `#chaudb`) — masqué, pas supprimé : le script de la page
         fait `getElementById('bascule').addEventListener(…)`, et sans l'élément tout ce qui suit ne s'exécute pas (`1713ba2b`) ;
  - 15 : les ronds du dock VIDES (les `<img>` masquées ; le point or de Famille reste — son sens est ouvert, pas son dessin) ;
  - 16 : l'heure retirée, la phase gardée : l'aile droite dit « Jour 12 » / « Soirée » (le client : « JOUR {n} » + la phase) ;
  - l'ISOLATION du téléphone : en-tête et annexes masqués, `.tel` posé en (0, 0) à 392 CSS. ⛔ Le canon propre du 06/09
    (`ecran-canon-propre.png`, `1713ba2b`) ne l'était PAS : il montre l'en-tête « HUD DE BRENNAR » et un téléphone coupé à droite
    (fenêtre de 472 px sur une page à marges). Mesuré le 2026-09-23.
Rendu : `Tools/rendre-maquette.py` (DejaVu, point 18), 392 × 697 CSS × 3 → recadré 1176 × 2091, la taille du canon.

CONTRÔLE DE GÉOMÉTRIE, avant le vrai rendu : la page ISOLÉE SEULE (sans les trois mises à jour), en polices SYSTÈME, doit reproduire
`ecran-canon.png` (le canon du 02/09, qui est bien le téléphone seul) : si elle ne le fait pas, l'isolation est fausse — rien n'est livré.
Usage : python3 Tools/juge-visuel/rendre-canon-1-2026-09-23.py [--page-seule]
"""
import os, re, subprocess, sys
import importlib.util as _iu
_sp = _iu.spec_from_file_location('apos', os.path.join(os.path.dirname(os.path.abspath(__file__)), '../atelier-2026-09-22/apostrophes-maquettes-2026-09-23.py'))
_ap = _iu.module_from_spec(_sp); _sp.loader.exec_module(_ap)          # D10 : l'élision visible en ’ (apostrophes-maquettes-2026-09-23.py)
from PIL import Image, ImageChops

ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
SOURCE = os.path.join(ATELIER, 'hud-brennar.html')
PAGE = os.path.join(ATELIER, 'hud-brennar-canon.html')
ICI = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(ICI, 'ecran-principal')
RENDRE = os.path.join(ICI, '..', 'rendre-maquette.py')
L, H, E = 392, 697, 3.0

ISOLATION = ('html,body{margin:0!important;padding:0!important;background:#0b1016!important;overflow:hidden!important}'
             '.page{max-width:none!important;margin:0!important;padding:0!important}'
             'header.bandeau,.annexes{display:none!important}'
             '.scene{display:block!important;gap:0!important}'
             '.tel{position:absolute!important;left:0!important;top:0!important;width:392px!important;box-shadow:none!important}')
MISES_A_JOUR = ('.co,.floater,#bascule,#chaudb{display:none!important}'          # 17
                '.dockb .rond img{display:none!important}')                      # 15
AILE_AVANT = '<span class="lib">Jour 12 · Soirée</span><span class="val serif" id="heure" style="font-size:15px">21:40</span>'
AILE_APRES = '<span class="lib">Jour 12</span><span class="val serif" id="heure" style="font-size:15px">Soirée</span>'   # 16
F = '\u202f'
# 2026-09-23 (second passage) — les autres décisions ratifiées du chrome, les mêmes que `maj-chrome-canon-2026-09-23.py` pour les séries :
TEXTES = [
    ('<span class="val">$ 24 850</span>', f'<span class="val">24{F}850{F}€</span>'),                                   # 10, 19
    ('<span class="heatpct" id="heatval">37%</span>', '<span class="heatpct" id="heatval">Tiède</span>'),                # 11 : le mot
    ('<span class="heatlib" id="heatlib">Heat</span>', '<span class="heatlib" id="heatlib">Chaleur</span>'),            # 19 (capitales par le CSS)
    ('<span class="pointe"></span></span>Marché</div>', '<span class="pointe"></span></span>Filière</div>'),               # front.md §4 A
    # 8 : les trois cases en BANDES (ratifié) ; les MOTS des bandes sont PROPOSÉS, non ratifiés (`22-…` §7.1 A) ; 19 : « Heat » → « Chaleur »
    ('<b style="color:var(--or-vif)">$ 2 400</b><span>À collecter</span>', '<b style="color:var(--or-vif)">Prêt</b><span>À collecter</span>'),
    ('<b>$ 180/h</b><span>Revenus</span>', '<b>Rapporte</b><span>Revenus</span>'),
    ('<b style="color:var(--braise)">12%</b><span>Heat local</span>', '<b style="color:var(--braise)">Tiède</b><span>Chaleur locale</span>'),
]

def deriver(html, maj=True):
    for sel, n in (('class="co"', 6), ('class="floater"', 1), ('id="bascule"', 1), ('id="chaudb"', 1), ('class="rond"><img', 4)):
        if html.count(sel) != n: sys.exit(f'⛔ `{sel}` × {html.count(sel)}, {n} attendu(s) : la page a changé, rien rendu')
    if maj:
        if html.count(AILE_AVANT) != 1: sys.exit("⛔ l'aile droite n'a pas la forme attendue : rien rendu")
        html = html.replace(AILE_AVANT, AILE_APRES)
        for avant, apres in TEXTES:
            if html.count(avant) != 1: sys.exit(f'⛔ « {avant[:60]} » × {html.count(avant)}, 1 attendu : rien rendu')
            html = html.replace(avant, apres)
    html = _ap.normaliser(html)[0] if maj else html                    # D10 — l'isolation seule (contrôle de géométrie) garde la source telle quelle
    return html + f'\n<style id="canon-1">{ISOLATION}{MISES_A_JOUR if maj else ""}</style>\n'

def rendre(html, sortie, polices_systeme=False):
    tmp = os.path.join(ATELIER, '._rendu-canon-1.html')                       # même dossier : mêmes chemins relatifs
    open(tmp, 'w', encoding='utf-8').write(html)
    env = dict(os.environ, **({'POLICES': 'systeme'} if polices_systeme else {}))
    try:
        r = subprocess.run([sys.executable, RENDRE, tmp, sortie, str(L), str(H), str(E)], capture_output=True, text=True, env=env, timeout=300)
    finally:
        os.remove(tmp)
    if r.returncode: sys.exit('⛔ rendu : ' + (r.stdout + r.stderr)[-600:])
    im = Image.open(sortie).convert('RGB'); im = im.crop((0, 0, round(L * E), round(H * E))); im.save(sortie)
    assert im.size == (1176, 2091), im.size
    return im

def ecart(a, b):
    d = ImageChops.difference(a, b).convert('L'); h = d.histogram(); n = a.size[0] * a.size[1]
    return sum(h[65:]) / n, sum(i * c for i, c in enumerate(h)) / n

def main():
    src = open(SOURCE, encoding='utf-8').read()
    if '--page-seule' in sys.argv:                          # la page de l'atelier, SANS rendu (le rendu passe par l'orchestrateur)
        open(PAGE, 'w', encoding='utf-8').write(deriver(src, maj=True)); print('page écrite :', PAGE, '— aucun rendu'); return
    tmpdir = os.path.join(ICI, '..', '..', '.tmp-canon-1'); os.makedirs(tmpdir, exist_ok=True)
    # 1. contrôle de géométrie : isolation seule, polices système, contre le canon du 02/09
    g = rendre(deriver(src, maj=False), os.path.join(tmpdir, 'isolation-systeme.png'), polices_systeme=True)
    part, moy = ecart(g, Image.open(os.path.join(DEST, 'ecran-canon.png')).convert('RGB'))
    # le négatif : la même image décalée de 40 px en y doit s'écarter bien plus (sinon le contrôle ne voit pas la géométrie).
    # ⚠️ Mesuré le 2026-09-23 : un décalage de 12 px ne rend que 6,5 % sur cette image sombre et lisse — trop faible pour trancher ;
    #    40 px rend 13,4 %. Le résidu de 2,6 % de l'isolation juste est sur les BORDS DES TEXTES (l'anticrénelage de Chrome a bougé
    #    depuis le 02/09), vu sur la superposition : aucun dédoublement.
    decale = Image.new('RGB', g.size); decale.paste(g, (0, 40)); part_n, _ = ecart(decale, Image.open(os.path.join(DEST, 'ecran-canon.png')).convert('RGB'))
    print(f'géométrie : isolation seule (système) contre ecran-canon.png : {100 * part:.2f} % de pixels à > 64, écart moyen {moy:.2f} ; '
          f'négatif décalé de 40 px : {100 * part_n:.2f} %')
    if not (part < 0.05 and part_n > 3 * part):
        sys.exit('⛔ ISOLATION FAUSSE — rien livré')
    print('✅ isolation juste')
    # 2. la page de l'atelier, puis le canon propre en DejaVu
    page = deriver(src, maj=True); open(PAGE, 'w', encoding='utf-8').write(page)
    im = rendre(page, os.path.join(DEST, 'ecran-canon-propre.png'))
    part2, _ = ecart(im, g)
    print(f'canon propre : 1176×2091, DejaVu ; différence avec l\'isolation système : {100 * part2:.2f} % (polices + 15/16/17)')
    for f in os.listdir(tmpdir): os.remove(os.path.join(tmpdir, f))
    os.rmdir(tmpdir)

if __name__ == '__main__':
    main()
