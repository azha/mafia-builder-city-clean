# -*- coding: utf-8 -*-
"""m12 — bordures des panneaux/cartes : couleur, épaisseur, rayon ; marges latérales.
Contrôle positif : la largeur du panneau, exprimée en % de la largeur d'écran, est comparable
entre canon (900) et capture (1080) — et la mesure du canon doit retrouver ~91 %."""
import commun as C

print('== m12 : bordures, rayons, marges ==')
cap = C.ouvrir('capture'); can = C.ouvrir('canon2'); ref = C.ouvrir('reference')

def bord_couleur(im, nom, y, x0, x1, seuil=35):
    p=im.load(); pts=[]
    for x in range(x0,x1):
        q=p[x,y]; l=(q[0]*299+q[1]*587+q[2]*114)//1000
        if l>seuil: pts.append(q)
    if not pts: print('   %-34s rien a y=%d' % (nom,y)); return
    med=tuple(sorted(c[i] for c in pts)[len(pts)//2] for i in range(3))
    print('   %-34s y=%4d  couleur mediane %s  (R-B = %+d)  n=%d' % (nom,y,C.hx(med),med[0]-med[2],len(pts)))
    return med

def epaisseur(im, nom, x, y0, y1, seuil=35):
    p=im.load(); runs=[]; dedans=False
    for y in range(y0,y1):
        q=p[x,y]; l=(q[0]*299+q[1]*587+q[2]*114)//1000
        if l>seuil and not dedans: dedans=True; d=y
        elif l<=seuil and dedans: dedans=False; runs.append((d,y-1,y-d))
    print('   %-34s x=%4d  traits verticaux : %s' % (nom,x,runs[:6]))
    return runs

print('\n-- CAPTURE : bordure des cartes --')
bord_couleur(cap, 'carte 1, rail haut', 348, 200, 900)
bord_couleur(cap, 'carte 2, rail haut', 622, 200, 900)
bord_couleur(cap, 'rangee 1, rail haut', 895, 200, 600)
epaisseur(cap, 'carte 1, bord gauche (colonne)', 66, 340, 600)

print('\n-- CANON serie 2 : bordure du panneau et des cartes --')
bord_couleur(can, 'panneau croyance, rail haut', 271, 200, 700)
bord_couleur(can, 'carte precinct 1, rail haut', 688, 200, 700)
bord_couleur(can, 'carte precinct 2, rail haut', 871, 200, 700)

print('\n-- marges laterales --')
def empan(im, nom, y, seuil=35):
    p=im.load(); W=im.size[0]
    xs=[x for x in range(W) if (lambda q:(q[0]*299+q[1]*587+q[2]*114)//1000)(p[x,y])>seuil]
    if not xs: print('   %-30s rien' % nom); return
    print('   %-30s x=%4d..%4d  largeur %4d = %.2f %% de %d  (marge gauche %.2f %%)'
          % (nom, min(xs), max(xs), max(xs)-min(xs)+1, 100.0*(max(xs)-min(xs)+1)/W, W, 100.0*min(xs)/W))
empan(cap, 'capture carte 1', 348)
empan(cap, 'capture carte 2', 622)
empan(can, 'canon panneau croyance', 271)
empan(can, 'canon carte precinct 1', 688)
empan(ref, 'reference: papier (listing)', 1000, 60)

print('\n-- rayon d arrondi : hauteur ou le rail atteint sa pleine largeur --')
def rayon(im, nom, ytop, x_gauche_plein, seuil=35):
    p=im.load()
    for dy in range(0, 60):
        y = ytop+dy
        xs=[x for x in range(x_gauche_plein-60, x_gauche_plein+60) if (lambda q:(q[0]*299+q[1]*587+q[2]*114)//1000)(p[x,y])>seuil]
        if xs and min(xs) <= x_gauche_plein:
            print('   %-30s bord gauche atteint x=%d a dy=%d -> rayon ~%d px' % (nom, x_gauche_plein, dy, dy)); return dy
rayon(cap, 'capture carte 1', 347, 66)
rayon(can, 'canon carte precinct 1', 686, 42)
