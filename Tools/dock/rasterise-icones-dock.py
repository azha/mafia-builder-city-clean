#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rastérise les icônes du DOCK depuis leur SVG source (24×24), en PIL, sans navigateur — et vérifie sa propre sortie.

Pourquoi (2026-09-23) : le dock dessine ses icônes à 20 CSS px, soit ≈ 65 px à l'écran (`AppShell.Px`, ×3,27) ; le plus grand raster
livré au client fait 48 px. Il faut du 64 et du 96, depuis la SOURCE, sans changer le dessin. Le rendu est déposé sous `Tools/dock/`,
pas sous `Assets/` : CLIENT-1 monte, dans le cumul.

Primitives lues (celles des SVG du client) : `rect` (plein ou trait), `circle` (plein ou trait), `polygon` (plein ou trait, jointure
ronde), `polyline` et `line` (trait, bout rond). Suréchantillonnage ×16 puis réduction (moyenne de boîte) : l'anticrénelage.

Deux contrôles, AVANT de livrer :
  1. **BBOX CONTRE LA GÉOMÉTRIE** (le patron de `rasterise-bustes.py`) : les bornes de l'encre rendue doivent tomber à ≤ 1 px des bornes
     CALCULÉES sur la géométrie source (demi-largeur de trait comprise) — un crop ou un décalage rougit ;
  2. **CONTRÔLE POSITIF CONTRE LE CLIENT** : chaque icône déjà livrée est re-rendue à 32 px et comparée au raster 32 px du client. ⚠️
     Mesuré le 2026-09-23 : les rasters du client sont BINAIRES (alpha 0 ou 255, sans anticrénelage — l'exportateur cale sur la grille).
     Une comparaison en niveaux de gris accusait l'anticrénelage, pas le dessin (0,043 sur le bureau, pour 0 pixel de forme différent).
     ⇒ La comparaison se fait sur la FORME : mon rendu binarisé à 50 % contre le masque du client ; pixels différents ≤ 10 % de l'encre
     du client. Écart résiduel connu : l'engrenage (« plus ») a un liseré d'1 px de plus chez moi — c'est le client qui dessine le trait
     plus mince que le SVG ne le dit ; mon rendu tombe sur la géométrie (contrôle 1).

Usage : python3 Tools/dock/rasterise-icones-dock.py [--controle]
"""
import os, re, sys
from PIL import Image, ImageDraw

ICI = os.path.dirname(os.path.abspath(__file__))
CLIENT_ICONES = '/home/erutheone/project/mafia-unity-F/Assets/Art/Icons'
SS = 16                                            # suréchantillonnage
TAILLES = (64, 96)

EXISTANTES = {                                     # dock → source du client (identiques au canon, écart RGBA 0 — 18-… §1)
    'empire':  f'{CLIENT_ICONES}/Source/icon_building_office.svg',
    'famille': f'{CLIENT_ICONES}/Source/icon_more_menu_recruitment.svg',
    'plus':    f'{CLIENT_ICONES}/Source/icon_more_menu_settings.svg',
}
FILIERE = {k: os.path.join(ICI, 'source', f'icon_dock_filiere{s}.svg') for k, s in
           (('filiere', ''), ('filiere_carre', '_carre'), ('filiere_maillons', '_maillons'))}
TEMOIN = {'temoin_dependance': f'{CLIENT_ICONES}/Source/icon_slot_dependency_arrow.svg'}

def attrs(tag):
    return dict(re.findall(r'([\w-]+)="([^"]*)"', tag))

def couleur(c):
    c = c.lstrip('#'); return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))

def primitives(svg):
    """[(type, attributs)] dans l'ordre du fichier, viewBox vérifiée 0 0 24 24."""
    assert re.search(r'viewBox="0 0 24 24"', svg), 'viewBox attendue : 0 0 24 24'
    return [(m.group(1), attrs(m.group(0))) for m in re.finditer(r'<(rect|circle|polygon|polyline|line)\b[^>]*/?>', svg)]

def points(a):
    v = [float(x) for x in re.split(r'[\s,]+', a['points'].strip())]; return list(zip(v[0::2], v[1::2]))

def bbox_geometrie(prims):
    xs, ys = [], []
    for t, a in prims:
        w = float(a.get('stroke-width', 0)) / 2 if a.get('stroke') not in (None, 'none') else 0
        if t == 'rect':
            x, y, W, H = (float(a[k]) for k in ('x', 'y', 'width', 'height')); xs += [x - w, x + W + w]; ys += [y - w, y + H + w]
        elif t == 'circle':
            cx, cy, r = (float(a[k]) for k in ('cx', 'cy', 'r')); xs += [cx - r - w, cx + r + w]; ys += [cy - r - w, cy + r + w]
        elif t in ('polygon', 'polyline'):
            for x, y in points(a): xs += [x - w, x + w]; ys += [y - w, y + w]
        elif t == 'line':
            for x, y in ((float(a['x1']), float(a['y1'])), (float(a['x2']), float(a['y2']))): xs += [x - w, x + w]; ys += [y - w, y + w]
    return min(xs), min(ys), max(xs), max(ys)

def rendre(svg, taille):
    prims = primitives(svg); N = taille * SS; k = N / 24.0
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    P = lambda x, y: (x * k, y * k)
    for t, a in prims:
        fill = couleur(a['fill']) + (255,) if a.get('fill') not in (None, 'none') else None
        st = couleur(a['stroke']) + (255,) if a.get('stroke') not in (None, 'none') else None
        sw = float(a.get('stroke-width', 0)) * k
        def trait(pts, ferme):
            seq = pts + ([pts[0]] if ferme else [])
            for (x1, y1), (x2, y2) in zip(seq, seq[1:]): d.line([P(x1, y1), P(x2, y2)], fill=st, width=max(1, round(sw)))
            for x, y in (pts if ferme else pts):                          # jointures et bouts ronds
                cx, cy = P(x, y); d.ellipse([cx - sw / 2, cy - sw / 2, cx + sw / 2, cy + sw / 2], fill=st)
        if t == 'rect':
            x, y, W, H = (float(a[kk]) for kk in ('x', 'y', 'width', 'height')); rx = float(a.get('rx', 0)) * k
            box = [*P(x, y), *P(x + W, y + H)]
            if fill: d.rounded_rectangle(box, radius=rx, fill=fill)
            if st:                                                          # trait centré sur le bord
                d.rounded_rectangle([box[0] - sw / 2, box[1] - sw / 2, box[2] + sw / 2, box[3] + sw / 2], radius=rx, outline=st, width=round(sw))
        elif t == 'circle':
            cx, cy, r = (float(a[kk]) for kk in ('cx', 'cy', 'r')); cx, cy = P(cx, cy); r *= k
            if fill: d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
            if st: d.ellipse([cx - r - sw / 2, cy - r - sw / 2, cx + r + sw / 2, cy + r + sw / 2], outline=st, width=round(sw))
        elif t == 'polygon':
            pts = points(a)
            if fill: d.polygon([P(x, y) for x, y in pts], fill=fill)
            if st: trait(pts, True)
        elif t == 'polyline':
            trait(points(a), False)
        elif t == 'line':
            trait([(float(a['x1']), float(a['y1'])), (float(a['x2']), float(a['y2']))], False)
    return im.resize((taille, taille), Image.BOX), bbox_geometrie(prims)

def bbox_alpha(im, seuil=8):
    return im.getchannel('A').point(lambda v: 255 if v > seuil else 0).getbbox()

def ecart_alpha(a, b):
    A, B = a.getchannel('A'), b.convert('RGBA').getchannel('A')
    return sum(abs(x - y) for x, y in zip(A.getdata(), B.getdata())) / (255.0 * a.size[0] * a.size[1])

def main():
    controle = '--controle' in sys.argv; rouges = []
    # contrôle positif : ce rastériseur doit retrouver les 32 px que le client a déjà
    for nom, src in EXISTANTES.items():
        base = os.path.basename(src)[:-4]
        im32, _ = rendre(open(src).read(), 32)
        mien = [v >= 128 for v in im32.getchannel('A').getdata()]
        leur = [v >= 128 for v in Image.open(f'{CLIENT_ICONES}/{base}_32.png').convert('RGBA').getchannel('A').getdata()]
        diff = sum(x != y for x, y in zip(mien, leur)); encre = max(1, sum(leur)); e = diff / encre
        print(f'contrôle positif {nom:8} ({base}_32) : {diff} pixel(s) de forme différents / {encre} d\'encre ({100 * e:.1f} %)' + ('  ✅' if e <= 0.10 else '  ⛔'))
        if e > 0.10: rouges.append(f'{nom} : {100 * e:.1f} % > 10 %')
    sortie = os.path.join(ICI, 'icones'); os.makedirs(sortie, exist_ok=True)
    for nom, src in {**EXISTANTES, **FILIERE, **TEMOIN}.items():
        svg = open(src).read()
        for t in TAILLES:
            im, (x0, y0, x1, y1) = rendre(svg, t); k = t / 24.0
            attendu = (x0 * k, y0 * k, x1 * k, y1 * k); vu = bbox_alpha(im)
            ok = vu and all(abs(v - a) <= 1.0 + (0 if i < 2 else 0) for i, (v, a) in enumerate(zip(vu, attendu)))
            print(f'  {nom:18} {t:3} px : bbox encre {vu} · géométrie {tuple(round(v, 1) for v in attendu)}' + ('  ✅' if ok else '  ⛔'))
            if not ok: rouges.append(f'{nom} {t} : bbox {vu} ≠ {attendu}')
            if not controle: im.save(os.path.join(sortie, f'dock_{nom}_{t}.png'))
    print(('\n⛔ ' + '\n⛔ '.join(rouges)) if rouges else '\n0 défaut')
    sys.exit(1 if rouges else 0)

if __name__ == '__main__':
    main()
