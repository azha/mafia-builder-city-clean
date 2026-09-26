#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""④ l'Accueil — le chrome COMMUN (barre du haut et dock) aligné sur la maquette HUD v3.1 (`hud-brennar.html`, tag hud-v3.1 5983267),
décision f2 du 26/09 (reco, D26) : le HUD fait foi sur TOUS les écrans ; filet or pleine largeur, losange sous le médaillon, typo de la
barre, taille du médaillon et du dock. Le contenu propre à ④ (acc4, verre, suite, file) n'est pas touché.
Échelle : le téléphone du HUD fait 392 px de large, celui de ④ 300 px ⇒ chaque mesure du canon × 300/392 (arrondie au dixième), pour que
le rendu à 3,6× (1080 px) tombe sur les mêmes pixels que le canon rendu à 1080 px.
Écrit un bloc de style balisé (DÉBUT/FIN) juste après le bloc du dock ; il est réécrit, jamais doublé. Usage : [--controle | --ecrire]"""
import os, re, sys
PAGE = os.path.expanduser('~/project/atelier3d-mafia/ecrans-brennar-accueil.html')
ANCRE = '.dock9 .disc{position:absolute;top:-2px;right:-2px;width:8px;height:8px;border-radius:50%;background:#d9ab4e;border:1.5px solid #0a0f17}\n'
DEBUT, FIN = '/* ═══ DÉBUT chrome HUD v3.1', '/* ═══ FIN chrome HUD v3.1 ═══ */\n'
K = 300 / 392
def e(px): return f'{round(px * K, 1):g}px'

CSS = f"""{DEBUT} (hud-brennar.html @ hud-v3.1, × 300/392) — décision f2 du 26/09 : le HUD fait foi pour la barre et le dock ═══ */
/* la barre unique : verre fumé, filet laiton PLEINE largeur (canon .barre::after), items centrés */
.barre{{height:{e(52)};padding:0 {e(16)};align-items:center;background:linear-gradient(180deg,#0b111be8,#0d131ed8);backdrop-filter:blur(5px)}}
.barre::after{{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,transparent,var(--laiton) 18%,var(--laiton) 82%,transparent)}}
.aile .lib{{font-size:{e(8.5)};letter-spacing:.22em}}
.aile .val{{font-size:{e(17)};letter-spacing:.02em;font-variant-numeric:tabular-nums}}
/* le médaillon (canon .medaillon 64 px, top 7) et son losange (canon .medaillon .losange 7 px, bottom -11) */
.mano{{top:{e(7)};width:{e(64)};height:{e(64)};border-width:1.5px;box-shadow:inset 0 1px 2px #ffffff2a,inset 0 -4px 8px #0009,0 6px 14px #000c}}
.mano::after{{content:"";position:absolute;bottom:-{e(11)};left:50%;transform:translateX(-50%) rotate(45deg);width:{e(7)};height:{e(7)};background:var(--laiton);box-shadow:0 0 0 1px #0009}}
.mano svg{{width:{e(44)};height:{e(28)}}}
.mano .val{{font-size:{e(13)}}}
.mano .lib{{font-size:{e(7)};letter-spacing:.22em}}
/* le dock (canon .dock / .dockb) */
.dock9{{gap:{e(22)};padding:{e(10)} 0 {e(16)}}}
.dock9 .db{{gap:{e(5)};font-size:{e(8.5)}}}
.dock9 .rd{{width:{e(46)};height:{e(46)}}}
.dock9 .pt{{bottom:-{e(4)};width:{e(14)}}}
.dock9 .disc{{width:{e(8)};height:{e(8)}}}
{FIN}"""

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    s = open(PAGE, encoding='utf-8').read()
    if s.count(ANCRE) != 1: print('⛔ ancre du dock'); return 1
    t = s
    if DEBUT in t:
        a = t.index(DEBUT); b = t.index(FIN, a) + len(FIN); t = t[:a] + t[b:]
    t = t.replace(ANCRE, ANCRE + CSS, 1)
    cadres = t.count('<div class="cadre">')
    comptes = {'cadres': cadres, 'barres': t.count('<div class="barre">'), 'médaillons': t.count('<div class="mano">'),
               'docks': t.count('<div class="dock9">'), 'blocs chrome': t.count(DEBUT),
               'hors style inchangé': re.sub(r'<style>.*?</style>', '', t, flags=re.S) == re.sub(r'<style>.*?</style>', '', s, flags=re.S)}
    print(comptes)
    if comptes != {'cadres': 5, 'barres': 5, 'médaillons': 5, 'docks': 5, 'blocs chrome': 1, 'hors style inchangé': True}:
        print('⛔ comptes'); return 1
    if t == s: print('déjà écrite (identique)'); return 0
    print('écrite' if mode == '--ecrire' else 'à écrire')
    if mode == '--ecrire': open(PAGE, 'w', encoding='utf-8').write(t)
    return 0

if __name__ == '__main__':
    sys.exit(main())
