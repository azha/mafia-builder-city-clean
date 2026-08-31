#!/usr/bin/env python3
"""Temps 3 + 5 — (a) couleur des LISERES (bordures) des blocs ;
                 (b) les memes aplats mesures sur la capture 1080x2400.

(a) Chaque bordure est echantillonnee sur son trait, au milieu d'un cote, a l'ecart des
    coins. Le pixel du trait, pas son voisinage.
(b) La 20:9 : les aplats des panneaux doivent rester dans la meme tolerance qu'en 16:9.
    (Le fond decoratif du client est dimensionne a l'ecran : il transparait sous les
    panneaux et peut les decaler.)

Contrôle positif (a) : le liseré doré du CTA — couleur nommee, forte, isolee.
Contrôle negatif (a) : le meme point pris 4 CSS a l'interieur du bloc doit rendre le
    fond, pas le liseré.
"""
from PIL import Image
import os

REF = ('REF', os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'), 3.0, 18, 376)
CAP = ('CAP', '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
       3.6, 18, 18)
C24 = ('C24', '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x2400.png',
       3.6, 18, 18)
IM = {}


def px_of(S, xc, yc):
    lab, p, ech, cx0, cy0 = S
    if p not in IM:
        IM[p] = Image.open(p).convert('RGB')
    im = IM[p]
    x, y = int(round(cx0 + xc * ech)), int(round(cy0 + yc * ech))
    return im.load()[x, y], (x, y)


def trio(nom, r, c, c24=None):
    a, pa = px_of(REF, *r)
    b, pb = px_of(CAP, *c)
    line = f'  {nom:34s} REF {str(a):16s} JEU {str(b):16s} d={max(abs(a[i]-b[i]) for i in range(3)):3d} ' \
           f'{"EGAL" if max(abs(a[i]-b[i]) for i in range(3)) <= 6 else "ECART"}'
    if c24:
        d, pd = px_of(C24, *c24)
        line += f'  | 20:9 {str(d):16s} d/16:9={max(abs(d[i]-b[i]) for i in range(3)):3d}'
    print(line)


print('=== images ===')
for S in (REF, CAP, C24):
    px_of(S, 10, 10)
    print(' ', os.path.basename(S[1]), IM[S[1]].size)
print()

print('=== (a) LISERES (le pixel du trait) ===')
trio('liseré doré du CADRE (montant G)', (0.33, 200), (0.33, 200), (0.33, 200))
trio('liseré CTA (traverse haute)', (150, 417.2), (150, 396.6), (150, 396.6))
trio('liseré panneau enseigne (haut)', (150, 8.5), (150, 8.3), (150, 8.3))
trio('règle dorée sous le titre', (150, 59.5), (150, 57.8), (150, 57.8))
trio('liseré tuile compteur 1 (haut)', (50, 70.2), (50, 68.3), (50, 68.3))
trio('liseré tuile compteur 2 (haut)', (143, 70.2), (145, 68.3), (145, 68.3))
trio('liseré tuile compteur 3 (haut)', (236, 70.2), (238, 68.3), (238, 68.3))
trio('liseré grand panneau (haut)', (150, 111.2), (150, 109.4), (150, 109.4))
trio('liseré doré carte portrait (G)', (17.5, 200), (15.4, 200), (15.4, 200))
trio('liseré carte de liste 1 (haut)', (200, 153.2), (200, 143.8), (200, 143.8))
trio('liseré panneau verdict (haut)', (150, 331.8), (150, 313.5), (150, 313.5))
print()
print('  CONTROLE NEGATIF — les memes x, mais 4 CSS a l\'INTERIEUR (doit rendre le fond) :')
trio('CTA, 4 CSS sous son liseré', (150, 421.2), (150, 400.6))
trio('tuile 1, 4 CSS sous son liseré', (50, 74.2), (50, 72.3))
print()

print('=== (b) aplats : 16:9 contre 20:9 (memes coordonnees CSS) ===')
for nom, xy in (('fond panneau enseigne', (30, 14)), ('fond tuile compteur 2', (113, 74)),
                ('fond grand panneau', (137.5, 128)), ('fond carte portrait', (25, 125)),
                ('fond carte de liste 2', (260, 180)), ('fond panneau verdict', (260, 322)),
                ('fond CTA', (20, 408)), ('fond marge gauche y=250', (3, 250))):
    b, _ = px_of(CAP, *xy)
    d, _ = px_of(C24, *xy)
    a, _ = px_of(REF, *xy)
    print(f'  {nom:28s} REF {str(a):16s} 16:9 {str(b):16s} 20:9 {str(d):16s} '
          f'| d(20:9,16:9)={max(abs(d[i]-b[i]) for i in range(3)):3d}  '
          f'd(20:9,REF)={max(abs(d[i]-a[i]) for i in range(3)):3d}')
