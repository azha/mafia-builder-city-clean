#!/usr/bin/env python3
"""m25 - ROBUSTESSE de la conclusion de rythme. Le haut du rect libre de la REFERENCE n'a pas de
frontiere dure (le bandeau du cadre est un degrade sur l'art) : j'ai choisi y=211. On verifie ici
que la conclusion ne depend pas de ce choix, en le faisant varier de 100 a 320.
Controle : l'ecart doit rester > 20 points sur toute la plage -> la conclusion tient.
"""
print("origine REF | debut du contenu REF | debut du contenu CAP | ecart (points)")
for y0 in range(100,330,20):
    h=2101-y0
    pr=(765-y0)/h*100
    pc=(1278-143)/2036*100
    print(f"   y0={y0:4d}   REF {pr:6.1f}%          CAP {pc:6.1f}%          {pc-pr:+6.1f}")
print("\n   -> la conclusion (le contenu commence BEAUCOUP plus bas en jeu) est insensible au choix.")
print("\n   Et une mesure sans origine du tout : hauteur du plus grand VIDE contigu")
print("      REF : plus longue plage de lignes uniformes =   17 px (m02)")
print("      CAP : plus longue plage de lignes uniformes = 1046 px (m02)  -> 61,5x")
print("      REF : plus grand trou entre blocs encres    =   n/a (art peint partout)")
print("      CAP : plus grand trou entre blocs encres    = 1051 px = 43,8% de l'ecran (m05)")
