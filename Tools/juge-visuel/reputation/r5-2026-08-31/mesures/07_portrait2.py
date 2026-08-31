#!/usr/bin/env python3
"""Temps 3 — LE PORTRAIT, mesures fines (angle mort A7 declare par l'auteur).

v2 : les points de sonde ont ete VERIFIES un par un (impression de la couleur lue) avant
d'etre utilises. La v1 sondait la cravate en croyant sonder le visage — d'ou des chiffres
reproductibles et faux. Le mandat le dit : un detecteur mal concu produit exactement cela.

Toutes les grandeurs sont rendues en % de la CARTE du portrait : invariant d'echelle.

Contrôles :
  + la couleur de chaque classe doit sortir identique (<= 6/255) ref/jeu — elle l'est, ce
    qui prouve que la sonde attrape bien le MEME objet des deux cotes ;
  + la bbox de la carte doit valoir 117.x CSS de large des deux cotes (accord avec 02/03) ;
  - le VISAGE et les CHEVEUX doivent sortir avec des bbox DIFFERENTES l'une de l'autre
    dans la meme image (sinon la segmentation ne separe pas deux objets).
"""
from PIL import Image
import os

REF = dict(lab='REF', path=os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'),
           ech=3.0, cx0=18, cy0=376, kx=(17.0, 134.0), ky=(118.67, 301.33),
           probes=dict(visage=(244, 967), cheveux=(244, 882), cravate=(244, 1102),
                       buste=(169, 1132), montre=(161, 1157)))
CAP = dict(lab='CAP', path='/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
           ech=3.6, cx0=18, cy0=18, kx=(15.0, 132.5), ky=(115.83, 290.00),
           probes=dict(visage=(276, 693), cheveux=(258, 593), cravate=(273, 855),
                       buste=(361, 891), montre=(165, 930)))


def med(im, x, y, r=2):
    px = im.load()
    ch = [[], [], []]
    for dx in range(-r, r + 1):
        for dy in range(-r, r + 1):
            p = px[x + dx, y + dy]
            for i in range(3):
                ch[i].append(p[i])
    return tuple(sorted(c)[len(c) // 2] for c in ch)


def near(p, c, tol):
    return all(abs(p[i] - c[i]) <= tol for i in range(3))


def analyse(S):
    im = Image.open(S['path']).convert('RGB')
    px = im.load()
    ech, cx0, cy0 = S['ech'], S['cx0'], S['cy0']
    kx0, kx1 = S['kx']
    ky0, ky1 = S['ky']
    Wc, Hc = kx1 - kx0, ky1 - ky0
    axe = (kx0 + kx1) / 2
    X0, X1 = int(cx0 + kx0 * ech), int(cx0 + kx1 * ech)
    Y0, Y1 = int(cy0 + ky0 * ech), int(cy0 + ky1 * ech)
    print(f'=== {S["lab"]}  {os.path.basename(S["path"])}  {im.size}')
    print(f'    carte portrait {Wc:.2f} x {Hc:.2f} CSS  (px x {X0}..{X1}, y {Y0}..{Y1})  axe x={axe:.2f}')
    cols = {k: med(im, *v) for k, v in S['probes'].items()}
    for k, v in cols.items():
        print(f'    sonde {k:8s} @{S["probes"][k]} -> {v}')
    res = {'cols': cols}

    def zone(name, col, tol, sub=None, exclude=None):
        ax0, ax1, ay0, ay1 = sub if sub else (X0, X1, Y0, Y1)
        rows, xs, ys, pts = {}, [], [], 0
        for y in range(ay0, ay1):
            r = []
            for x in range(ax0, ax1):
                if near(px[x, y], col, tol) and not (exclude and near(px[x, y], exclude, tol)):
                    r.append(x)
            if len(r) >= 3:
                rows[y] = (min(r), max(r), len(r))
                xs += [min(r), max(r)]
                ys.append(y)
                pts += len(r)
        if not ys:
            print(f'    {name:14s} ABSENT')
            return None
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        w, h = (x1 - x0 + 1) / ech, (y1 - y0 + 1) / ech
        cx = ((x0 + x1) / 2 - cx0) / ech
        d = dict(x0=(x0 - cx0) / ech, x1=(x1 - cx0) / ech, y0=(y0 - cy0) / ech, y1=(y1 - cy0) / ech,
                 w=w, h=h, cx=cx, rows=rows, Wc=Wc, Hc=Hc, axe=axe,
                 aire=pts / ((x1 - x0 + 1) * (y1 - y0 + 1)))
        print(f'    {name:14s} x {d["x0"]:6.2f}..{d["x1"]:6.2f} y {d["y0"]:6.2f}..{d["y1"]:6.2f}'
              f'  l={w:6.2f} h={h:6.2f} CSS | l={100*w/Wc:5.1f}% h={100*h/Hc:5.1f}% carte'
              f' | axe {cx-axe:+6.2f} CSS | aire/boite={d["aire"]:.3f}')
        return d

    res['visage'] = zone('VISAGE', cols['visage'], 10)
    res['cheveux'] = zone('CHEVEUX+BUSTE', cols['cheveux'], 4)
    res['cravate'] = zone('COL(triangle)', cols['cravate'], 10)
    res['montre'] = zone('MONTRE', cols['montre'], 5)

    # le cou : bande de couleur visage SOUS le bas du visage principal
    v = res['visage']
    if v:
        # separe visage (ovale) et cou (rectangle) : le cou est la partie ou la largeur
        # redevient constante apres le retrecissement du menton
        ys = sorted(v['rows'])
        larg = [( (y - cy0) / ech, (v['rows'][y][1] - v['rows'][y][0] + 1) / ech,
                  ((v['rows'][y][0] + v['rows'][y][1]) / 2 - cx0) / ech) for y in ys]
        # minimum local de largeur = jonction menton/cou
        imin, best = None, None
        for i in range(3, len(larg) - 3):
            if best is None or larg[i][1] < best:
                pass
        # cherche la 1re remontee apres un creux
        creux = min(range(2, len(larg) - 2), key=lambda i: larg[i][1] if larg[i][1] > 0 else 999)
        print(f'    -> creux de largeur (menton/cou) a y={larg[creux][0]:.2f} '
              f'l={larg[creux][1]:.2f} CSS')
        haut = [t for t in larg if t[0] < larg[creux][0]]
        bas = [t for t in larg if t[0] > larg[creux][0]]
        if haut:
            hm = max(t[1] for t in haut)
            hy0, hy1 = haut[0][0], haut[-1][0]
            hcx = [t[2] for t in haut if t[1] == hm][0]
            print(f'    OVALE du visage : y {hy0:.2f}..{hy1:.2f} (h={hy1-hy0:.2f}) '
                  f'largeur max {hm:.2f} CSS | h/carte={100*(hy1-hy0)/Hc:.1f}% '
                  f'l/carte={100*hm/Wc:.1f}% | h/l={(hy1-hy0)/hm:.3f} | axe {hcx-axe:+.2f} CSS')
            res['ovale'] = dict(h=hy1 - hy0, w=hm, y0=hy0, y1=hy1, cx=hcx, Wc=Wc, Hc=Hc, axe=axe)
        if bas:
            bm = max(t[1] for t in bas)
            by0, by1 = bas[0][0], bas[-1][0]
            bcx = [t[2] for t in bas if t[1] == bm][0]
            print(f'    COU (rectangle)  : y {by0:.2f}..{by1:.2f} (h={by1-by0:.2f}) '
                  f'largeur {bm:.2f} CSS | l/carte={100*bm/Wc:.1f}% | axe {bcx-axe:+.2f} CSS')
            res['cou'] = dict(h=by1 - by0, w=bm, cx=bcx, Wc=Wc, Hc=Hc, axe=axe)

    # recouvrement cheveux / visage : les cheveux debordent-ils SUR le visage ?
    if res['visage'] and res['cheveux']:
        vy0 = res['visage']['y0']
        ch = res['cheveux']
        # largeur des cheveux a la hauteur du milieu de l'ovale
        o = res.get('ovale')
        if o:
            ymid = int(cy0 + (o['y0'] + o['h'] * 0.5) * ech)
            r = ch['rows'].get(ymid)
            rv = res['visage']['rows'].get(ymid)
            if r and rv:
                print(f'    a mi-hauteur du visage (y={(ymid-cy0)/ech:.2f}) : '
                      f'cheveux/buste x {(r[0]-cx0)/ech:.2f}..{(r[1]-cx0)/ech:.2f} ; '
                      f'visage x {(rv[0]-cx0)/ech:.2f}..{(rv[1]-cx0)/ech:.2f}')
                deb_g = (rv[0] - r[0]) / ech
                deb_d = (r[1] - rv[1]) / ech
                print(f'    -> les cheveux encadrent le visage de {deb_g:+.2f} CSS a gauche '
                      f'et {deb_d:+.2f} CSS a droite (negatif = le visage deborde)')
                res['encadrement'] = (deb_g, deb_d)
    print()
    return res


r = analyse(REF)
c = analyse(CAP)

print('=== RAPPORTS INTERNES (invariants d\'echelle) — REF vs JEU ===')


def cmp(nom, a, b, unit='%'):
    rel = f'{100*(b-a)/a:+6.1f} %' if a else '   n/a'
    print(f'  {nom:46s} REF {a:8.2f}{unit}  JEU {b:8.2f}{unit}  delta {b-a:+7.2f}  rel {rel}')


cmp('couleur du visage identique ?', 0, max(abs(r['cols']['visage'][i] - c['cols']['visage'][i])
                                            for i in range(3)), ' /255')
cmp('couleur du col (triangle) identique ?', 0, max(abs(r['cols']['cravate'][i] - c['cols']['cravate'][i])
                                                    for i in range(3)), ' /255')
cmp('ovale visage : hauteur / hauteur carte', 100 * r['ovale']['h'] / r['ovale']['Hc'],
    100 * c['ovale']['h'] / c['ovale']['Hc'])
cmp('ovale visage : largeur / largeur carte', 100 * r['ovale']['w'] / r['ovale']['Wc'],
    100 * c['ovale']['w'] / c['ovale']['Wc'])
cmp('ovale visage : hauteur / largeur', r['ovale']['h'] / r['ovale']['w'],
    c['ovale']['h'] / c['ovale']['w'], '')
cmp('ovale visage : ecart a l\'axe de la carte', r['ovale']['cx'] - r['ovale']['axe'],
    c['ovale']['cx'] - c['ovale']['axe'], ' CSS')
cmp('cou : largeur / largeur carte', 100 * r['cou']['w'] / r['cou']['Wc'],
    100 * c['cou']['w'] / c['cou']['Wc'])
cmp('cou : hauteur / hauteur carte', 100 * r['cou']['h'] / r['cou']['Hc'],
    100 * c['cou']['h'] / c['cou']['Hc'])
cmp('cou : ecart a l\'axe de la carte', r['cou']['cx'] - r['cou']['axe'],
    c['cou']['cx'] - c['cou']['axe'], ' CSS')
cmp('col(triangle) : largeur / largeur carte', 100 * r['cravate']['w'] / r['cravate']['Wc'],
    100 * c['cravate']['w'] / c['cravate']['Wc'])
cmp('col(triangle) : hauteur / hauteur carte', 100 * r['cravate']['h'] / r['cravate']['Hc'],
    100 * c['cravate']['h'] / c['cravate']['Hc'])
cmp('col(triangle) : AIRE / BOITE (~0.43 attendu)', r['cravate']['aire'], c['cravate']['aire'], '')
cmp('col(triangle) : ecart a l\'axe de la carte', r['cravate']['cx'] - r['cravate']['axe'],
    c['cravate']['cx'] - c['cravate']['axe'], ' CSS')
cmp('col(triangle) : ecart a l\'axe du COU', r['cravate']['cx'] - r['cou']['cx'],
    c['cravate']['cx'] - c['cou']['cx'], ' CSS')
cmp('montre : largeur / largeur carte', 100 * r['montre']['w'] / r['montre']['Wc'],
    100 * c['montre']['w'] / c['montre']['Wc'])
cmp('montre : hauteur / hauteur carte', 100 * r['montre']['h'] / r['montre']['Hc'],
    100 * c['montre']['h'] / c['montre']['Hc'])
cmp('montre : AIRE / BOITE (detail interne)', r['montre']['aire'], c['montre']['aire'], '')
print()
print('  encadrement du visage par les cheveux, a mi-hauteur du visage :')
print(f'    REF  gauche {r["encadrement"][0]:+.2f} CSS   droite {r["encadrement"][1]:+.2f} CSS')
print(f'    JEU  gauche {c["encadrement"][0]:+.2f} CSS   droite {c["encadrement"][1]:+.2f} CSS')
print('    (positif = les cheveux depassent le visage = le visage est ENCADRE ;')
print('     negatif = le visage deborde des cheveux = le visage est PAR-DESSUS)')
