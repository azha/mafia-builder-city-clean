#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie `24-descripteurs-exceptions.md` contre le back (`mafia-back-suite`, SHA donné ou HEAD) : les 6 clés commandées, chacune de la
famille d'une carte qui existe (au moins une clé `exception.<famille>.` servie) ; fr ≠ en (garde `_en-egal-fr`) ; aucune apostrophe droite ;
aucun chiffre ; aucun « Patron » (⑨ le pose lui-même) ; la réplique servie de référence relue (contrôle positif du lecteur).
Usage : python3 Tools/atelier-2026-09-22/verifier-24.py [<sha-back>]"""
import os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__)); BACK = '/home/erutheone/project/mafia-back-suite'
REV = sys.argv[1] if len(sys.argv) > 1 else 'HEAD'
st = subprocess.run(['git', '-C', BACK, 'show', f'{REV}:services/game-back/src/i18n/string_table.ts'], capture_output=True, text=True).stdout
def reg(n):
    d = st.index(n); t = st[d:st.index('\n};', d)]
    return {m.group(1): ''.join(re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(2))) for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*((?:'(?:[^'\\]|\\.)*'\s*\+?\s*)+),", t, re.M)}
EN, FR = reg('export const EN_MESSAGES'), reg('export const FR_MESSAGES')
assert FR['exception.raid.card.descriptor'].endswith('J’ai pas de consigne pour ça.'), 'contrôle positif du lecteur'
ATTENDU = {f'exception.{f}.card.descriptor' for f in ('lieutenant_cook', 'lieutenant_distribution', 'lieutenant_intelligence',
                                                       'lieutenant_logistics', 'lieutenant_muscle', 'operator_input')}
doc = open(os.path.join(ICI, '24-descripteurs-exceptions.md'), encoding='utf-8').read(); t = {}
for l in doc.split('\n'):
    m = re.match(r'\| `([a-z_.]+)` \| ([^|]+) \| ([^|]+) \|', l)
    if m: t[m[1]] = (m[2].strip(), m[3].strip())
d = []
if set(t) != ATTENDU: d.append(f'ensemble : en trop {set(t) - ATTENDU} ; manquantes {ATTENDU - set(t)}')
for k, (fr, en) in t.items():
    fam = k.rsplit('.', 2)[0] + '.'
    if k.startswith('exception.lieutenant') and not any(x.startswith(fam) for x in EN): d.append(f'{k} : aucune clé {fam}* servie')
    if fr == en: d.append(f'{k} : en == fr')
    if "'" in fr or "'" in en: d.append(f'{k} : apostrophe droite')
    if re.search(r'\d', fr + en): d.append(f'{k} : chiffre')
    if 'patron' in (fr + en).lower(): d.append(f'{k} : « Patron » (⑨ le pose)')
    deja = [x for x, r in (('FR', FR), ('EN', EN)) if k in r]
    print(f'  {k} : {"déjà présente en " + "+".join(deja) + " → remplacée" if deja else "neuve"}')
print(f'back {REV} : {len(t)} répliques'); [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)
