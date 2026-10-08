#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Garde des listes de noms publics du joueur (B5, commande CLIENT-1 du 26/09). Règle de composition : « {A} {B} » — un nom de famille
de Brennar (A-noms-de-famille.txt), une espace, un sobriquet d'objet avec son article (B-sobriquets.txt). Vérifie TOUTES les combinaisons
contre les contraintes mesurées au back (HEAD 1ffb08b4 : auth.controller.ts:266-278, schema/player.ts, auth.service.ts:596) :
longueur 1..24 en unités UTF-16 après trim ; aucun espace de bord ni double ; pas de « @ » ; pas de caractère de contrôle ; jeu de
caractères = lettres (accentuées comprises), espace simple, trait d'union, apostrophe typographique ; aucun doublon (casse comprise) ;
aucun nom de famille égal à un nom du réservoir des lieutenants (lieutenant-name-pool.ts) ; au moins 10 000 combinaisons.
Contrôle de mutation (--mutation) : 4 fautes semées doivent être vues."""
import os, re, subprocess, sys
ICI = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'noms-joueur')
lire = lambda f: [l for l in open(os.path.join(ICI, f), encoding='utf-8').read().split('\n') if l]
JEU = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿŒœ’ -]+$")
u16 = lambda s: len(s.encode('utf-16-le')) // 2

def pool():
    t = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-clean-city'), 'show',
                        '1ffb08b4:services/game-back/src/operational/lieutenant/lieutenant-name-pool.ts'], capture_output=True, text=True).stdout
    return set(re.findall(r"'([A-Z][a-zé]+)'", t)) - {'Lieutenant'}

def verifier(A, B, P):
    D = []
    if len(set(A)) != len(A): D.append('doublon dans A')
    if len(set(B)) != len(B): D.append('doublon dans B')
    if set(A) & P: D.append(f'noms du réservoir des lieutenants dans A : {sorted(set(A) & P)}')
    vus, n = set(), 0
    for a in A:
        for b in B:
            s = f'{a} {b}'; n += 1
            if s != s.strip() or '  ' in s: D.append(f'espaces : {s!r}')
            if not (1 <= u16(s.strip()) <= 24): D.append(f'longueur {u16(s)} : {s}')
            if '@' in s or any(ord(c) < 32 for c in s) or not JEU.match(s): D.append(f'caractère : {s!r}')
            if s in vus: D.append(f'doublon : {s}')
            vus.add(s)
    if n < 10000: D.append(f'{n} combinaisons < 10 000')
    return n, D[:20]

def main():
    A, B, P = lire('A-noms-de-famille.txt'), lire('B-sobriquets.txt'), pool()
    assert len(P) > 20, 'réservoir des lieutenants mal lu'
    if '--mutation' in sys.argv:
        semees = {'trop long': (A + ['Abcdefghijklmn'], B), 'arobase': (A, B + ['le @']), 'nom de lieutenant': (A + ['Tull'], B),
                  'espace double': (A, B + ['la  Cour'])}
        vues = sum(1 for (a, b) in semees.values() if verifier(a, b, P)[1])
        print(f'{vues}/{len(semees)} fautes semées vues'); return 0 if vues == len(semees) else 2
    n, D = verifier(A, B, P)
    lmax = max(u16(f'{a} {b}') for a in A for b in B)
    print(f'A {len(A)} × B {len(B)} = {n} combinaisons ; longueur max {lmax} (≤ 24)')
    for x in D: print('  ⛔', x)
    print(f'{len(D)} défaut(s)'); return 1 if D else 0

if __name__ == '__main__':
    sys.exit(main())
