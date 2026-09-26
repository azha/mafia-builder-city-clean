#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Toutes les sondes du juge visuel ⊥ de ④ (r1, 2026-09-26), en un seul instrument.

Usage : mesures.py [m7b m8 m9 ...]   (sans argument : tout)
Chaque section imprime la TAILLE des images qu'elle ouvre. Les sorties de référence sont collées
dans `sortie-<section>.txt` à côté.

⚠️ Deux sections de ce fichier existent pour documenter un instrument RÉFUTÉ :
   - `m4`/`m6` (seuil dérivé = médiane de fenêtre + 40) rendaient « tronqué » sur TOUTES les
     fenêtres — un résultat UNIFORME, donc l'instrument mesurait le fond peint et non le texte ;
   - `m7b` les remplace par un seuil ABSOLU (L>=120), avec un contrôle négatif (chrome sans texte)
     qui doit rendre 0 %.
   Le remplacement n'efface pas le réfuté : c'est lui qui prouve que la mesure retenue discrimine.

Contrôles présents dans le fichier, et ce qu'ils protègent :
   - `m2`  : contrôle NÉGATIF sur la référence (aucun filet) — sans lui, « 90 px de bande » pourrait
             être un artefact de l'instrument et non un objet de l'écran ;
   - `m9`  : borne x<440 — sans elle la sonde OR remonte jusqu'à x=636, c'est-à-dire qu'elle mesure
             l'anneau du médaillon en croyant mesurer le montant ;
   - `m22` : profil d'encre ligne par ligne — sépare le glyphe du SOULIGNÉ POINTILLÉ « PROPOSÉ » ;
   - `m31` : la somme des parts de palette doit valoir 100 % ;
   - `m39` : contrôle sur un aplat (les deux côtés doivent rendre le même écart-type ~3).
"""
import os, sys
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
REF4 = os.path.join(ICI, '../reference/cadre-4-la-suite.png')
REF0 = os.path.join(ICI, '../reference/cadre-0-rien-a-trancher.png')
REF3 = os.path.join(ICI, '../reference/cadre-3-file-sous-pression.png')
J24 = os.path.join(ICI, '../captures/p1_lancement_1080x2400.png')
J19 = os.path.join(ICI, '../captures/p1_lancement_1080x1920.png')

lum = lambda t: (t[0] * 299 + t[1] * 587 + t[2] * 114) // 1000


def ouvre(p):
    im = Image.open(p).convert('RGB')
    return im, im.load(), im.size


def bbox(p, box, nom, Lmin=120):
    """bbox d'encre au seuil ABSOLU ; dit si elle touche un bord (= mesure tronquée)."""
    im, px, (W, H) = ouvre(p)
    pts = [(x, y) for y in range(box[1], box[3]) for x in range(box[0], box[2]) if lum(px[x, y]) >= Lmin]
    if not pts:
        print('  %-38s %dx%d  %s  ENCRE 0 %%' % (nom, W, H, box)); return None
    xs = [a for a, _ in pts]; ys = [b for _, b in pts]
    bb = (min(xs), min(ys), max(xs), max(ys))
    col = [s for s, t in (('G', bb[0] == box[0]), ('D', bb[2] == box[2] - 1),
                          ('H', bb[1] == box[1]), ('B', bb[3] == box[3] - 1)) if t]
    print('  %-38s %dx%d n=%5d bbox=(%4d,%4d,%4d,%4d) l=%3d h=%3d %s'
          % (nom, W, H, len(pts), *bb, bb[2] - bb[0] + 1, bb[3] - bb[1] + 1,
             'TRONQUEE:' + ''.join(col) if col else 'OK'))
    return bb


def mediane(p, box, nom):
    im = Image.open(p).convert('RGB'); c = im.crop(box); d = list(c.getdata()); n = len(d) // 2
    v = (sorted(t[0] for t in d)[n], sorted(t[1] for t in d)[n], sorted(t[2] for t in d)[n])
    print('  %-38s %dx%d  %s  RGB=(%3d,%3d,%3d)' % (nom, im.size[0], im.size[1], box, *v))
    return v


def blocs_encre(p, x0, x1, y0, y1, nom, Lmin=110):
    """blocs de lignes CONTIGUES d'encre : separe un glyphe de son souligne pointille."""
    im, px, (W, H) = ouvre(p)
    runs = []; deb = None
    for y in range(y0, y1):
        n = sum(1 for x in range(x0, x1) if lum(px[x, y]) >= Lmin)
        if n and deb is None: deb = y
        if not n and deb is not None: runs.append((deb, y - 1)); deb = None
    if deb is not None: runs.append((deb, y1 - 1))
    print('  %-38s %dx%d cols %d..%d : %s' % (nom, W, H, x0, x1,
          ', '.join('y=%d..%d (h=%d)' % (a, b, b - a + 1) for a, b in runs) or 'rien'))
    return runs


# ─────────────────────────────────────────────────────────────────────────────
def m2():
    """La bande sombre : borne basse DERIVEE de la courbe, pas choisie. Controle negatif : REF."""
    BX = list(range(8, 340)) + list(range(740, 1072))
    for nom, p in (('REF cadre 4', REF4), ('REF cadre 0', REF0), ('JEU 1920', J19), ('JEU 2400', J24)):
        im, px, (W, H) = ouvre(p)
        prof = [sorted(lum(px[x, y]) for x in BX)[len(BX) // 2] for y in range(420)]
        pic, yp = -1, None
        for y in range(20, 320):
            d = prof[y] - max(prof[y - 6], prof[y + 6])
            if d > pic: pic, yp = d, y
        print('\n  %-14s %dx%d  colonnes echantillonnees=%d' % (nom, W, H, len(BX)))
        print('     pic de filet : y=%d  mediane=%d  ecart aux voisins=+%d%s'
              % (yp, prof[yp], pic, '   -> AUCUN filet' if pic < 8 else ''))
        coeur = max(prof[yp + 4:yp + 41]); seuil = coeur + 2
        y = yp + 4
        while y < 419 and prof[y] <= seuil: y += 1
        print('     coeur=%d seuil derive=%d  -> bande y=%d..%d = %d px (%.1f %% de la hauteur)'
              % (coeur, seuil, yp + 1, y - 1, y - 1 - yp, 100.0 * (y - 1 - yp) / H))


def m7b():
    print('seuil ABSOLU L>=120 ; les 3 images font 1080 de large')
    bbox(REF4, (60, 30, 320, 78), 'REF ARGENT'); bbox(J24, (60, 14, 320, 54), 'J24 ARGENT')
    bbox(REF4, (860, 30, 1045, 74), 'REF JOUR 12'); bbox(J24, (880, 14, 1045, 56), 'J24 JOUR 1')
    bbox(REF4, (790, 76, 1045, 140), 'REF Plein jour'); bbox(J24, (900, 58, 1045, 110), 'J24 Aube')
    print('  -- controles negatifs (chrome sans texte) --')
    bbox(J24, (620, 10, 760, 60), 'CTRL NEG chrome jeu')
    bbox(REF4, (640, 10, 780, 40), 'CTRL NEG chrome ref')


def m8():
    """L'ornement gris : masque GRIS NEUTRE, qui exclut l'or du montant et le creme du libelle."""
    print("masque : 55<=L<=150, max-min canal <=18, b>=r ; fenetre (0,30,160,130)")
    for nom, p in (('REF cadre 0', REF0), ('REF cadre 3', REF3), ('REF cadre 4', REF4),
                   ('JEU 2400', J24), ('JEU 1920', J19)):
        im, px, (W, H) = ouvre(p)
        pts = []
        for y in range(30, 130):
            for x in range(0, 160):
                r, g, b = px[x, y]
                if 55 <= lum((r, g, b)) <= 150 and max(r, g, b) - min(r, g, b) <= 18 and b >= r:
                    pts.append((x, y))
        if pts:
            xs = [a for a, _ in pts]; ys = [b for _, b in pts]
            print('  %-14s %dx%d n=%4d bbox=(%d,%d,%d,%d)' % (nom, W, H, len(pts),
                  min(xs), min(ys), max(xs), max(ys)))
        else:
            print('  %-14s %dx%d n=   0  AUCUN ornement gris' % (nom, W, H))
    im, px, _ = ouvre(J24)
    print('  echantillons RGB sur l ornement :', [px[x, y] for x, y in [(20, 71), (40, 71), (66, 60)]])


def m9():
    """Montant : encre OR segmentee en chiffres. Borne x<440 OBLIGATOIRE (sinon : le medaillon)."""
    def seg(p, box, nom, trou=4):
        im, px, (W, H) = ouvre(p)
        ok = lambda x, y: (lambda r, g, b: lum((r, g, b)) >= 90 and r - b >= 45)(*px[x, y])
        cols = [any(ok(x, y) for y in range(box[1], box[3])) for x in range(box[0], box[2])]
        gr = []; deb = None; vide = 0
        for i, c in enumerate(cols):
            if c:
                if deb is None: deb = i
                vide = 0
            elif deb is not None:
                vide += 1
                if vide > trou: gr.append((deb, i - vide)); deb = None; vide = 0
        if deb is not None: gr.append((deb, len(cols) - 1))
        print('  %-26s %dx%d fenetre %s : %d groupes' % (nom, W, H, box, len(gr)))
        for i, (a, b) in enumerate(gr):
            ys = [y for y in range(box[1], box[3]) for x in range(box[0] + a, box[0] + b + 1) if ok(x, y)]
            print('     g%d x=%4d..%-4d l=%2d y=%3d..%-3d h=%2d'
                  % (i, box[0] + a, box[0] + b, b - a + 1, min(ys), max(ys), max(ys) - min(ys) + 1))
    print('CONTROLE : sans la borne x<440 la bbox va jusqu a x=636 = l anneau du medaillon')
    seg(REF4, (30, 70, 300, 170), 'REF 24 850 EUR')
    seg(J24, (30, 52, 300, 140), 'J24 10 000 EUR')


def m11():
    """Medaillon : diametre horizontal par encre or sur la ligne du centre."""
    for nom, p, cy in (('REF', REF4, 115), ('J24', J24, 90), ('J19', J19, 90)):
        im, px, (W, H) = ouvre(p)
        ok = lambda x, y: (lambda r, g, b: lum((r, g, b)) >= 70 and r - b >= 35)(*px[x, y])
        xs = [x for x in range(320, 760) if any(ok(x, y) for y in range(cy - 8, cy + 8))]
        print('  %-5s %dx%d ligne y=%d : or de x=%d a x=%d -> diametre H = %d (centre %.1f)'
              % (nom, W, H, cy, min(xs), max(xs), max(xs) - min(xs) + 1, (min(xs) + max(xs)) / 2))


def m12():
    """Filet or du bandeau : present ? traverse-t-il ? et le losange sous le medaillon."""
    im, px, (W, H) = ouvre(J24)
    print('  J24 %dx%d ligne y=141 :' % (W, H),
          ' '.join('%d:%s' % (x, px[x, 141]) for x in [10, 200, 440, 500, 540, 610, 640, 900, 1070]))
    for nom, p in (('REF', REF4), ('J24', J24)):
        im, px, (W, H) = ouvre(p)
        print('  %-5s %dx%d mediane de ligne x 100..400 :' % (nom, W, H),
              ' '.join('y%d=%d' % (y, sorted(lum(px[x, y]) for x in range(100, 400))[150])
                       for y in range(135, 152, 2)))
    for nom, p, box in (('REF sous medaillon', REF4, (480, 222, 600, 300)),
                        ('J24 sous medaillon', J24, (480, 196, 600, 250))):
        im, px, (W, H) = ouvre(p)
        pts = [(x, y) for y in range(box[1], box[3]) for x in range(box[0], box[2])
               if lum(px[x, y]) >= 70 and px[x, y][0] - px[x, y][2] >= 35]
        print('  %-20s %dx%d n=%d %s' % (nom, W, H, len(pts),
              'bbox=(%d,%d,%d,%d)' % (min(a for a, _ in pts), min(b for _, b in pts),
                                      max(a for a, _ in pts), max(b for _, b in pts)) if pts else 'AUCUN'))


def m20():
    """Carte verticale du panneau : bandes d'encre dans la colonne de gauche (x 80..640)."""
    def bandes(p, y0, y1, nom, Lmin=110, trou=6):
        im, px, (W, H) = ouvre(p)
        lignes = [any(lum(px[x, y]) >= Lmin for x in range(80, 640)) for y in range(y0, y1)]
        out = []; deb = None; vide = 0
        for i, c in enumerate(lignes):
            if c:
                if deb is None: deb = i
                vide = 0
            elif deb is not None:
                vide += 1
                if vide > trou: out.append((y0 + deb, y0 + i - vide)); deb = None; vide = 0
        print('  %-14s %dx%d -> %d bandes' % (nom, W, H, len(out)))
        for a, b in out:
            d = [px[x, y] for y in range(a, b + 1) for x in range(80, 640) if lum(px[x, y]) >= Lmin]
            n = len(d) // 2
            print('     y=%4d..%-4d h=%3d encre RGB=(%3d,%3d,%3d)' % (a, b, b - a + 1,
                  sorted(t[0] for t in d)[n], sorted(t[1] for t in d)[n], sorted(t[2] for t in d)[n]))
    bandes(REF4, 745, 1580, 'REF panneau'); bandes(J24, 1270, 1560, 'J24 panneau')


def m21():
    print('fenetres bornees a x<640 (REF, bouton a x>=654) et x<700 (J24, bouton a x>=714)')
    bbox(REF4, (85, 845, 645, 895), 'REF titre r1'); bbox(J24, (70, 1374, 705, 1424), 'J24 titre r1')
    bbox(REF4, (85, 908, 645, 948), 'REF sous-ligne r1'); bbox(J24, (70, 1424, 705, 1458), 'J24 sous-ligne r1')
    bbox(REF4, (400, 772, 700, 800), 'REF LA SUITE'); bbox(J24, (400, 1322, 700, 1350), 'J24 LA SUITE')


def m22():
    """Hauteur de CAPITALE : blocs contigus -> exclut le souligne pointille « PROPOSE »."""
    blocs_encre(REF4, 99, 126, 850, 900, 'REF « L » de « Le labo »')
    blocs_encre(J24, 83, 107, 1380, 1418, 'J24 « L » de « Le labo »')
    blocs_encre(REF4, 99, 124, 905, 955, 'REF « S » de « Sans lui »')
    blocs_encre(J24, 83, 104, 1425, 1460, 'J24 « S » de « Sans lui »')
    blocs_encre(REF4, 456, 478, 772, 805, 'REF « L » de « LA SUITE »')
    blocs_encre(J24, 473, 492, 1322, 1352, 'J24 « L » de « LA SUITE »')


def m16():
    mediane(REF4, (300, 900, 420, 940), 'REF fond du panneau')
    mediane(J24, (300, 1430, 420, 1460), 'J24 fond du panneau')
    mediane(REF4, (300, 1750, 600, 1780), 'REF fond carte de file')
    mediane(J24, (300, 2050, 600, 2080), 'J24 fond carte de file')
    for nom, p, y, x0 in (('REF', REF4, 1100, 40), ('J24', J24, 1400, 26)):
        im, px, (W, H) = ouvre(p)
        print('  %-5s %dx%d bord gauche du panneau, y=%d :' % (nom, W, H, y),
              ' '.join('%d:%s' % (x, px[x, y]) for x in range(x0, x0 + 14)))


def m18():
    """Bouton principal : bbox, aplat haut/bas (degrade ?), rayon par elargissement du haut."""
    def bloc(p, box, nom, Lmin=140, rb=90):
        im, px, (W, H) = ouvre(p)
        ok = lambda r, g, b: lum((r, g, b)) >= Lmin and r - b >= rb
        pts = [(x, y) for y in range(box[1], box[3]) for x in range(box[0], box[2]) if ok(*px[x, y])]
        xs = [a for a, _ in pts]; ys = [b for _, b in pts]; bb = (min(xs), min(ys), max(xs), max(ys))
        print('  %-20s %dx%d n=%5d bbox=(%d,%d,%d,%d) l=%d h=%d' % (nom, W, H, len(pts), *bb,
              bb[2] - bb[0] + 1, bb[3] - bb[1] + 1))
        cx = (bb[0] + bb[2]) // 2
        for lab, cy in (('haut', bb[1] + 6), ('bas', bb[3] - 6)):
            c = im.crop((cx - 30, cy - 3, cx + 30, cy + 3)); d = list(c.getdata()); n = len(d) // 2
            print('       aplat %-5s RGB=(%d,%d,%d)' % (lab, sorted(t[0] for t in d)[n],
                  sorted(t[1] for t in d)[n], sorted(t[2] for t in d)[n]))
        lmax = bb[2] - bb[0] + 1
        prof = []
        for dy in range(34):
            xs2 = [x for x in range(box[0], box[2]) if ok(*px[x, bb[1] + dy])]
            prof.append(max(xs2) - min(xs2) + 1 if xs2 else 0)
        r = next((dy for dy, l in enumerate(prof) if l >= lmax - 2), -1)
        print('       largeur du haut=%d  pleine=%d atteinte a dy=%d  => rayon ~%d px' % (prof[0], lmax, r, r))
    bloc(REF4, (630, 830, 1055, 975), 'REF COMMANDER')
    bloc(J24, (580, 1380, 1050, 1490), 'J24 COMMANDER')
    bloc(J19, (580, 970, 1050, 1080), 'J19 COMMANDER')


def m29():
    """Carte de file : textes, severite, TRANCHER."""
    def t(p, box, nom, Lmin=110):
        im, px, (W, H) = ouvre(p)
        pts = [(x, y) for y in range(box[1], box[3]) for x in range(box[0], box[2]) if lum(px[x, y]) >= Lmin]
        xs = [a for a, _ in pts]; ys = [b for _, b in pts]; d = [px[x, y] for x, y in pts]; n = len(d) // 2
        print('  %-34s %dx%d n=%5d bbox=(%d,%d,%d,%d) h=%d RGB=(%3d,%3d,%3d)' % (nom, W, H, len(d),
              min(xs), min(ys), max(xs), max(ys), max(ys) - min(ys) + 1,
              sorted(k[0] for k in d)[n], sorted(k[1] for k in d)[n], sorted(k[2] for k in d)[n]))
    t(REF4, (70, 1665, 740, 1712), 'REF « Lt. Tull attend vos ordres »')
    t(J24, (50, 1955, 760, 2005), 'J24 « Lt. Ilm attend vos ordres »')
    t(REF4, (70, 1714, 300, 1750), 'REF severite GRAVE')
    t(J24, (50, 2008, 300, 2045), 'J24 severite LEGERE')
    t(REF4, (750, 1680, 1010, 1725), 'REF TRANCHER')
    t(J24, (800, 1975, 1045, 2020), 'J24 TRANCHER')


def m26():
    """Dock : diametre/centre des pastilles (pics de bord) et bbox des 4 libelles."""
    def pics(p, y, nom, seuil=5):
        im, px, (W, H) = ouvre(p)
        out = [x for x in range(8, 1072) if lum(px[x, y]) - max(lum(px[x - 5, y]), lum(px[x + 5, y])) >= seuil]
        gr = []; prec = None
        for x in out:
            if prec is None or x - prec > 6: gr.append([x, x])
            else: gr[-1][1] = x
            prec = x
        c = [(a + b) // 2 for a, b in gr]
        print('  %-6s %dx%d y=%d : %d bords -> %s' % (nom, W, H, y, len(c), c))
        if len(c) == 8:
            print('       diametres %s  centres %s' % ([c[2 * i + 1] - c[2 * i] for i in range(4)],
                  [(c[2 * i] + c[2 * i + 1]) / 2 for i in range(4)]))
    pics(REF4, 1930, 'REF'); pics(J24, 2240, 'J24')
    def lib(p, y0, y1, nom, Lmin=90):
        im, px, (W, H) = ouvre(p)
        cols = [any(lum(px[x, y]) >= Lmin for y in range(y0, y1)) for x in range(1080)]
        out = []; deb = None; vide = 0
        for i, c in enumerate(cols):
            if c:
                if deb is None: deb = i
                vide = 0
            elif deb is not None:
                vide += 1
                if vide > 14: out.append((deb, i - vide)); deb = None; vide = 0
        print('  %-14s %dx%d -> %d groupes : %s' % (nom, W, H, len(out),
              ' | '.join('x=%d..%d l=%d c=%.1f' % (a, b, b - a + 1, (a + b) / 2) for a, b in out)))
    lib(REF4, 2032, 2054, 'REF libelles'); lib(J24, 2324, 2342, 'J24 libelles')
    lib(J19, 1838, 1862, 'J19 libelles')


def m28():
    """Pip de notification : composantes connexes OR d'aire >=60 dans la bande du dock."""
    def pips(p, y0, y1, nom):
        im, px, (W, H) = ouvre(p)
        ok = lambda x, y: (lambda r, g, b: lum((r, g, b)) >= 110 and r - b >= 60)(*px[x, y])
        vu = set(); blobs = []
        for y in range(y0, y1):
            for x in range(1080):
                if ok(x, y) and (x, y) not in vu:
                    pile = [(x, y)]; comp = []
                    while pile:
                        a, b = pile.pop()
                        if (a, b) in vu or not (0 <= a < 1080 and y0 <= b < y1) or not ok(a, b): continue
                        vu.add((a, b)); comp.append((a, b)); pile += [(a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)]
                    if len(comp) >= 60:
                        xs = [u for u, _ in comp]; ys = [v for _, v in comp]
                        blobs.append((min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1, len(comp)))
        print('  %-22s %dx%d y %d..%d : %d blob(s) or >=60 px' % (nom, W, H, y0, y1, len(blobs)))
        for b in blobs: print('     x=%4d y=%4d l=%2d h=%2d aire=%3d' % b)
    pips(REF4, 1820, 2000, 'REF bande du dock'); pips(J24, 2150, 2320, 'J24 bande du dock')


def m30():
    """Filet or du panneau : position et etendue en X, des deux cotes."""
    def ligne(p, y, nom, rb=40, Lmin=60):
        im, px, (W, H) = ouvre(p)
        xs = [x for x in range(1080) if lum(px[x, y]) >= Lmin and px[x, y][0] - px[x, y][2] >= rb]
        print('  %-6s %dx%d y=%4d : %s' % (nom, W, H, y,
              ('or x=%d..%d (l=%d) centre %.1f' % (min(xs), max(xs), max(xs) - min(xs) + 1,
               (min(xs) + max(xs)) / 2)) if xs else 'aucun pixel or'))
    for y in (733, 734, 735, 736, 737): ligne(REF4, y, 'REF')
    for y in (1266, 1299, 1300, 1301): ligne(J24, y, 'J24')
    for y in (859, 892, 893, 894, 895): ligne(J19, y, 'J19')


def m31():
    """Couche globale. Controle : la somme des parts doit valoir 100 %."""
    for nom, p in (('REF cadre 4', REF4), ('REF cadre 0', REF0), ('JEU 2400', J24), ('JEU 1920', J19)):
        im = Image.open(p).convert('RGB'); W, H = im.size
        q = im.resize((216, int(216 * H / W)), Image.BOX).quantize(colors=6).convert('RGB')
        cnt = q.getcolors(100000); tot = sum(c for c, _ in cnt)
        d = list(im.convert('L').resize((216, int(216 * H / W)), Image.BOX).getdata())
        print('  %-14s %dx%d luminance moyenne=%.1f  pixels clairs(L>=90)=%.1f %%'
              % (nom, W, H, sum(d) / len(d), 100.0 * sum(1 for v in d if v >= 90) / len(d)))
        s = 0
        for c, col in sorted(cnt, reverse=True)[:6]:
            s += 100.0 * c / tot; print('       %6.2f %%  RGB=%s' % (100.0 * c / tot, col))
        print('       somme = %.2f %% (controle)' % s)


def m32():
    """Contrastes WCAG des textes contre leur fond local."""
    def rl(c):
        f = lambda v: (v / 255.0) / 12.92 if v / 255.0 <= 0.04045 else (((v / 255.0) + 0.055) / 1.055) ** 2.4
        return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
    def ct(p, box, nom, Lmin=110, marge=14):
        im, px, (W, H) = ouvre(p)
        enc = [px[x, y] for y in range(box[1], box[3]) for x in range(box[0], box[2]) if lum(px[x, y]) >= Lmin]
        fond = [px[x, y] for y in range(box[1] - marge, box[3] + marge)
                for x in range(box[0] - marge, box[2] + marge) if lum(px[x, y]) < Lmin - 40]
        ne = len(enc) // 2; nf = len(fond) // 2
        e = tuple(sorted(t[i] for t in enc)[ne] for i in range(3))
        f = tuple(sorted(t[i] for t in fond)[nf] for i in range(3))
        a, b = rl(e) + 0.05, rl(f) + 0.05
        print('  %-30s %dx%d encre=%s fond=%s  contraste=%.2f:1' % (nom, W, H, e, f, max(a, b) / min(a, b)))
    ct(REF4, (104, 2032, 237, 2054), 'REF EMPIRE'); ct(J24, (208, 2324, 310, 2342), 'J24 EMPIRE')
    ct(REF4, (93, 44, 180, 64), 'REF ARGENT'); ct(J24, (88, 27, 150, 45), 'J24 ARGENT')
    ct(REF4, (824, 79, 1033, 128), 'REF phase'); ct(J24, (935, 70, 1033, 98), 'J24 phase')
    ct(REF4, (99, 854, 606, 884), 'REF titre r1'); ct(J24, (83, 1383, 555, 1411), 'J24 titre r1')


def m34():
    """Bords du panneau (lateraux et bas) et rythme vertical."""
    def lat(p, y, nom, seuil):
        im, px, (W, H) = ouvre(p)
        out = [x for x in range(6, 1074) if lum(px[x, y]) - max(lum(px[x - 4, y]), lum(px[x + 4, y])) >= seuil]
        gr = []; prec = None
        for x in out:
            if prec is None or x - prec > 4: gr.append([x, x])
            else: gr[-1][1] = x
            prec = x
        print('  %-22s %dx%d y=%d : bords x=%s' % (nom, W, H, y, [(a + b) // 2 for a, b in gr][:6]))
    lat(REF4, 1200, 'REF bords lateraux', 5); lat(J24, 1700, 'J24 bords lateraux', 8)
    def bas(p, y0, y1, nom):
        im, px, (W, H) = ouvre(p); best = None
        for y in range(y0, y1):
            v = sorted(lum(px[x, y]) for x in range(150, 930)); m = v[len(v) // 2]
            vp = sorted(lum(px[x, y + 4]) for x in range(150, 930))[len(v) // 2]
            vm = sorted(lum(px[x, y - 4]) for x in range(150, 930))[len(v) // 2]
            if best is None or m - max(vp, vm) > best[1]: best = (y, m - max(vp, vm), m)
        print('  %-22s %dx%d bord bas = y=%d (pic +%d, L=%d)' % (nom, W, H, *best)); return best[0]
    bR = bas(REF4, 1480, 1620, 'REF bord bas'); bJ = bas(J24, 1780, 1900, 'J24 bord bas')
    print('  hauteur du panneau : REF=%d px (%.1f %% de l ecran)  JEU=%d px (%.1f %%)'
          % (bR - 734, 100.0 * (bR - 734) / 2102, bJ - 1266, 100.0 * (bJ - 1266) / 2400))


def m36():
    """Gouttieres d'ecran et marge basse."""
    for nom, p, y0, y1 in (('REF', REF4, 250, 700), ('J24', J24, 260, 1000), ('J19', J19, 260, 800)):
        im, px, (W, H) = ouvre(p)
        for cx, lab in ((0, 'x=0'), (W - 1, 'x=W-1')):
            v = [lum(px[cx, y]) for y in range(y0, y1, 7)]; m = sum(v) / len(v)
            sd = (sum((k - m) ** 2 for k in v) / len(v)) ** 0.5
            print('  %-5s %dx%d colonne %-6s moy=%.1f ecart-type=%.2f' % (nom, W, H, lab, m, sd))
        last = max(y for y in range(H) if any(lum(px[x, y]) >= 70 for x in range(W)))
        print('        derniere ligne claire y=%d  -> marge basse %d px' % (last, H - 1 - last))


def m38():
    """Nature de la bande : couleur, uniformite, comparaison bandeau / art."""
    for nom, p in (('J24', J24), ('J19', J19)):
        im, px, (W, H) = ouvre(p)
        def md(y0, y1):
            d = [px[x, y] for y in range(y0, y1) for x in range(20, 440)]; n = len(d) // 2
            return tuple(sorted(t[i] for t in d)[n] for i in range(3)), d
        b, db = md(150, 225); v = [lum(t) for t in db]; m = sum(v) / len(v)
        sd = (sum((k - m) ** 2 for k in v) / len(v)) ** 0.5
        print('  %-5s %dx%d  bandeau(y95..135)=%s  BANDE(y150..225)=%s ecart-type=%.2f sur %d px  art(y240..300)=%s'
              % (nom, W, H, md(95, 135)[0], b, sd, len(db), md(240, 300)[0]))


def m39():
    """Agitation du fond du dock + comptage des taches claires. Controle sur un aplat."""
    def agit(p, y0, y1, nom, excl=None):
        im, px, (W, H) = ouvre(p); v = []
        for y in range(y0, y1, 2):
            for x in range(10, 1070, 2):
                if excl and any(abs(x - c) <= r for c, r in excl): continue
                L = lum(px[x, y])
                if L < 90: v.append(L)
        m = sum(v) / len(v); sd = (sum((k - m) ** 2 for k in v) / len(v)) ** 0.5
        print('  %-38s %dx%d n=%5d moy=%5.1f ecart-type=%5.2f  >moy+12 : %4.1f %%'
              % (nom, W, H, len(v), m, sd, 100.0 * sum(1 for k in v if k > m + 12) / len(v)))
    agit(REF4, 1840, 2060, 'REF bande du dock', [(172, 90), (417, 90), (662, 90), (906, 90)])
    agit(J24, 2150, 2350, 'J24 bande du dock', [(258, 70), (446, 70), (633, 70), (821, 70)])
    print('  -- controle : un aplat, les deux cotes doivent rendre ~3 --')
    agit(REF4, 1520, 1560, 'REF aplat du panneau (controle)')
    agit(J24, 1800, 1840, 'J24 aplat du panneau (controle)')
    def dots(p, y0, y1, nom, bt):
        im, px, (W, H) = ouvre(p)
        ok = lambda x, y: lum(px[x, y]) >= 70 and not any(a <= y <= b for a, b in bt)
        vu = set(); n = 0
        for y in range(y0, y1):
            for x in range(1080):
                if ok(x, y) and (x, y) not in vu:
                    pile = [(x, y)]; c = 0
                    while pile:
                        a, b = pile.pop()
                        if (a, b) in vu or not (0 <= a < 1080 and y0 <= b < y1) or not ok(a, b): continue
                        vu.add((a, b)); c += 1; pile += [(a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)]
                    if c >= 8: n += 1
        print('  %-38s %dx%d taches claires >=8 px : %d' % (nom, W, H, n))
    dots(REF4, 1840, 2060, 'REF bande du dock', [(2017, 2060)])
    dots(J24, 2150, 2350, 'J24 bande du dock', [(2310, 2350)])


def m35():
    """ARGENT : bbox d encre, fenetre depuis x=20 (au-dessus de l ornement gris)."""
    bbox(REF4, (20, 34, 340, 76), 'REF ARGENT'); bbox(J24, (20, 16, 340, 52), 'J24 ARGENT')


SECTIONS = {'m2': m2, 'm7b': m7b, 'm8': m8, 'm9': m9, 'm11': m11, 'm12': m12, 'm16': m16,
            'm18': m18, 'm20': m20, 'm21': m21, 'm22': m22, 'm26': m26, 'm28': m28,
            'm29': m29, 'm30': m30, 'm31': m31, 'm32': m32, 'm34': m34, 'm35': m35,
            'm36': m36, 'm38': m38, 'm39': m39}

if __name__ == '__main__':
    noms = sys.argv[1:] or list(SECTIONS)
    for n in noms:
        doc = ((SECTIONS[n].__doc__ or '').strip().splitlines() or [''])[0]
        print('\n===== %s : %s' % (n, doc))
        SECTIONS[n]()
