#!/usr/bin/env python3
"""Temps 5 — (a) stabilite T / T+1 s ; (b) la capture 20:9.

(a) Un ecran neuf est SANS animation (ruling 2026-08-27). On compte les pixels differents
    entre les deux captures 1080x1920. Le chrome n'est pas monte : rien a exclure.
(b) 1080x2400 : la capture est-elle identique a la 16:9 sur la zone commune, et que
    devient l'espace supplementaire ?

Contrôle positif : une image comparee a ELLE-MEME doit donner 0 pixel different.
Contrôle negatif : la 1080x1920 comparee a la 1080x2400 (recadree en haut) doit donner un
  nombre NON NUL si les deux different reellement — sinon le comparateur ne compare rien.
"""
from PIL import Image
import os

D = '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/'
A = D + 'screen_b3_reputation_1080x1920.png'
B = D + 'screen_b3_reputation_1080x1920_t1s.png'
C = D + 'screen_b3_reputation_1080x2400.png'


def diff(p1, p2, h=None, label=''):
    i1 = Image.open(p1).convert('RGB')
    i2 = Image.open(p2).convert('RGB')
    print(f'  {label}')
    print(f'    {os.path.basename(p1)} {i1.size}   vs   {os.path.basename(p2)} {i2.size}')
    H = h or min(i1.size[1], i2.size[1])
    W = min(i1.size[0], i2.size[0])
    a, b = i1.load(), i2.load()
    n = 0
    mx = 0
    prem = None
    for y in range(H):
        for x in range(W):
            d = max(abs(a[x, y][k] - b[x, y][k]) for k in range(3))
            if d:
                n += 1
                mx = max(mx, d)
                if prem is None:
                    prem = (x, y, a[x, y], b[x, y])
    print(f'    zone comparee {W}x{H} = {W*H} px  |  pixels differents : {n} '
          f'({100*n/(W*H):.4f} %)  |  ecart max {mx}/255')
    if prem:
        print(f'    1er pixel different : {prem}')
    return n


print('=== images du dossier ===')
for p in (A, B, C):
    print(' ', os.path.basename(p), Image.open(p).size)
print()
print('=== (a) CONTROLE POSITIF : 1080x1920 contre elle-meme ===')
diff(A, A, label='doit donner 0')
print()
print('=== (a) STABILITE : T contre T+1 s ===')
diff(A, B, label='doit donner 0 (aucune animation sur cet ecran)')
print()
print('=== (b) CONTROLE NEGATIF / 20:9 : 1080x1920 contre 1080x2400 sur les 1920 1res lignes ===')
diff(A, C, h=1920, label='le fond diffère necessairement en bas ; le cadre, lui, ne doit pas')
print()
print('    -> meme comparaison limitee au CADRE seul (y 0..1660) :')
diff(A, C, h=1660, label='cadre : doit donner 0 si le cadre est identique aux deux resolutions')
