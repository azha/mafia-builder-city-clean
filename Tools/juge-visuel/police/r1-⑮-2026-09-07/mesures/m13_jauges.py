# -*- coding: utf-8 -*-
"""m13 — geometrie et couleur des 'pastilles' de jauge ; recherche de la classe connue
'rail horizontal a trou symetrique et central' (bord periodique etire par un 9-slice).
Contrôle positif : le rail HAUT d'une pastille doit exister (>= 20 px continus).
Contrôle negatif : une ligne prise 6 px SOUS la pastille ne doit rendre aucun rail.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(D, 'capture-1080x2400.png')).convert('RGB')
print("OUVERT capture taille=%s" % (im.size,)); px = im.load(); g = im.convert('L'); pg = g.load()

def boite(x0, y0, x1, y1, seuil):
    xs = [x for x in range(x0, x1+1) if any(pg[x, y] > seuil for y in range(y0, y1+1))]
    ys = [y for y in range(y0, y1+1) if any(pg[x, y] > seuil for x in range(x0, x1+1))]
    return (min(xs), min(ys), max(xs), max(ys)) if xs and ys else None

def med(v):
    v = sorted(v); n = len(v); return v[n//2] if n % 2 else (v[n//2-1]+v[n//2])//2

def couleur_trait(x0, y0, x1, y1, frac=0.03):
    pts = []
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            r, gg, b = px[x, y]; pts.append((0.299*r+0.587*gg+0.114*b, r, gg, b))
    pts.sort(reverse=True); k = max(4, int(len(pts)*frac)); t = pts[:k]
    return (med([p[1] for p in t]), med([p[2] for p in t]), med([p[3] for p in t]))

def rail(x0, x1, y, seuil):
    """segments continus sur la ligne y, et trous internes"""
    on = [pg[x, y] > seuil for x in range(x0, x1+1)]
    segs = []; cur = None
    for i, v in enumerate(on):
        if v: cur = [i, i] if cur is None else [cur[0], i]
        else:
            if cur is not None: segs.append(tuple(cur)); cur = None
    if cur is not None: segs.append(tuple(cur))
    return segs

print()
GROUPES = [
 ('Charge  seg1 (allume)',  427, 404, 470, 435, 30),
 ('Charge  seg4 (eteint)',  568, 404, 610, 435, 25),
 ('Critique seg1 (None)',   284, 515, 340, 545, 25),
 ('Faible   seg1 (Predom.)',284, 687, 340, 712, 30),
 ('Faible   seg3 (Predom.)',412, 687, 470, 712, 30),
]
for nom, x0, y0, x1, y1, s in GROUPES:
    b = boite(x0, y0, x1, y1, s)
    if not b: print("  %-26s AUCUNE encre" % nom); continue
    c = couleur_trait(b[0], b[1], b[2], b[3])
    print("  %-26s bbox=(%d,%d)-(%d,%d)  %dx%d px = %.1fx%.1f CSS  trait RGB=%s"
          % (nom, b[0], b[1], b[2], b[3], b[2]-b[0]+1, b[3]-b[1]+1,
             (b[2]-b[0]+1)/3.6, (b[3]-b[1]+1)/3.6, c))
    yh = b[1]+1
    segs = rail(b[0], b[2], yh, s)
    largeur = b[2]-b[0]+1
    print("        rail HAUT (y=%d) : %d segment(s) %s" % (yh, len(segs), segs))
    if len(segs) > 1:
        trous = [(segs[i][1]+1, segs[i+1][0]-1) for i in range(len(segs)-1)]
        for a, bb in trous:
            centre = (a+bb)/2.0
            print("          TROU x_rel %d..%d (l=%d) ; centre a %.1f %% de la largeur (50 %% = central)"
                  % (a, bb, bb-a+1, 100.0*centre/largeur))
    ctrl = rail(b[0], b[2], b[3]+6, s)
    print("        CONTROLE NEGATIF 6 px sous la pastille : %d segment(s)" % len(ctrl))

print()
print("== ESPACEMENT ET NOMBRE DE PASTILLES ==")
for nom, y0, y1, s, x0, x1 in [('Charge', 404, 435, 30, 420, 660), ('Critique(None)', 515, 545, 25, 275, 480),
                               ('Faible(Predom)', 687, 712, 30, 275, 480)]:
    cols = [x for x in range(x0, x1) if any(pg[x, y] > s for y in range(y0, y1+1))]
    segs = []; cur = None
    for x in cols:
        if cur is None or x-cur[1] > 2: 
            if cur is not None: segs.append(tuple(cur))
            cur = [x, x]
        else: cur = [cur[0], x]
    if cur: segs.append(tuple(cur))
    print("  %-16s %d pastilles : %s" % (nom, len(segs), ["%d..%d(l=%d)" % (a,b,b-a+1) for a,b in segs]))
    if len(segs) > 1:
        ecarts = [segs[i+1][0]-segs[i][1]-1 for i in range(len(segs)-1)]
        print("        ecarts = %s px" % ecarts)
