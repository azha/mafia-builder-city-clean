#!/usr/bin/env python3
"""Temps 3 — TEXTES : hauteur d'encre et LARGEUR DE LA CHAINE.

v2. La v1 posait des fenetres etroites a des y fixes ; comme la mise en page du jeu est
decalee vers le haut (cf. 02_blocs), plusieurs fenetres coupaient le texte et sortaient des
ecarts de 30 a 50 % entierement dus a la fenetre. Corrige : la fenetre est LARGE, et le
script y detecte tout seul la BANDE de lignes encrees contigues.

Deux grandeurs :
  - hauteur d'encre de la bande (accents et jambages inclus : c'est ce que l'oeil voit) ;
  - LARGEUR de la chaine — pour une MEME chaine, c'est le comparateur le plus robuste de
    la taille de corps, et il ne depend d'aucune fenetre.

Contrôle positif : le CTA « DONNER UNE PREMIERE REGLE » — meme chaine, meme casse.
Contrôle negatif : le gros « 00 » d'un compteur contre son libelle, dans la MEME image :
  deux corps qu'on sait differents doivent sortir differents.
"""
from PIL import Image
import os

REF = ('REF', os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'), 3.0, 18, 376)
CAP = ('CAP', '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
       3.6, 18, 18)
IM = {}


def bandes(S, xc0, xc1, yc0, yc1, seuil=45, minpx=2):
    """renvoie la liste des bandes de lignes encrees contigues dans la fenetre."""
    lab, p, ech, cx0, cy0 = S
    if p not in IM:
        IM[p] = Image.open(p).convert('RGB')
    im = IM[p]
    px = im.load()
    X0, X1 = int(cx0 + xc0 * ech), int(cx0 + xc1 * ech)
    Y0, Y1 = int(cy0 + yc0 * ech), int(cy0 + yc1 * ech)
    coins = [px[X0, Y0], px[X1 - 1, Y0], px[X0, Y1 - 1], px[X1 - 1, Y1 - 1]]
    fond = tuple(sorted(c[k] for c in coins)[1] for k in range(3))
    rows = {}
    for y in range(Y0, Y1):
        r = [x for x in range(X0, X1)
             if max(abs(px[x, y][k] - fond[k]) for k in range(3)) > seuil]
        if len(r) >= minpx:
            rows[y] = r
    out = []
    cur = []
    for y in range(Y0, Y1):
        if y in rows:
            cur.append(y)
        elif cur:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    res = []
    for b in out:
        xs = [x for y in b for x in rows[y]]
        enc = sorted(((max(abs(px[x, y][k] - fond[k]) for k in range(3))), px[x, y])
                     for y in b for x in rows[y])[-max(1, len(xs) // 8):]
        encre = tuple(sorted(e[1][k] for e in enc)[len(enc) // 2] for k in range(3))
        res.append(dict(y0=(b[0] - cy0) / ech, y1=(b[-1] - cy0) / ech, h=(len(b)) / ech,
                        x0=(min(xs) - cx0) / ech, x1=(max(xs) - cx0) / ech,
                        w=(max(xs) - min(xs) + 1) / ech, encre=encre, fond=fond))
    return res


print('=== images ===')
for S in (REF, CAP):
    print(' ', os.path.basename(S[1]), Image.open(S[1]).size)
print()

CAS = [
    # nom,                      fenetre REF (x0,x1,y0,y1),  fenetre CAP,             bande a prendre
    ('titre "Le miroir"', (12, 276, 14, 36), (12, 278, 13, 35), 0),
    ('sous-titre L1', (12, 276, 36, 48), (12, 278, 35, 47), 0),
    ('sous-titre L2', (12, 276, 36, 55), (12, 278, 35, 54), 1),
    ('compteur "00" tuile 1', (12, 92, 70, 94), (12, 92, 68, 92), 0),
    ('libelle "REGLES DONNEES"', (12, 92, 94, 104), (12, 92, 92, 102), 0),
    ('compteur tuile 3', (196, 276, 70, 94), (196, 278, 68, 92), 0),
    ('libelle "ENFREINTES"', (196, 276, 94, 104), (196, 278, 92, 102), 0),
    ('carte liste 1 : titre', (150, 272, 155, 172), (150, 274, 145, 162), 0),
    ('carte liste 1 : sous-titre', (150, 272, 155, 180), (150, 274, 145, 170), 1),
    ('verdict "Il vous ecoute"', (18, 134, 270, 292), (16, 132, 258, 280), 0),
    ('mention lieutenant.name', (18, 134, 288, 300), (16, 132, 274, 288), 0),
    ('kicker « PAS JUGEABLE »', (12, 276, 336, 348), (12, 278, 318, 330), 0),
    ('titre "Rien n a encore..."', (12, 276, 348, 372), (12, 278, 330, 354), 0),
    ('corps L1', (12, 276, 370, 382), (12, 278, 352, 364), 0),
    ('CTA (controle positif)', (12, 276, 420, 440), (12, 278, 398, 418), 0),
]

res = {}
for nom, rw, cw, idx in CAS:
    a = bandes(REF, *rw)
    b = bandes(CAP, *cw)
    if len(a) <= idx or len(b) <= idx:
        print(f'  {nom:30s} bande {idx} introuvable (REF {len(a)} bandes, JEU {len(b)})')
        continue
    A, B = a[idx], b[idx]
    print(f'  {nom:30s}')
    print(f'      REF h={A["h"]:5.2f} l={A["w"]:6.2f} x {A["x0"]:6.2f}..{A["x1"]:6.2f} '
          f'y {A["y0"]:6.2f}..{A["y1"]:6.2f} encre {A["encre"]}')
    print(f'      JEU h={B["h"]:5.2f} l={B["w"]:6.2f} x {B["x0"]:6.2f}..{B["x1"]:6.2f} '
          f'y {B["y0"]:6.2f}..{B["y1"]:6.2f} encre {B["encre"]}')
    res[nom] = (A, B)
print()

print('=== SYNTHESE  (tolerance : hauteur <= 1 CSS ou 5 % ; largeur <= 5 % ; encre <= 6/255) ===')
for nom, (A, B) in res.items():
    dh, dw = B['h'] - A['h'], B['w'] - A['w']
    rh = 100 * dh / A['h']
    rw_ = 100 * dw / A['w']
    de = max(abs(A['encre'][k] - B['encre'][k]) for k in range(3))
    vh = 'EGAL ' if abs(dh) <= 1 or abs(rh) <= 5 else 'ECART'
    vw = 'EGAL ' if abs(rw_) <= 5 else 'ECART'
    print(f'  {nom:30s} h {A["h"]:5.2f}->{B["h"]:5.2f} ({rh:+6.1f} %) {vh} | '
          f'l {A["w"]:6.2f}->{B["w"]:6.2f} ({rw_:+6.1f} %) {vw} | encre d={de}/255 '
          f'{"EGAL" if de <= 6 else "ECART"}')

print()
print('=== CONTROLE NEGATIF : dans la MEME image, le "00" contre son libelle ===')
for S in (REF, CAP):
    a = bandes(S, 12, 92, 70 if S[0] == 'REF' else 68, 94 if S[0] == 'REF' else 92)
    b = bandes(S, 12, 92, 94 if S[0] == 'REF' else 92, 104 if S[0] == 'REF' else 102)
    print(f'  {S[0]} : "00" h={a[0]["h"]:.2f} CSS  vs libelle h={b[0]["h"]:.2f} CSS  '
          f'rapport {a[0]["h"]/b[0]["h"]:.2f} (doit etre nettement > 1)')
