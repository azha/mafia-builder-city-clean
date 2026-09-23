#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""D17 (f2, 23/09) — la ponctuation haute du FR servi : une espace INSÉCABLE avant « : » (U+00A0) et avant « ; ! ? » (U+202F), comme `’` (D10).
Mesure, dans FR_MESSAGES du back HEAD (lu par son nom), les ponctuations hautes précédées d'une espace ORDINAIRE, d'une insécable, ou
collées ; et, à titre d'information, les guillemets « » à espace ordinaire intérieure (même classe). Les `{param}` et les URL ne comptent pas.
Le rendu le montre : ㉕ cadre 0, « bloquée : plus de solvant » — le « : » tombe en début de ligne. Rien n'est corrigé ici : le back traite.
Usage : python3 Tools/atelier-2026-09-22/mesure-d17-ponctuation-haute.py [--liste]   (exit 1 tant qu'il reste une espace ordinaire)"""
import re, subprocess, sys, collections
BACK = '/home/erutheone/project/mafia-back-suite'
st = subprocess.run(['git', '-C', BACK, 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'], capture_output=True, text=True).stdout
sha = subprocess.run(['git', '-C', BACK, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
d = st.index('export const FR_MESSAGES'); t = st[d:st.index('\n};', d)]
FR = {}
for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*(?:'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\")", t, re.M):
    v = m.group(2) if m.group(2) is not None else m.group(3)
    for a, b in (("\\'", "'"), ('\\u00a0', ' '), ('\\u00A0', ' '), ('\\u202f', ' '), ('\\u202F', ' ')): v = v.replace(a, b)
    FR[m.group(1)] = v
ordinaire, insecable, colle, cles = collections.Counter(), collections.Counter(), collections.Counter(), []
for k, v in FR.items():
    v2 = re.sub(r'https?://\S+', '', re.sub(r'\{[^}]*\}', 'X', v)); fautif = False
    for m in re.finditer(r'(.)([:;!?])', v2):
        pre, p = m.groups()
        if pre == ' ': ordinaire[p] += 1; fautif = True
        elif pre in '  ': insecable[p] += 1
        elif pre.isalnum() or pre in '»)': colle[p] += 1; fautif = True
    if fautif: cles.append(k)
g = sum(len(re.findall(r'« | »', v)) for v in FR.values())
print(f'back {sha} · {len(FR)} valeurs FR')
print(f'espace ORDINAIRE avant ponctuation haute : {sum(ordinaire.values())} occurrences · {dict(ordinaire)}')
print(f'insécable (U+00A0 / U+202F)             : {sum(insecable.values())} · collée : {sum(colle.values())}')
print(f'valeurs fautives : {len(cles)} · guillemets « » à espace ordinaire (info) : {g}')
if '--liste' in sys.argv: [print('  ', k) for k in sorted(cles)]
sys.exit(1 if cles else 0)
