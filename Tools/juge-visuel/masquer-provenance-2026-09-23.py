#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Correctif VERS L'AVANT (décision f2 du 23/09) : le champ `"compte"` des fichiers JSON suivis sous `Tools/` (provenance des corps réels,
`_index*.json`, `empreinte-reference.json`) passe de l'identifiant en clair à `masquer()` (« défini (empreinte sha256:xxxxxxxx) »,
la fonction de `capturer-corps-reels.py`). L'HISTORIQUE n'est PAS touché : le réécrire est un geste destructif pour toutes les sessions,
c'est à l'user de trancher.
Remplacement TEXTUEL (la mise en forme des fichiers est gardée) : `"compte": "<adresse>"` → `"compte": "<masque>"`. Idempotent.
Usage : masquer-provenance-2026-09-23.py [--mesurer | --ecrire]   (--mesurer : comptes par empreinte, jamais la valeur)"""
import collections, glob, hashlib, importlib.util, os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.abspath(os.path.join(ICI, '..', '..'))
sp = importlib.util.spec_from_file_location('ccr', os.path.join(ICI, 'capturer-corps-reels.py'))
ccr = importlib.util.module_from_spec(sp); sp.loader.exec_module(ccr)
CHAMP = re.compile(r'("compte"\s*:\s*")([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})(")')

def suivis():
    out = subprocess.run(['git', 'ls-files', '-z', 'Tools/'], cwd=RACINE, capture_output=True, text=True).stdout.split('\0')
    return [f for f in out if f.endswith('.json')]

def main():
    ecrire = '--ecrire' in sys.argv
    par_valeur, fichiers = collections.Counter(), 0
    for f in suivis():
        p = os.path.join(RACINE, f); s = open(p, encoding='utf-8').read()
        vus = CHAMP.findall(s)
        if not vus: continue
        fichiers += 1
        for _, v, _ in vus: par_valeur[ccr.masquer(v)] += 1
        if ecrire:
            t = CHAMP.sub(lambda m: m.group(1) + ccr.masquer(m.group(2)) + m.group(3), s)
            open(p, 'w', encoding='utf-8').write(t); assert not CHAMP.search(t)
    print(f'champs "compte" en clair : {sum(par_valeur.values())} dans {fichiers} fichier(s) JSON suivis' + (' — masqués' if ecrire else ''))
    for m, n in par_valeur.most_common(): print(f'   {m} × {n}')
    if ecrire:
        reste = sum(len(CHAMP.findall(open(os.path.join(RACINE, f), encoding='utf-8').read())) for f in suivis())
        print(f'contrôle après : {reste} champ "compte" en clair'); sys.exit(1 if reste else 0)

if __name__ == '__main__':
    main()
