#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Lot E — égalité d'ENSEMBLES entre les clés de bande que le client dérive et celles que le back a posées.

Le client dérive `domaine.role.slug(valeurServie)` par `Libelle.ParValeur(domaine, role, "VALEUR", "repli")`
(ou l'aide `Bande("role", "VALEUR", "repli")` de ②, domaine `building`). Ce script lit ces sites dans la SOURCE
(la valeur servie y est écrite en littéral, sous son `case`) et compare l'ensemble obtenu aux clés du back, lues dans
`string_table.ts` (FR_MESSAGES, EN_MESSAGES) au SHA back DONNÉ, pour les FAMILLES de bandes du lot E (`FAMILLES`).
Il vérifie aussi que chaque REPLI est le texte FR du back pour sa clé (le repli s'affiche tant que la clé
n'est pas servie ; il doit dire la même chose que ce qui la remplacera).

⛔ Plus d'instantané figé (2026-09-23, arbitrage de l'orchestrateur) : l'instantané `cles-bandes-ea215ce9.json` rougissait à
chaque lot de mots du back (8 clés servies après ea215ce9, que 10d32c75 demande). C'est l'instrument qui mentait. Le SHA lu
est imprimé en tête.

Usage : python3 cles-bandes.py [--back <sha>] [--depot <chemin du back>]   — RC 0 si égalité, 1 sinon.
        python3 cles-bandes.py --controle   — contrôle positif : relu à ea215ce9, l'ensemble du back ÉGALE l'instantané
                                               figé (73 clés, fr et en), et l'écart connu du client (8 clés) y reste ROUGE.
"""
import json, os, pathlib, re, subprocess, sys, unicodedata
R = pathlib.Path(__file__).resolve().parents[3]
def slug(s):
    o = []
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o.append(c.lower())
        elif o and o[-1] != '_': o.append('_')
    return ''.join(o).strip('_')
# ⛔ ÉCARTS DÉCLARÉS — une décision PRISE après l'instantané, que le back n'a pas encore appliquée. Chacun porte sa
#    référence ; le script les compte À PART (jamais comme égaux), et rougit si le repli client diffère de la décision.
DECLARES = {
    'building.type.money_holding': ('Banque', "atelier d4 (`04-libelles-anglais.md` bf763494, instrument e3e007cc) : money_holding = « la banque », "
                                              "même clé, valeur remplacée au back par f7 (« Caisse » à ea215ce9)"),
    'building.yield.idle': ('rien ne rentre', "atelier d3 (bf763494) : YieldLabel IDLE ; la clé est servie « Idle » en fr ET en en à ea215ce9"),
    'building.yield.earning': ('ça rapporte', "atelier d3 (bf763494) : YieldLabel EARNING ; la clé est servie « Earning » en fr ET en en à ea215ce9"),
}
arg = lambda n, d: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
DEPOT = os.path.expanduser(arg('--depot', '~/project/mafia-clean-city'))
CONTROLE = '--controle' in sys.argv
REV = arg('--back', 'ea215ce9' if CONTROLE else 'HEAD')
sha = subprocess.run(['git', '-C', DEPOT, 'rev-parse', '--short', REV], capture_output=True, text=True).stdout.strip()
if not sha: sys.exit(f"⛔ SHA back introuvable : {REV} dans {DEPOT}")
st = subprocess.run(['git', '-C', DEPOT, 'show', f'{sha}:services/game-back/src/i18n/string_table.ts'],
                    capture_output=True, text=True).stdout
if not st: sys.exit(f"⛔ string_table.ts illisible à {sha}")
# Les familles de bandes du lot E (17 posées par f7, + `building.yield`), celles de l'ancien instantané, lues une fois.
FAMILLES = ('building.appointment', 'building.capacity', 'building.grow_stage', 'building.held', 'building.hub_tier',
            'building.husbandry', 'building.lab_tier', 'building.money_holding_tier', 'building.payout', 'building.precursor',
            'building.purity', 'building.repair_cost', 'building.roster', 'building.seized_amount', 'building.type',
            'building.vehicle', 'building.yield', 'exceptions.queue_pressure')
def registre(nom):
    """Les paires clé → valeur d'un registre de `string_table.ts` (lecteur de l'atelier, `balayage-mots-serie6`)."""
    d = st.index(nom); t = st[d:st.index('\n};', d)]
    out = {}
    for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*(?:'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\")", t, re.M):
        out[m.group(1)] = (m.group(2) if m.group(2) is not None else m.group(3)).replace("\\'", "'")
    return out
FR, EN = registre('FR_MESSAGES'), registre('EN_MESSAGES')
de_famille = lambda k: k.rsplit('.', 1)[0] in FAMILLES
back = {k: {'fr': FR.get(k), 'en': EN.get(k)} for k in sorted(set(FR) | set(EN)) if de_famille(k)}
print(f"back lu : {DEPOT} @ {sha} (string_table.ts, FR {len(FR)} · EN {len(EN)} clés)")
if CONTROLE:
    inst = json.load(open(pathlib.Path(__file__).with_name('cles-bandes-ea215ce9.json')))['cles']
    ok = back == inst
    print(f"contrôle positif : relu à {sha}, {len(back)} clés ; égal à l'instantané figé ({len(inst)}) : {ok}")
    if not ok:
        for k in sorted(set(back) ^ set(inst)): print("  ⛔ écart d'ensemble :", k)
        for k in sorted(set(back) & set(inst)):
            if back[k] != inst[k]: print(f"  ⛔ valeur : {k} lu={back[k]} instantané={inst[k]}")
        sys.exit(1)
client = {}
SITES = [('Assets/Scripts/Operational/BuildingCard/BuildingCardController.cs', re.compile(r'Bande\("([a-z_]+)", "([^"]+)", "((?:[^"\\]|\\.)*)"\)'), 'building'),
         ('Assets/Scripts/Shell/HomeChromeController.cs', re.compile(r'Libelle\.ParValeur\("([a-z_]+)", "([a-z_]+)", "([^"]+)", "((?:[^"\\]|\\.)*)"\)'), None)]
for f, rx, dom in SITES:
    for m in rx.finditer((R / f).read_text(encoding='utf-8')):
        d, role, val, repli = (dom, *m.groups()) if dom else m.groups()
        client[f'{d}.{role}.{slug(val)}'] = (repli, f.split('/')[-1])
manquantes = sorted(set(back) - set(client)); en_trop = sorted(set(client) - set(back))
replis_faux = sorted(k for k in set(back) & set(client) if client[k][0] != back[k].get('fr')
                     and not (k in DECLARES and client[k][0] == DECLARES[k][0]))
declares_vus = sorted(k for k in DECLARES if k in client and client[k][0] == DECLARES[k][0] and client[k][0] != back[k].get('fr'))
print(f"back @ {sha} {len(back)} · client {len(client)} · égalité : {not manquantes and not en_trop}")
for k in manquantes: print("  ⛔ servie par le back, jamais demandée par le client :", k)
for k in en_trop: print("  ⛔ demandée par le client, absente du back :", k)
for k in replis_faux: print(f"  ⛔ repli ≠ fr du back : {k} client={client[k][0]!r} back={back[k].get('fr')!r}")
egaux = len(set(back) & set(client)) - len(replis_faux) - len(declares_vus)
print(f"replis égaux au fr du back : {egaux}/{len(set(back) & set(client))} · écarts DÉCLARÉS : {len(declares_vus)}")
for k in declares_vus: print(f"  ⚠️ écart déclaré : {k} client={client[k][0]!r} back={back[k].get('fr')!r} — {DECLARES[k][1]}")
if CONTROLE:
    # Contrôle négatif : à ea215ce9, les 8 clés que 10d32c75 demande et que le back ne servait pas encore DOIVENT rester rouges.
    ATTENDU = {'building.capacity.none', 'building.hub_tier.none', 'building.lab_tier.none', 'building.money_holding_tier.none',
               'building.roster.none', 'building.type.office', 'building.type.press_house', 'building.yield.none'}
    vu = set(en_trop) == ATTENDU and not manquantes and not replis_faux
    print(f"contrôle négatif : l'écart connu (8 clés) est détecté à {sha} : {vu}")
    sys.exit(0 if vu else 1)
sys.exit(0 if not manquantes and not en_trop and not replis_faux else 1)
