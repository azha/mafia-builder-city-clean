#!/usr/bin/env python3
"""Garde : aucun fichier de planche n'est attribué à plus d'une ligne de Tools/juge-visuel/INDEX.md.

Né le 2026-09-07 (f2) : `planche_le_coffre_1080x2400.png` était la planche de ⑪ (l.13) ET de ㉒ (l.25) — deux lignes, deux
contrôleurs, chacune cohérente lue seule. Une planche à deux écrans est pire qu'une planche sans écran : les deux lignes se lisent
comme des preuves. Contrôle positif intégré (un INDEX synthétique avec un doublon DOIT sortir en défaut). Sortie non nulle si défaut.
"""
import re, sys, pathlib, collections
def attributions(texte):
    by = collections.defaultdict(list)
    for l in texte.splitlines():
        if not l.startswith('| ') or l.startswith('| sym') or l.startswith('|---'): continue
        c = [x.strip() for x in l.strip('|').split('|')]
        if len(c) < 7: continue
        for p in re.findall(r'`([^`]+\.png)`', c[6]): by[p].append((c[0], c[3].strip('`')))
    return by
def doublons(texte): return {p: v for p, v in attributions(texte).items() if len(v) > 1}
if __name__ == '__main__':
    racine = pathlib.Path(__file__).resolve().parent
    synth = "| ① | a | C1 | `d1` | c | r | `x.png` (existe) | — |\n| ② | b | C2 | `d2` | c | r | `x.png` (existe) | — |\n| ③ | c | C3 | `d3` | c | r | `y.png` (existe) | — |\n"
    assert set(doublons(synth)) == {'x.png'}, 'contrôle positif RATÉ : le doublon synthétique n\'est pas vu'
    idx = (racine / 'INDEX.md').read_text(encoding='utf-8'); by = attributions(idx); d = doublons(idx)
    print(f"INDEX : {sum(len(v) for v in by.values())} attributions · {len(by)} fichiers distincts · contrôle positif OK · {len(d)} doublon(s)")
    for p, v in d.items(): print(f"  ⛔ {p} → " + ' ET '.join(f'{s} ({dos})' for s, dos in v))
    sys.exit(1 if d else 0)
