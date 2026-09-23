#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""« Matin » dans le texte visible des maquettes devient « Plein jour » (décision f2 D16 du 23/09 : aucune phase servie ne se dit « Matin » ;
`chrome.phase.*` = Aube, Plein jour, Soirée, Nuit — `DayPhaseResolver.cs:51-54` ; la barre dit « JOUR 12 · Matin », 12 h).
Ce qui est touché : le MOT « Matin » dans un nœud de texte (la barre `<span class="val">`, et une ligne du Lavomatic de la série 1 :
« sort à J14 Matin »). Jamais les attributs, `<script>`, `<style>`, `<code>`, `<pre>`, les commentaires (zones de `apostrophes-maquettes`).
`hud-brennar.html` n'est pas édité (0 « Matin » de toute façon). ⑦ et ④ copient la barre du cadre 131 de la série 6 : une regénération après
cet outil redonne la même page. Comptes ATTENDUS mesurés le 2026-09-23 (atelier `d3319eb`, écrits dans `f67ca63`) ; une page dont le compte diffère n'est pas écrite ;
idempotent (une page déjà passée rend 0). Aucun rendu : le lot est groupé au tour suivant.
Usage : phase-maquettes-2026-09-23.py [--mesurer | --controle | --ecrire]"""
import os, re, sys
import importlib.util as _iu
_sp = _iu.spec_from_file_location('apos', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'apostrophes-maquettes-2026-09-23.py'))
_ap = _iu.module_from_spec(_sp); _sp.loader.exec_module(_ap)
MOT, PHASE = re.compile(r'\bMatin\b'), 'Plein jour'

def normaliser(html):
    morceaux = _ap.PROTEGE.split(html); n = 0
    for i in range(0, len(morceaux), 2):
        morceaux[i], k = MOT.subn(PHASE, morceaux[i]); n += k
    return ''.join(morceaux), n

ATTENDU = {   # --mesurer, atelier d3319eb, 2026-09-23
    'ecrans-brennar-4.html': 4,
    'ecrans-brennar-5.html': 1,
    'ecrans-brennar-6-sans-pastilles.html': 114,
    'ecrans-brennar-6.html': 114,
    'ecrans-brennar-7-lieutenant.html': 3,
    'ecrans-brennar-accueil.html': 4,
    'ecrans-brennar.html': 1,
}

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    total, defauts = 0, []
    for p in _ap.pages():
        s = open(p, encoding='utf-8').read(); t, n = normaliser(s); nom = os.path.basename(p); total += n
        if mode == '--mesurer':
            if n: print(f"    '{nom}': {n},")
            continue
        att = ATTENDU.get(nom)
        if n and att is None: defauts.append(f'{nom} : {n} « Matin », aucun compte attendu')
        elif n and n != att: defauts.append(f'{nom} : {n} « Matin », {att} attendus — la page a bougé')
        elif mode == '--ecrire' and n:
            open(p, 'w', encoding='utf-8').write(t)
            assert normaliser(t)[1] == 0, f'{nom} : non idempotent'
        if n: print(f'  {nom:44} {n:5}' + (' écrit' if mode == '--ecrire' else ' à écrire'))
    print(f'total : {total}' + ('' if mode == '--mesurer' else f" · {len(defauts)} défaut(s)")); [print('  ⛔', x) for x in defauts]
    sys.exit(1 if defauts else 0)

if __name__ == '__main__':
    main()
