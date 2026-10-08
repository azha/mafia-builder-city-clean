#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""㉕ La première fois (le tutoriel) — une maquette autour des données SERVIES (commande f2 du 23/09 : le premier écran d'un joueur neuf,
0 source dessinée dans la seule maquette existante, série 2 cadres 31-32).
Écrit `~/project/atelier3d-mafia/ecrans-brennar-25-tutoriel.html`, grammaire de la série 6 (tête, styles, scènes ; chrome du cadre 131 ;
dock du canon HUD comme ⑦ et ④). Chaque texte de bulle est une valeur SERVIE (`tutorial.*`, back `d8e41362`) ; chaque autre mot est un
littéral du client (`TutorialScreenController.cs`, aucune clé) ou neuf — marqué `class="prop"`. Le heurt du servi (« Lt. Hara » en dur)
est marqué `class="heurt"`. L'ordre : `33-maquette-25-tutoriel.md` §1 (lu dans le back, pas supposé).
Usage : python3 Tools/atelier-2026-09-22/generer-maquette-25-2026-09-23.py   (écrit la page ; aucun rendu)"""
import os, re
import importlib.util as _iu
_sp = _iu.spec_from_file_location('apos', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'apostrophes-maquettes-2026-09-23.py'))
_ap = _iu.module_from_spec(_sp); _sp.loader.exec_module(_ap)          # D10 : l'élision visible en ’ (apostrophes-maquettes-2026-09-23.py)
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
S6 = open(os.path.join(ATELIER, 'ecrans-brennar-6.html'), encoding='utf-8').read()
SORTIE = os.path.join(ATELIER, 'ecrans-brennar-25-tutoriel.html')
c0 = S6.index('<div class="cadre">')
tete = re.sub(r'<header class="bandeau">.*?</header>',
              '<header class="bandeau"><h1>Écrans de Brennar — ㉕ la première fois (le tutoriel)</h1><p>Série 6 : la ville derrière, la bulle posée dessus. '
              'Le texte de chaque bulle est une valeur SERVIE (<code>tutorial.*</code>) ; l\'ordre est celui du back (<code>next_tutorial_id</code>). '
              'Un mot souligné en pointillé est <b>proposé, non ratifié</b> ; souligné en rouge : un <b>heurt</b> du servi. Atelier / DA, 2026-09-23.</p></header>', S6[:c0], count=1, flags=re.S)
i131 = [m.start() for m in re.finditer(r'<div class="cadre">', S6)][131]
barre = re.search(r'<div class="barre">.*?</div></div>(?=<div class="panneau">)', S6[i131:i131 + 4000], re.S).group(0)
DOCK = '<div class="dock9"><div class="db actif"><span class="rd"><span class="pt"></span></span>Empire</div><div class="db"><span class="rd"><small class="disc"></small><span class="pt"></span></span>Famille</div><div class="db"><span class="rd"><span class="pt"></span></span>Filière</div><div class="db"><span class="rd"><span class="pt"></span></span>Plus</div></div>'
SCENE = '<div class="scene district" style="background-position:center 50%;filter:brightness(.42)"></div><div class="voile-scene"></div>'

DOCK_PLUS = DOCK.replace('<div class="db actif">', '<div class="db">', 1).replace(
    '<div class="db"><span class="rd"><span class="pt"></span></span>Plus</div>', '<div class="db actif"><span class="rd"><span class="pt"></span></span>Plus</div>')

# les textes SERVIS, lus au back (jamais recopiés à la main) — FR_MESSAGES par son nom
import subprocess
_st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'],
                     capture_output=True, text=True).stdout
_d = _st.index('export const FR_MESSAGES'); _t = _st[_d:_st.index('\n};', _d)]
def servi(cle):
    m = re.search(r"'" + re.escape(cle) + r"':\s*\n?\s*'((?:[^'\\]|\\.)*)'", _t)
    assert m, f'{cle} non servie'
    return m.group(1).replace("\\'", "'")
T_VIDE = servi('tutorial.queue_runs_dry')
T_CARTE = servi('tutorial.exception_card.onboarding_preseed')
assert T_CARTE == servi('onboarding.preseed_exception.card'), 'le texte du tutoriel ne double plus la carte : relire 33 §4'
T_CARTE_H = T_CARTE.replace('Lt. Hara', '<span class="heurt">Lt. Hara</span>', 1)

CSS = """<style>
/* ═══ ㉕ LA PREMIÈRE FOIS — la bulle sur la ville (atelier 2026-09-23) ═══ */
/* ⚠️ classes suffixées 25 : la tête de la série 6 définit déjà .page (max-width:1380px) et .texte (opacity:.7) — payé au premier rendu */
.tu25{position:relative;height:100%;display:flex;flex-direction:column;justify-content:flex-end;font-family:'DejaVu Sans',sans-serif;color:#eae0c8}
.tu25 *{box-sizing:border-box}
.tu25 .bulle{margin:0 14px 12px;position:relative;border-radius:12px;padding:13px 14px 12px;background:linear-gradient(180deg,#0c1320f2,#080d17f8);
  border:1px solid #b08d3e88;box-shadow:0 10px 26px #000c}
.tu25 .bulle::before{content:"";position:absolute;left:50%;top:-7px;width:12px;height:12px;transform:translateX(-50%) rotate(45deg);
  background:#0c1320;border-left:1px solid #b08d3e88;border-top:1px solid #b08d3e88}
.tu25 .sur{font:700 6.6px/1 'DejaVu Sans';letter-spacing:.28em;text-transform:uppercase;color:#b9ad92;text-align:center}
.tu25 .tx25{font:400 12px/1.45 'DejaVu Serif';color:#f0e6cc;text-align:center;margin-top:8px;text-wrap:pretty}
.tu25 .gestes{display:flex;gap:8px;margin-top:12px}
.tu25 .g{flex:1;text-align:center;padding:9px 4px;border-radius:9px;font:700 8.4px/1.2 'DejaVu Sans';letter-spacing:.1em;text-transform:uppercase;
  background:#ffffff0a;color:#eae0c8;border:1px solid #ffffff2a}
.tu25 .g.or{background:linear-gradient(180deg,#e9c56b,#c99a37);color:#241804;border-color:#8a611c}
.tu25 .cible{margin:0 auto 8px;width:62%;height:54px;border-radius:9px;border:1.5px dashed #b08d3e;background:#b08d3e14}
.tu25 .pg25{margin:0 12px 10px;border-radius:12px;padding:14px;background:rgba(11,17,27,.9);border:1px solid #2a3648}
.tu25 .pg25 h3{margin:0;font:400 15px/1.2 'DejaVu Serif';color:#f2c96b;letter-spacing:.05em;text-align:center}
.tu25 .inter{display:flex;align-items:center;gap:10px;margin-top:14px;padding:10px 11px;border-radius:9px;background:#ffffff08;border:1px solid #ffffff1c}
.tu25 .inter span{flex:1;font:400 10px/1.35 'DejaVu Sans';color:#eae0c8}
.tu25 .inter b{font-weight:400;font-family:'DejaVu Serif';font-size:11px}.tu25 .inter small{color:#b9ad92;font-size:8px}
.tu25 .bascule{width:38px;height:21px;border-radius:11px;position:relative;background:#3a4454;border:1px solid #ffffff2a;flex:none}
.tu25 .bascule::after{content:"";position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:#b9ad92}
.tu25 .bascule.on{background:linear-gradient(180deg,#e9c56b,#c99a37);border-color:#8a611c}
.tu25 .bascule.on::after{left:19px;background:#241804}
.tu25 .fens{display:flex;justify-content:center;gap:22px;margin-top:12px}
.tu25 .fens div{text-align:center}.tu25 .fens b{display:block;font:400 18px/1 'DejaVu Serif';color:#eae0c8}
.tu25 .fens span{font:700 6.6px/1 'DejaVu Sans';letter-spacing:.2em;text-transform:uppercase;color:#b9ad92}
.tu25 .suite{margin-top:12px;padding-top:10px;border-top:1px solid #ffffff14}
.tu25 .suite .tx25{font-size:10.5px;margin-top:6px}
.tu25 .calme{font:400 10.5px/1.45 'DejaVu Serif';color:#b9ad92;text-align:center;margin-top:12px}
.tu25 .prop{text-decoration:underline dotted #b9ad92;text-underline-offset:2px}
.tu25 .heurt{text-decoration:underline wavy #e0664a;text-underline-offset:2px}
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

def cadre(etiquette, contenu, dock=DOCK):
    return (f'<div class="cadre"><div class="etiquette">{etiquette}</div><div class="tel">{SCENE}<div class="ecran">{barre}'
            f'<div class="panneau"><div class="tu25" style="height:406px">{contenu}'
            f'</div></div>' + dock + '</div></div></div>\n')

# D14 : « Compris » est le mot RATIFIÉ (série 2 cadre 31, ratifiée par délégation le 02/09) — il l'emporte sur « J'AI COMPRIS » du client.
# « Ne plus rien me montrer » (client) reste PROPOSÉ : la série 2 ratifiée n'a qu'un geste ; le refus au même rang est l'exigence du client (l.22-24).
GESTES = ('<div class="gestes"><div class="g or">Compris</div>'
          '<div class="g"><span class="prop">Ne plus rien me montrer</span></div></div>')
def bulle(texte, cible=False):
    return (('<div class="cible"></div>' if cible else '') +
            f'<div class="bulle"><div class="sur prop">la première fois</div><div class="tx25">{texte}</div>{GESTES}</div>')
def page(bascule_on, corps):
    return (f'<div class="pg25"><h3 class="prop">La première fois</h3>'
            # D14 : le libellé RATIFIÉ de la bascule (Profil / réglages, série 6 cadres 95-96, ratifiée par délégation) — dans le sens du joueur
            f'<div class="inter"><span><b>On vous explique encore</b><br><small>décochez le jour où vous n’avez plus besoin qu’on vous tienne la main</small></span>'
            f'<div class="bascule{" on" if bascule_on else ""}"></div></div>'
            f'{corps}</div>')

CADRES = [
    cadre('㉕ 1ʳᵉ session, à l’ouverture — la carte préparée (<code>eligible_tutorial_ids</code>)', bulle(T_CARTE_H, cible=True)),
    cadre('㉕ 1ʳᵉ session, la file vidée — <code>next_tutorial_id</code> = queue_runs_dry', bulle(T_VIDE)),
    cadre('㉕ 2ᵉ session, depuis Plus — la page « la première fois »',
          page(True, '<div class="fens"><div><b>02</b><span class="prop">vues</span></div><div><b>01</b><span class="prop">à venir</span></div></div>'
                     f'<div class="suite"><div class="sur prop">à découvrir</div><div class="tx25">{servi("tutorial.cue_stack_intro")}</div>'
                     '<div class="gestes"><div class="g or">Compris</div></div></div>'), DOCK_PLUS),
    cadre('㉕ Le refus — <code>tutorials_opt_out</code> = vrai (la bascule dit l’inverse de la clé)',
          page(False, '<div class="calme prop">Vous avez demandé qu’on vous laisse tranquille.</div>'), DOCK_PLUS),
]
page_html = _ap.normaliser(tete + CSS + ''.join(CADRES) + '</div>\n</div>\n')[0]
open(SORTIE, 'w', encoding='utf-8').write(page_html)
assert page_html.count('<div class="cadre">') == 4
print(f'écrit : {SORTIE} — 4 cadres, {len(page_html)} octets ; aucun rendu')
