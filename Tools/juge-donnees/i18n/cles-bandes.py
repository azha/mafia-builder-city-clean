#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Lot E — égalité d'ENSEMBLES entre les clés de bande que le client dérive et celles que le back a posées.

Le client dérive `domaine.role.slug(valeurServie)` par `Libelle.ParValeur(domaine, role, "VALEUR", "repli")`
(ou l'aide `Bande("role", "VALEUR", "repli")` de ②, domaine `building`). Ce script lit ces sites dans la SOURCE
(la valeur servie y est écrite en littéral, sous son `case`) et compare l'ensemble obtenu à l'instantané des
clés du back (`cles-bandes-ea215ce9.json`, lu dans `string_table.ts` du cumul back à ea215ce9, EN et FR).
Il vérifie aussi que chaque REPLI est le texte FR du back pour sa clé (le repli s'affiche tant que la clé
n'est pas servie ; il doit dire la même chose que ce qui la remplacera).

Usage : python3 cles-bandes.py [instantane.json]   — RC 0 si égalité, 1 sinon.
"""
import json, pathlib, re, sys, unicodedata
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
inst = json.load(open(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).with_name('cles-bandes-ea215ce9.json')))
back = inst['cles']
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
print(f"back (instantané) {len(back)} · client {len(client)} · égalité : {not manquantes and not en_trop}")
for k in manquantes: print("  ⛔ servie par le back, jamais demandée par le client :", k)
for k in en_trop: print("  ⛔ demandée par le client, absente du back :", k)
for k in replis_faux: print(f"  ⛔ repli ≠ fr du back : {k} client={client[k][0]!r} back={back[k].get('fr')!r}")
egaux = len(set(back) & set(client)) - len(replis_faux) - len(declares_vus)
print(f"replis égaux au fr du back : {egaux}/{len(set(back) & set(client))} · écarts DÉCLARÉS : {len(declares_vus)}")
for k in declares_vus: print(f"  ⚠️ écart déclaré : {k} client={client[k][0]!r} back={back[k].get('fr')!r} — {DECLARES[k][1]}")
sys.exit(0 if not manquantes and not en_trop and not replis_faux else 1)
