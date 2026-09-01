#!/usr/bin/env python3
"""Temps 3 — LE PORTRAIT (angle mort A7 declare par l'auteur).

Segmentation par classe de couleur DANS la carte du portrait, puis bbox de chaque classe,
en px CSS ET en % de la largeur de la carte (seule unite comparable entre 2 echelles).

Classes cherchees : chair (visage), tissu clair (col + cravate), buste sombre, dore (bord).

Contrôle positif : la bbox de la CARTE elle-meme (bord dore), deja mesuree par 02/03 a
  117.7 CSS de large des deux cotes — la segmentation doit la retrouver.
Contrôle negatif : la classe "chair" ne doit RIEN trouver hors de la carte (sinon le
  seuil de couleur attrape autre chose — de l'or, du texte creme).
"""
from PIL import Image
import os

# (label, path, ech, cx0, cy0, carte_x0_css, carte_x1_css, carte_y0_css, carte_y1_css)
REF = ('REF', os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'),
       3.0, 18, 376, 17.0, 134.0, 118.67, 301.33)
CAP = ('CAP', '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
       3.6, 18, 18, 15.0, 132.5, 115.83, 290.00)


def classes(p):
    r, g, b = p
    out = []
    if r > 150 and g > 140 and b > 110 and abs(r - g) < 45 and r - b > 25:
        out.append('chair_ou_creme')       # visage, col, cravate : famille creme/tan
    if r > 150 and 110 < g < 200 and b < 130 and r - b > 60:
        out.append('dore')
    if 25 <= r <= 75 and 25 <= g <= 75 and 25 <= b <= 80 and max(r, g, b) - min(r, g, b) < 22:
        out.append('buste_sombre')         # gris fonce du buste / cheveux
    return out


def bbox_of(im, x0, x1, y0, y1, cls):
    px = im.load()
    xs, ys, n = [], [], 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            if cls in classes(px[x, y]):
                xs.append(x)
                ys.append(y)
                n += 1
    if not xs:
        return None
    return min(xs), min(ys), max(xs), max(ys), n


def rows_of(im, x0, x1, y0, y1, cls):
    """largeur de la classe ligne par ligne — sert a lire une forme (triangle vs boite)."""
    px = im.load()
    out = []
    for y in range(y0, y1):
        xs = [x for x in range(x0, x1) if cls in classes(px[x, y])]
        out.append((y, (min(xs), max(xs), len(xs)) if xs else None))
    return out


def run(spec):
    lab, path, ech, cx0, cy0, kx0, kx1, ky0, ky1 = spec
    im = Image.open(path).convert('RGB')
    print(f'=== {lab} {os.path.basename(path)} {im.size}')
    X0, X1 = int(cx0 + kx0 * ech), int(cx0 + kx1 * ech)
    Y0, Y1 = int(cy0 + ky0 * ech), int(cy0 + ky1 * ech)
    Wc = kx1 - kx0                     # largeur de la carte en CSS
    Hc = ky1 - ky0
    print(f'  carte portrait : {Wc:.2f} x {Hc:.2f} CSS   (px {X0}..{X1} , {Y0}..{Y1})')

    def rap(nom, bb):
        if bb is None:
            print(f'  {nom:20s} ABSENT')
            return None
        x0, y0, x1, y1, n = bb
        w, h = (x1 - x0 + 1) / ech, (y1 - y0 + 1) / ech
        cxr = ((x0 + x1) / 2 - cx0) / ech
        print(f'  {nom:20s} bbox CSS x {(x0-cx0)/ech:6.2f}..{(x1-cx0)/ech:6.2f} '
              f'y {(y0-cy0)/ech:6.2f}..{(y1-cy0)/ech:6.2f}  '
              f'l={w:6.2f} h={h:6.2f}  '
              f'l/carte={100*w/Wc:5.1f}%  h/carte={100*h/Hc:5.1f}%  '
              f'centre_x={cxr:6.2f} (carte centre {(kx0+kx1)/2:.2f})  '
              f'aire/boite={n/((x1-x0+1)*(y1-y0+1)):.3f}')
        return bb

    rap('dore (bord carte)', bbox_of(im, X0 - 4, X1 + 5, Y0 - 4, Y1 + 5, 'dore'))
    # buste + cheveux : sous la moitie haute
    rap('sombre (buste+chev)', bbox_of(im, X0, X1, Y0, Y1, 'buste_sombre'))
    creme = rap('creme (visage+col)', bbox_of(im, X0, X1, Y0, Y1, 'chair_ou_creme'))

    # decoupe verticale de la classe creme : visage (haut) vs col+cravate (bas)
    if creme:
        cx_min, cy_min, cx_max, cy_max, _ = creme
        rows = rows_of(im, X0, X1, cy_min, cy_max + 1, 'chair_ou_creme')
        print('  profil de largeur de la classe creme (y_css : x0_css..x1_css , largeur CSS) :')
        prev_w = None
        for y, r in rows:
            if r is None:
                continue
            w = (r[1] - r[0] + 1) / ech
            ycss = (y - cy0) / ech
            # n'imprimer que les changements notables
            if prev_w is None or abs(w - prev_w) > 1.2:
                print(f'      y={ycss:7.2f}  x {(r[0]-cx0)/ech:6.2f}..{(r[1]-cx0)/ech:6.2f}  '
                      f'l={w:6.2f} CSS ({100*w/Wc:4.1f}% carte)')
                prev_w = w
    print()


print('--- controle negatif : la classe "chair_ou_creme" hors carte portrait ---')
for spec in (REF, CAP):
    lab, path, ech, cx0, cy0, kx0, kx1, ky0, ky1 = spec
    im = Image.open(path).convert('RGB')
    bb = bbox_of(im, int(cx0 + 150 * ech), int(cx0 + 270 * ech),
                 int(cy0 + 125 * ech), int(cy0 + 145 * ech), 'chair_ou_creme')
    print(f'  {lab} zone titre de la liste (que du texte gris/creme) -> '
          f'{"trouve " + str(bb[4]) + " px" if bb else "rien"}')
print()

for spec in (REF, CAP):
    run(spec)
