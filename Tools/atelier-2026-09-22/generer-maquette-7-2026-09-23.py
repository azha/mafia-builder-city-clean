#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""⑦ La fiche du lieutenant — une maquette AUTOUR DES DONNÉES SERVIES (ARBITRAGES 07/09 point 19 ; commande f2 du 2026-09-23).

Écrit `~/project/atelier3d-mafia/ecrans-brennar-7-lieutenant.html`, dans la grammaire de la série 6 (v3.3 « un écran une matière » :
la matière du lieutenant est la FICHE D'IDENTITÉ, `front.md` §4 L) : la tête de la série 6 (styles de base, scènes, silhouettes — dont
`#buste-lieutenant`, la capuche décidée le 02/09) et le chrome à jour (cadre 131 : « 24 850 € », « Tiède / CHALEUR »).
Chaque valeur affichée est une valeur SERVIE (`GET /v1/lieutenants/{id}`, corps réel du 22/09 — Lt. Quist) ou un état de son domaine ;
chaque MOT est une clé servie (`famille.*`, `revue.chip.*`) ou, s'il n'en existe pas, un mot PROPOSÉ, marqué `class="prop"` (souligné
pointillé) et sourcé dans `26-…`. Trois cadres :
  0 · la fiche (nominal) — les 14 champs que le client lit ;
  1 · le signal dérive — `drift_phase` (servi, non lu) et ses 3 décisions (`POST …/signal-drift/decision`) ;
  2 · en faire la règle ? — `standing_order` (servi, non lu) et ses 3 décisions (`POST …/standing-order/decision`).
Non dessinés (aucune décision du joueur sur ⑦) : `trust_budget_bucket`, `flag_frequency_band` — listés dans `26-…`.
Usage : python3 Tools/atelier-2026-09-22/generer-maquette-7-2026-09-23.py   (écrit la page ; aucun rendu)"""
import os, re, sys
import importlib.util as _iu
_sp = _iu.spec_from_file_location('apos', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'apostrophes-maquettes-2026-09-23.py'))
_ap = _iu.module_from_spec(_sp); _sp.loader.exec_module(_ap)          # D10 : l'élision visible en ’ (apostrophes-maquettes-2026-09-23.py)
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
S6 = open(os.path.join(ATELIER, 'ecrans-brennar-6.html'), encoding='utf-8').read()
SORTIE = os.path.join(ATELIER, 'ecrans-brennar-7-lieutenant.html')

c0 = S6.index('<div class="cadre">')
tete = S6[:c0]                                             # styles, scènes, silhouettes, <div class="page">, en-tête, <div class="rangee">
assert 'id="buste-lieutenant"' in tete, 'la silhouette à capuche doit être dans la tête de la série 6'
tete = re.sub(r'<header class="bandeau">.*?</header>',
              '<header class="bandeau"><h1>Écrans de Brennar — ⑦ la fiche du lieutenant</h1><p>Série 6, matière « fiche d\'identité » (v3.3). '
              'Chaque valeur est servie par <code>GET /v1/lieutenants/{id}</code> ; un mot souligné en pointillé est <b>proposé, non ratifié</b> '
              '(aucune clé servie). Atelier / DA, 2026-09-23.</p></header>', tete, count=1, flags=re.S)
i131 = [m.start() for m in re.finditer(r'<div class="cadre">', S6)][131]
barre = re.search(r'<div class="barre">.*?</div></div>(?=<div class="panneau">)', S6[i131:i131 + 4000], re.S).group(0)
assert '24 850 €' in barre and 'CHALEUR' in barre, 'le chrome du cadre 131 doit être à jour (points 10, 11, 19)'
DOCK = '<div class="dock9"><div class="db"><span class="rd"><span class="pt"></span></span>Empire</div><div class="db actif"><span class="rd"><small class="disc"></small><span class="pt"></span></span>Famille</div><div class="db"><span class="rd"><span class="pt"></span></span>Filière</div><div class="db"><span class="rd"><span class="pt"></span></span>Plus</div></div>'
SCENE = '<div class="scene district" style="background-position:center 50%;filter:brightness(.24)"></div><div class="voile-scene"></div>'

CSS = """<style>
/* ═══ ⑦ LA FICHE DU LIEUTENANT — matière : la fiche d'identité (atelier 2026-09-23) ═══ */
.fid7{position:relative;height:100%;display:flex;flex-direction:column;overflow:hidden;font-family:'DejaVu Sans',sans-serif;color:#eae0c8;
  background:radial-gradient(72% 40% at 50% 20%,rgba(217,171,78,.12),rgba(0,0,0,0) 66%),linear-gradient(178deg,#111823 0%,#0b1016 60%,#0d0f10 100%)}
.fid7 *{box-sizing:border-box}
.fid7 .cerne{position:absolute;inset:5px;border:1px solid #b08d3e;border-radius:3px;box-shadow:inset 0 0 0 1px #0b1016;pointer-events:none;z-index:6}
.fid7 .carte{margin:12px 12px 0;position:relative;z-index:2;background:linear-gradient(176deg,#efe6cf,#e2d6b8);color:#2a2418;border-radius:3px;
  box-shadow:0 6px 16px #000a,inset 0 0 0 1px #c9b98f;padding:9px 10px 8px;display:flex;gap:9px}
.fid7 .photo{flex:none;width:58px;height:70px;background:#1b2230;border:2px solid #b08d3e;display:flex;align-items:flex-end;justify-content:center}
.fid7 .photo svg{width:52px;height:52px}
.fid7 .photo .buste-t{fill:#b9ad92}
.fid7 .ident b{display:block;font:700 15px/1.05 'DejaVu Serif';letter-spacing:.04em}
.fid7 .ident i{display:block;font:700 6.6px/1 'DejaVu Sans';font-style:normal;letter-spacing:.26em;text-transform:uppercase;color:#6b5b3c;margin-top:5px}
.fid7 .ident .etat{display:inline-block;margin-top:7px;font:700 7px/1 'DejaVu Sans';letter-spacing:.18em;text-transform:uppercase;
  border:1px solid #6b5b3c;padding:3px 5px;color:#4a3f2a}
.fid7 .tampon{position:absolute;right:9px;top:8px;transform:rotate(-8deg);font:700 7.2px/1 'DejaVu Sans';letter-spacing:.16em;
  color:#9b2c1f;border:1.5px solid #9b2c1f;padding:3px 5px;opacity:.85;text-transform:uppercase}
.fid7 .lignes{margin:9px 12px 0;position:relative;z-index:2;background:rgba(11,17,27,.88);border:1px solid #2a3648;padding:4px 9px}
.fid7 .l{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:3.5px 0;border-bottom:1px solid #ffffff10}
.fid7 .l:last-child{border-bottom:none}
.fid7 .l span{font:700 6.6px/1 'DejaVu Sans';letter-spacing:.2em;text-transform:uppercase;color:#b9ad92}
.fid7 .l b{font:400 11px/1.1 'DejaVu Serif';color:#eae0c8;text-align:right}
.fid7 .l b.or{color:#f2c96b}.fid7 .l b.braise{color:#e0664a}
.fid7 .l.vif{background:linear-gradient(90deg,rgba(224,102,74,.14),rgba(224,102,74,0));margin:0 -9px;padding:5px 9px}
.fid7 .auto{margin:9px 12px 0;position:relative;z-index:2}
.fid7 .auto i{display:block;font:700 6.4px/1 'DejaVu Sans';font-style:normal;letter-spacing:.3em;color:#b9ad92;text-transform:uppercase;margin-bottom:5px}
.fid7 .cat{display:flex;justify-content:space-between;font:400 9.4px/1.5 'DejaVu Sans';color:#cfc4a8}
.fid7 .cat em{font-style:normal;font-family:'DejaVu Serif';color:#eae0c8}
.fid7 .question{margin:10px 12px 0;position:relative;z-index:2;border-left:2px solid #d9ab4e;padding:5px 9px;background:rgba(217,171,78,.07)}
.fid7 .question b{display:block;font:700 12px/1.2 'DejaVu Serif';color:#f2c96b}
.fid7 .question small{display:block;font:400 8.6px/1.4 'DejaVu Sans';color:#b9ad92;margin-top:3px}
.fid7 .gestes{margin-top:auto;padding:8px 12px 10px;position:relative;z-index:2;display:flex;flex-direction:column;gap:6px}
.fid7 .g{text-align:center;font:700 9px/1 'DejaVu Sans';letter-spacing:.16em;text-transform:uppercase;padding:7px 6px;border-radius:3px;
  border:1px solid #ffffff2a;color:#eae0c8;background:#ffffff0a}
.fid7 .g.or{background:linear-gradient(180deg,#e9c56b,#c99a37);color:#241804;border-color:#8a611c}
.fid7 .g small{display:block;font:400 7.4px/1.3 'DejaVu Sans';letter-spacing:.02em;text-transform:none;opacity:.8;margin-top:3px}
.fid7 .reperes{display:flex;flex-wrap:wrap;gap:4px;justify-content:center}
.fid7 .reperes span{font:400 7px/1 'DejaVu Sans';border:1px solid #2a3648;padding:2px 4px;color:#b9ad92}
.fid7 .prop{text-decoration:underline dotted #b9ad92;text-underline-offset:2px}

/* le dock du canon HUD (hud-brennar.html l.106-117), ronds VIDES (ARBITRAGES point 15) — la série 6 n'en dessine aucun (0 sur 146 cadres) ;
   ⑦ et ④ sont des onglets de l'application, il y figure */
.dock9{display:flex;justify-content:center;gap:22px;padding:8px 0 10px;background:linear-gradient(180deg,transparent,#070b12d8 40%)}
.dock9 .db{display:flex;flex-direction:column;align-items:center;gap:5px;color:#b9ad92;font:400 8.5px/1 'DejaVu Sans';letter-spacing:.16em;text-transform:uppercase}
.dock9 .rd{width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 38% 30%,#1d2635,#0d1420 65%);border:1px solid #ffffff22;
  box-shadow:inset 0 1px 0 #ffffff1c,0 4px 10px #000a;position:relative}
.dock9 .pt{position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:14px;height:2px;background:#b08d3e;border-radius:1px;opacity:0}
.dock9 .actif .pt{opacity:1}
.dock9 .disc{position:absolute;top:-2px;right:-2px;width:8px;height:8px;border-radius:50%;background:#d9ab4e;border:1.5px solid #0a0f17}
</style>
"""

def carte(etat, tampon=''):
    return (f'<div class="carte"><div class="photo"><svg viewBox="0 0 32 32"><use href="#buste-lieutenant"/></svg></div>'
            f'<div class="ident"><b>Lt. Quist</b><i>Cuisinier · Exécutant · Délégué</i><span class="etat">{etat}</span></div>{tampon}</div>')

def lignes(signal, ordre, vif=None):
    L = [('Ancienneté', '<span class="prop">nouveau venu</span>', ''), ('Règles', 'Aucune règle', ''),
         ('Coût de réécriture', 'Réécrire coûte peu', ''), ('Gain de rendement', 'Aucun gain de rendement', ''),
         ('Stabilisation après transfert', "S'installe vite", ''), ('<span class="prop">Signal</span>', signal, 'braise' if vif == 'signal' else ''),
         ('<span class="prop">Ordre permanent</span>', ordre, 'or' if vif == 'ordre' else '')]
    return '<div class="lignes">' + ''.join(
        f'<div class="l{" vif" if (vif == "signal" and "Signal" in a) or (vif == "ordre" and "Ordre permanent" in a) else ""}">'
        f'<span>{a}</span><b class="{c}">{v}</b></div>' for a, v, c in L) + '</div>'

AUTONOMIE = ('<div class="auto"><i class="prop">Autonomie</i>'
             '<div class="cat"><span>Opérations de production</span><em>Épuisé</em></div>'
             '<div class="cat"><span>Flux de blanchiment</span><em>Normal</em></div>'
             '<div class="cat"><span>Routage logistique</span><em>Plein</em></div></div>')

def cadre(etiquette, contenu):
    return (f'<div class="cadre"><div class="etiquette">{etiquette}</div><div class="tel">{SCENE}<div class="ecran">{barre}'
            f'<div class="panneau"><div class="fid7" style="height:406px"><div class="cerne"></div>{contenu}</div></div>' + DOCK + '</div></div></div>\n')

CADRES = [
    cadre('⑦ La fiche — ce que le back sert',
          carte('Au repos') + lignes('<span class="prop">à l’écoute</span>', '<span class="prop">aucun ordre</span>') + AUTONOMIE +
          '<div class="gestes"><div class="g or">Réaffecter…</div>'
          '<div class="g">+ Ajouter une règle</div></div>'),
    cadre('⑦ Le signal dérive — trois façons de le recaler',
          carte('Actif', '<span class="tampon prop">dérive</span>') +
          lignes('<span class="prop">dérive</span>', '<span class="prop">aucun ordre</span>', vif='signal') +
          '<div class="question"><b class="prop">Il écoute autre chose que vos ordres</b></div>'
          '<div class="gestes"><div class="g or"><span class="prop">Rappeler l’ordre direct</span></div>'
          '<div class="g"><span class="prop">Remettre l’écoute à zéro</span></div>'
          '<div class="g"><span class="prop">Brouiller un repère</span><small><span class="prop">ce qu’il écoute à la place :</span></small></div>'
          '<div class="reperes"><span class="prop">l’état du terrain</span><span class="prop">ce qu’il reste</span>'
          '<span class="prop">l’heure</span><span class="prop">ce que font les autres</span></div></div>'),
    cadre('⑦ L’ordre permanent expire — en faire la règle ?',
          carte('Actif') + lignes('<span class="prop">à l’écoute</span>', '<span class="prop">expire bientôt</span>', vif='ordre') +
          '<div class="question"><b class="prop">En faire la règle ?</b>'
          '<small class="prop">Son ordre du moment a tenu. Vous pouvez le renouveler, le retirer, ou en faire sa règle par défaut.</small></div>'
          '<div class="gestes"><div class="g or"><span class="prop">En faire la règle</span></div>'
          '<div class="g"><span class="prop">Renouveler</span></div><div class="g"><span class="prop">Retirer</span></div></div>'),
]

page = _ap.normaliser(tete + CSS + ''.join(CADRES) + '</div>\n</div>\n')[0]
open(SORTIE, 'w', encoding='utf-8').write(page)
n = page.count('<div class="cadre">')
assert n == 3 and page.count('#buste-lieutenant') >= 3 + 1, (n, page.count('#buste-lieutenant'))
print(f'écrit : {SORTIE} — {n} cadres, {len(page)} octets ; aucun rendu')
