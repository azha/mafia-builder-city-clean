#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""④ L'Accueil — l'OUVERTURE DE SESSION, en surimpression au-dessus de la ville (`front.md` §4 B, ruling user du 25/08), dans le
périmètre VALIDÉ par f2 le 2026-09-23 (`25-…` §2.1) : trois états — rien à trancher · une carte de tête · la file sous pression — avec
`hl_card`, `queue[0]`, `queue_pressure_band`, `backlog_badge` ; et, quand `hl_card` vaut `AUTONOMY_REPORTS_PENDING`, l'ENTRÉE du rapport.

Écrit `~/project/atelier3d-mafia/ecrans-brennar-accueil.html`, grammaire de la série 6 (tête, styles, scènes ; chrome à jour du cadre 131).
Chaque mot est une valeur servie (`accueil.*`, `decision.type.*`, `hl.option.*`, `chrome.bandeau.*`, `exceptions.*`) ou un mot d'une
maquette RATIFIÉE (« Portée · modérée », « Urgence · faible » : ⑤, série 4, cadres 4-8, ratifiés le 26/08) ; sinon PROPOSÉ, `class="prop"`.
Usage : python3 Tools/atelier-2026-09-22/generer-maquette-4-2026-09-23.py   (écrit la page ; aucun rendu)"""
import os, re
import importlib.util as _iu
_sp = _iu.spec_from_file_location('apos', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'apostrophes-maquettes-2026-09-23.py'))
_ap = _iu.module_from_spec(_sp); _sp.loader.exec_module(_ap)          # D10 : l'élision visible en ’ (apostrophes-maquettes-2026-09-23.py)
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
S6 = open(os.path.join(ATELIER, 'ecrans-brennar-6.html'), encoding='utf-8').read()
SORTIE = os.path.join(ATELIER, 'ecrans-brennar-accueil.html')
c0 = S6.index('<div class="cadre">')
tete = re.sub(r'<header class="bandeau">.*?</header>',
              '<header class="bandeau"><h1>Écrans de Brennar — ④ l\'Accueil, l\'ouverture de session</h1><p>Série 6 : la ville derrière, '
              'l\'ouverture posée dessus, puis on tombe sur la ville (front.md §4 B). Trois états et l\'entrée du rapport (périmètre validé le 23/09). '
              'Un mot souligné en pointillé est <b>proposé, non ratifié</b>. Atelier / DA, 2026-09-23.</p></header>', S6[:c0], count=1, flags=re.S)
i131 = [m.start() for m in re.finditer(r'<div class="cadre">', S6)][131]
barre = re.search(r'<div class="barre">.*?</div></div>(?=<div class="panneau">)', S6[i131:i131 + 4000], re.S).group(0)
DOCK = '<div class="dock9"><div class="db actif"><span class="rd"><span class="pt"></span></span>Empire</div><div class="db"><span class="rd"><small class="disc"></small><span class="pt"></span></span>Famille</div><div class="db"><span class="rd"><span class="pt"></span></span>Filière</div><div class="db"><span class="rd"><span class="pt"></span></span>Plus</div></div>'
SCENE = '<div class="scene district" style="background-position:center 50%;filter:brightness(.42)"></div><div class="voile-scene"></div>'

CSS = """<style>
/* ═══ ④ L'ACCUEIL — l'ouverture de session, verre sur la ville (atelier 2026-09-23) ═══ */
.acc4{position:relative;height:100%;display:flex;flex-direction:column;justify-content:flex-end;font-family:'DejaVu Sans',sans-serif;color:#eae0c8}
.acc4 *{box-sizing:border-box}
.acc4 .verre{margin:0 12px 10px;position:relative;border-radius:12px;padding:12px 14px 12px;background:linear-gradient(180deg,#0c1320ef,#080d17f6);
  border:1px solid #ffffff17;box-shadow:0 10px 26px #000c}
.acc4 .verre::after{content:"";position:absolute;left:14px;right:14px;top:0;height:1px;background:linear-gradient(90deg,transparent,#b08d3e 30%,#b08d3e 70%,transparent)}
.acc4 .sur{font:700 6.6px/1 'DejaVu Sans';letter-spacing:.28em;text-transform:uppercase;color:#b9ad92;text-align:center}
.acc4 .titre{font:400 16px/1.2 'DejaVu Serif';letter-spacing:.06em;color:#f2c96b;text-align:center;margin-top:6px;text-wrap:balance}
.acc4 .sous{font:400 9.2px/1.4 'DejaVu Sans';color:#b9ad92;text-align:center;margin-top:5px}
.acc4 .niveaux{display:flex;justify-content:center;gap:14px;margin-top:8px}
.acc4 .niveaux span{font:700 6.6px/1 'DejaVu Sans';letter-spacing:.2em;text-transform:uppercase;color:#b9ad92}
.acc4 .niveaux b{font:400 10px/1 'DejaVu Serif';color:#eae0c8;margin-left:5px;text-transform:none;letter-spacing:0}
.acc4 .gestes{display:flex;gap:8px;margin-top:11px}
.acc4 .g{flex:1;text-align:center;padding:9px 4px;border-radius:9px;font:700 9px/1 'DejaVu Sans';letter-spacing:.12em;text-transform:uppercase;
  background:#ffffff0a;color:#eae0c8;border:1px solid #ffffff2a}
.acc4 .g.or{background:linear-gradient(180deg,#e9c56b,#c99a37);color:#241804;border-color:#8a611c}
.acc4 .suivant{margin:0 12px 10px;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;background:rgba(11,17,27,.86);border:1px solid #2a3648}
.acc4 .suivant .qui{flex:1;font:400 9.6px/1.3 'DejaVu Sans';color:#eae0c8}
.acc4 .suivant .qui small{display:block;color:#b9ad92;font-size:7.6px;letter-spacing:.14em;text-transform:uppercase;margin-top:2px}
.acc4 .suivant .act{font:700 8.6px/1 'DejaVu Sans';letter-spacing:.14em;color:#f2c96b;text-transform:uppercase}
.acc4 .chip{display:inline-block;font:700 6.6px/1 'DejaVu Sans';letter-spacing:.16em;text-transform:uppercase;border:1px solid #e0664a;color:#e0664a;padding:2px 4px;margin-left:5px}
.acc4 .pression{display:flex;justify-content:center;align-items:baseline;gap:6px;margin-top:6px}
.acc4 .pression b{font:700 12px/1 'DejaVu Serif';color:#e0664a}
.acc4 .ville{margin:0 12px 6px;text-align:center;font:700 8px/1 'DejaVu Sans';letter-spacing:.24em;text-transform:uppercase;color:#b9ad92}
.acc4 .prop{text-decoration:underline dotted #b9ad92;text-underline-offset:2px}

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

def cadre(etiquette, contenu):
    return (f'<div class="cadre"><div class="etiquette">{etiquette}</div><div class="tel">{SCENE}<div class="ecran">{barre}'
            f'<div class="panneau"><div class="acc4" style="height:406px">{contenu}'
            f'</div></div>' + DOCK + '</div></div></div>\n')          # on sort en touchant la ville (front.md §4 B) : aucun mot

SUIVANT = ('<div class="suivant"><div class="qui">Lt. Quist attend vos ordres<small>grave</small></div>'
           '<span class="act">trancher</span></div>')
CADRES = [
    cadre('④ L\'ouverture — rien à trancher',
          '<div class="verre"><div class="titre">Rien à signaler</div><div class="sous">Aucune décision en attente · Aucune exception en attente</div>'
          '<div class="sous">Personne ne fait la queue — la routine tient</div></div>'),
    cadre('④ L\'ouverture — une carte de tête',
          '<div class="verre"><div class="titre">Un local à remettre en état</div>'
          '<div class="niveaux"><span>Portée<b>modérée</b></span><span>Urgence<b>faible</b></span></div>'
          # 45 (f2, 23/09) : les options servies (`hl.option.damaged_building.*`) sont DESCRIPTIVES — en TEXTE, jamais en boutons d'action ;
          # les deux seuls gestes réels sont commit (« Prendre acte », enregistre la décision de session) et skip (« Pas maintenant »)
          '<div class="sur prop" style="margin-top:10px">Ce qu’on peut faire</div>'
          '<div class="sous">Mettre en réparation · Laisser en l\'état</div>'
          '<div class="gestes"><div class="g or"><span class="prop">Prendre acte</span></div><div class="g"><span class="prop">Pas maintenant</span></div></div>'
          '<div class="sous prop" style="font-size:8px">prendre acte n’agit pas à votre place</div></div>' + SUIVANT),
    cadre('④ L\'ouverture — des rapports à lire (l\'entrée du rapport)',
          '<div class="verre"><div class="titre">Des rapports à lire</div>'
          '<div class="sous">Lt. Quist a un rapport pour vous</div>'
          '<div class="gestes"><div class="g or">Lire maintenant</div><div class="g">Laisser en attente</div></div></div>' + SUIVANT),
    cadre('④ L\'ouverture — la file sous pression',
          '<div class="verre"><div class="sur">Les exceptions</div><div class="pression"><b>saturée</b></div>'
          '<div class="titre">Plusieurs attendent encore</div>'
          '<div class="sous prop">d\'autres attendent au-delà de ce que la file montre</div></div>' + SUIVANT),
]
page = _ap.normaliser(tete + CSS + ''.join(CADRES) + '</div>\n</div>\n')[0]
open(SORTIE, 'w', encoding='utf-8').write(page)
assert page.count('<div class="cadre">') == 4
print(f'écrit : {SORTIE} — 4 cadres, {len(page)} octets ; aucun rendu')
