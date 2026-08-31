# -*- coding: utf-8 -*-
"""04 — TEXTES : hauteur d'ENCRE de chaque ligne (ce que l'œil voit), ramenée en px CSS.
Méthode : dans une zone donnée, on liste les suites de lignes contenant de l'encre (pixel dont
la luminance dépasse le fond de la zone de `seuil`), puis on rend leur hauteur /3,0 ou /3,6.
Les deux images portent la MÊME chaîne dans chaque zone : les jambages y sont donc identiques
et la comparaison des hauteurs d'encre est licite.
Contrôle positif : le sous-titre de l'enseigne (capitales pures, 6,4 px CSS déclarés) doit sortir
à la même hauteur d'encre des deux côtés.
Contrôle négatif : le titre « Le miroir » (17 px CSS) doit sortir ~2,6x plus haut que ce
sous-titre — un instrument qui rendrait toutes les lignes égales ne mesurerait rien."""
from PIL import Image

def lum(p): return .2126*p[0]+.7152*p[1]+.0722*p[2]

def lignes(im, x0, y0, x1, y1, seuil=28):
    px = im.load()
    fond = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(x0, x1))[len(range(y0,y1))*len(range(x0,x1))//2]
    out, s = [], None
    for y in range(y0, y1):
        enc = any(lum(px[x, y]) - fond > seuil for x in range(x0, x1))
        if enc and s is None: s = y
        elif not enc and s is not None:
            out.append((s, y-1)); s = None
    if s is not None: out.append((s, y1-1))
    res = []
    for a, b in out:
        xs = [x for x in range(x0, x1) for y in range(a, b+1) if lum(px[x, y]) - fond > seuil]
        res.append((a, b, min(xs), max(xs)))
    return res, round(fond, 1)

ZONES = {
  # nom : (REF rect, CAP rect, taille CSS declaree)
  'enseigne b «Le miroir»'   : ((60,395,840,500),  (60,40,1020,150),  17.0),
  'enseigne i sous-titre'    : ((60,500,840,548),  (60,150,1020,215), 6.4),
  'fen b «00» (1er compteur)': ((60,590,300,650),  (60,268,350,335),  14.0),
  'fen span «REGLES DONNEES»': ((60,650,300,676),  (60,335,350,372),  5.4),
  'fen b 3e compteur («00»/«—»)': ((600,590,860,650), (730,268,1030,335), 14.0),
  'prt i «SALVATORE…»'       : ((75,740,418,805),  (80,450,490,515),  5.6),
  'prt b «Il vous écoute»'   : ((75,1180,418,1235),(80,975,490,1040), 8.6),
  'prt ref «lieutenant.name»': ((75,1230,418,1262),(80,1040,490,1080),5.0),
  'verdict b «Pas encore…»'  : ((450,730,650,830), (525,435,775,535), 10.0),
  'tuile1 b «col ouvert»'    : ((515,845,840,885), (605,545,1005,595), 7.4),
  'tuile1 small'             : ((515,880,840,915), (605,590,1005,625), 5.4),
  'pann b «Rien n’a…»'       : ((70,1420,840,1480),(70,1455,1020,1530),13.0),
  'pann small ligne 1'       : ((70,1490,840,1522),(70,1535,1020,1570),6.6),
  'cta6 «DONNER…»'           : ((70,1640,840,1690),(70,1720,1020,1775),8.5),
}
IMS = [('REF','/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png',3.0),
       ('CAP','/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',3.6)]
ims = {}
for n, p, s in IMS:
    ims[n] = (Image.open(p).convert('RGB'), s); print(n, p.split('/')[-1], ims[n][0].size)
print()
print('%-30s %-26s %-26s %s' % ('zone', 'REF (h encre CSS · larg)', 'CAP (h encre CSS · larg)', 'Δ h'))
for nom, (rr, rc, css) in ZONES.items():
    o = []
    for k, rect in (('REF', rr), ('CAP', rc)):
        im, sc = ims[k]
        ls, fond = lignes(im, *rect)
        if not ls: o.append((None, None, 0)); continue
        h = max(b-a+1 for a,b,_,_ in ls)
        larg = max(x1-x0+1 for _,_,x0,x1 in ls)
        o.append((h/sc, larg/sc, len(ls)))
    d = '' if None in (o[0][0], o[1][0]) else '%+.1f CSS (%+.0f%%)' % (o[1][0]-o[0][0], 100*(o[1][0]/o[0][0]-1))
    f = lambda t: 'n/a' if t[0] is None else '%5.1f · %6.1f · %dl' % (t[0], t[1], t[2])
    print('%-30s %-26s %-26s %s   [CSS decl %.1f]' % (nom, f(o[0]), f(o[1]), d, css))
