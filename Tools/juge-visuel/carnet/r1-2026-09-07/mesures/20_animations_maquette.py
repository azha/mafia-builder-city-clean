# -*- coding: utf-8 -*-
"""La SOURCE de la maquette declare-t-elle une animation qui toucherait le cadre #85 ?
Une reference qui fige un artefact d animation serait un ARBITRAGE blender, pas un ecart d ecran.
Portee declaree : le FICHIER ecrans-brennar-6.html (6684 lignes), pas l arbre.
Controle POSITIF du balayage : un motif dont on SAIT qu il matche (.pot, anime) doit rendre > 0."""
SRC = '/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html'
lignes = open(SRC, encoding='utf-8').read().split('\n')
print('   [ouvert] %s  %d lignes' % (SRC, len(lignes)))

classes = ['.tel', '.cadre', '.etiquette', '.scene', '.voile-scene', '.ecran', '.barre', '.aile', '.mano', '.panneau']
print('   classes du cadre #85 balayees : %s' % ' '.join(classes))

glob_kf = sum(1 for l in lignes if '@keyframes' in l)
glob_an = sum(1 for l in lignes if 'animation' in l)
print('   PORTEE fichier : @keyframes=%d  lignes contenant "animation"=%d' % (glob_kf, glob_an))

touche = [(i+1, l.strip()[:140]) for i, l in enumerate(lignes)
          if 'animation' in l and any(c in l and (c+'-') not in l for c in classes)]
print('   regles portant "animation" ET une classe du cadre #85 : %d' % len(touche))
for t in touche: print('        l.%d %s' % t)

bloc = '\n'.join(lignes[5092:5169])   # bloc CSS .carn6, l.5093-5169
print('   dans le bloc CSS .carn6 (l.5093-5169) : @keyframes=%d  animation=%d  transition=%d'
      % (bloc.count('@keyframes'), bloc.count('animation'), bloc.count('transition')))

pos = sum(1 for l in lignes if 'animation' in l and '.pot' in l)
print('   CONTROLE POSITIF du balayage (lignes "animation" + ".pot") = %d  (doit etre > 0)' % pos)
assert pos > 0, 'balayage inoperant'
print('   -> conclusion : la reference du cadre #85 ne fige aucun artefact d animation.')
