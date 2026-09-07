# -*- coding: utf-8 -*-
"""m12 — (a) collision ARGENT / medaillon, sonde CORRIGEE (la v1 confondait l'or du montant
        avec l'anneau braise : R-B>60 est vrai pour les DEUX ; le braise se distingue par R-G>90).
        (b) rythme vertical mesure sur le HAUT de capitale (stable, insensible aux jambages).
Contrôle positif  : l'anneau braise doit exister (>=2 colonnes trouvees) et etre a peu pres symetrique
                    autour de x=540 (centre d'ecran).
Contrôle negatif  : la meme sonde sur la bande du titre (y 268..303, or #d9ab4e : R-G=46) doit rendre 0.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(D, 'capture-1080x2400.png')).convert('RGB')
print("OUVERT capture taille=%s" % (im.size,)); px = im.load(); W, H = im.size

def braise(x, y):
    r, g, b = px[x, y]
    return r > 150 and (r-g) > 90 and (r-b) > 80

cols = [x for x in range(W) if any(braise(x, y) for y in range(20, 175))]
print("(a) colonnes 'braise' (anneau du medaillon) : %d ; min=%s max=%s centre=%.1f"
      % (len(cols), min(cols) if cols else None, max(cols) if cols else None,
         (min(cols)+max(cols))/2.0 if cols else -1))
ctrl_neg = sum(1 for x in range(396, 829) for y in range(268, 304) if braise(x, y))
print("CONTROLE NEGATIF sonde braise sur le titre (or) -> %d px (attendu 0)" % ctrl_neg)

# le disque du medaillon (fond sombre borde de braise), sur la ligne mediane du disque
cy = 92
xs = [x for x in range(250, 830) if braise(x, cy)]
print("    ligne y=%d : colonnes braise = %s" % (cy, xs[:6] + ['...'] + xs[-6:] if len(xs) > 12 else xs))
gauche = min(xs) if xs else None
# encre OR du montant : R>150, G>110, B<120, et NON braise
orx = [x for x in range(150, 830) if any((px[x, y][0] > 150 and px[x, y][1] > 110 and px[x, y][2] < 120
        and not braise(x, y)) for y in range(60, 115))]
print("    colonnes d'or du montant ARGENT : x %s..%s" % (min(orx), max(orx)))
print("    bord GAUCHE de l'anneau braise : x=%s" % gauche)
if gauche and max(orx) > gauche:
    print("    => RECOUVREMENT : le montant deborde de %d px SOUS le medaillon (%.1f %% de sa largeur)"
          % (max(orx)-gauche, 100.0*(max(orx)-gauche)/(max(orx)-min(orx)+1)))
else:
    print("    => aucun recouvrement")

print()
print("(b) RYTHME sur le HAUT DE CAPITALE (premiere ligne d'encre du libelle, x 30..260)")
g = im.convert('L'); pg = g.load()
def haut(y0, y1, x0=30, x1=260, seuil=40):
    for y in range(y0, y1+1):
        if any(pg[x, y] > seuil for x in range(x0, x1+1)): return y
    return None
GRAV = [(515,545,'Critique'),(568,597,'Elevee'),(630,659,'Moyenne'),(687,712,'Faible')]
PROV = [(796,827,'Programmee'),(855,879,'Indicateur'),(912,941,'Faux rapport'),
        (968,998,'Rapport fonde'),(1026,1051,'Cascade'),(1082,1113,'Medico-legal')]
for titre, grp in (('GRAVITE', GRAV), ('PROVENANCE', PROV)):
    tops = [(n, haut(a, b)) for a, b, n in grp]
    print("  -- %s" % titre)
    prev = None; pas = []
    for n, t in tops:
        p = None if prev is None else t-prev
        if p: pas.append(p)
        print("     %-16s haut=%4d  pas=%s" % (n, t, p if p else '-'))
        prev = t
    if pas:
        print("     pas min=%d max=%d moyen=%.1f  dispersion=%.1f %%"
              % (min(pas), max(pas), sum(pas)/float(len(pas)), 100.0*(max(pas)-min(pas))/(sum(pas)/float(len(pas)))))
