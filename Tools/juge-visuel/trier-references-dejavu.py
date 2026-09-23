#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tri des références re-rendues en DejaVu (ARBITRAGES 2026-09-07 point 18) contre leur version HEAD — statique, aucun rendu.

Chaque PNG modifié est comparé à sa version `git show HEAD:<chemin>` :
  - part des pixels à > 64 de différence, et la même part pour l'ANCIEN contre lui-même décalé de 40 px en y (le négatif :
    ce que rendrait une GÉOMÉTRIE fausse sur cette image-là) ;
  - verdict « texte » si l'écart est < 1/2 du négatif (le changement de police déplace des bords de lettres, pas l'image) ;
    « GÉOMÉTRIE ? » sinon — un tel fichier n'est PAS gardé tant qu'il n'est pas regardé.
  - « inchangé » si les pixels sont identiques (le fichier est restauré, pour ne pas écrire un octet de trop).
Usage : python3 Tools/juge-visuel/trier-references-dejavu.py [--restaurer-inchanges]"""
import io, subprocess, sys
from PIL import Image, ImageChops
R = '/home/erutheone/project/mafia-unity-DA'
def part(a, b):
    h = ImageChops.difference(a, b).convert('L').histogram(); return sum(h[65:]) / (a.size[0] * a.size[1])
sortie = subprocess.run(['git', '-C', R, 'status', '--porcelain', '-z'], capture_output=True).stdout.decode('utf-8').split('\0')
fichiers = [e[3:] for e in sortie if e.startswith(' M') and e.endswith('.png') and 'juge-visuel' in e]
def tete(f):
    """La version HEAD d'un PNG : les PNG sont en Git LFS — `git show` rend le POINTEUR, qu'on passe à `git lfs smudge`."""
    ptr = subprocess.run(['git', '-C', R, 'show', f'HEAD:{f}'], capture_output=True).stdout
    if ptr.startswith(b'version https://git-lfs'):
        ptr = subprocess.run(['git', '-C', R, 'lfs', 'smudge', f], input=ptr, capture_output=True).stdout
    return Image.open(io.BytesIO(ptr)).convert('RGB')
lignes, compte = [], {'texte': 0, 'GÉOMÉTRIE ?': 0, 'inchangé': 0}
for f in sorted(fichiers):
    neuf = Image.open(f'{R}/{f}').convert('RGB')
    vieux = tete(f)
    if neuf.size != vieux.size: v = 'GÉOMÉTRIE ?'; p = n = float('nan')
    else:
        p = part(neuf, vieux)
        dec = Image.new('RGB', vieux.size); dec.paste(vieux, (0, 40)); n = part(dec, vieux)
        v = 'inchangé' if p == 0 else ('texte' if p < n / 2 else 'GÉOMÉTRIE ?')
    compte[v] += 1
    lignes.append(f'  {v:12} {100 * p:6.2f} % (négatif {100 * n:6.2f} %)  {f.replace("Tools/juge-visuel/", "")}')
    if v == 'inchangé' and '--restaurer-inchanges' in sys.argv: subprocess.run(['git', '-C', R, 'checkout', '--', f])
print('\n'.join(lignes)); print(' · '.join(f'{k} {v}' for k, v in compte.items()))
sys.exit(1 if compte['GÉOMÉTRIE ?'] else 0)
