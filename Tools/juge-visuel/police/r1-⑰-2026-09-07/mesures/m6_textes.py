# -*- coding: utf-8 -*-
"""m6 — textes de la capture : bbox d'encre, hauteur de capitale, couleur, contraste sur le fond réel.
Contrôle positif : le fond échantillonné DOIT être #0d0d0d (mesuré en m2) ; contraste blanc pur/#0d0d0d ~ 19,4:1."""
import commun as C

print('== m6 : textes ==')
cap = C.ouvrir('capture')
FOND = (13,13,13)

def mesure(nom, x0,y0,x1,y1, seuil=55):
    bb, n = C.bbox_encre(cap, x0,y0,x1,y1, seuil, 'clair')
    if not bb:
        print('   %-34s AUCUNE ENCRE' % nom); return
    # couleur : mediane des pixels les plus clairs
    px = cap.load(); pts=[]
    for y in range(bb[1],bb[3]+1):
        for x in range(bb[0],bb[2]+1):
            p=px[x,y]; l=(p[0]*299+p[1]*587+p[2]*114)//1000
            if l>seuil: pts.append((l,p))
    pts.sort(key=lambda t:-t[0])
    top = pts[:max(1,len(pts)//10)]
    med = tuple(sorted(v[1][i] for v in top)[len(top)//2] for i in range(3))
    print('   %-34s bbox=(%4d,%4d,%4d,%4d) l=%4d h=%3d  couleur %s  contraste/fond %5.2f:1  n=%d'
          % (nom, bb[0],bb[1],bb[2],bb[3], bb[2]-bb[0]+1, bb[3]-bb[1]+1, C.hx(med), C.contraste(med,FOND), n))
    return bb, med

print('\n-- CONTRÔLE POSITIF : contraste blanc pur sur le fond mesure --')
print('   #ffffff / #0d0d0d = %.2f:1   (et #0d0d0d / #0d0d0d = %.2f:1)' %
      (C.contraste((255,255,255),FOND), C.contraste(FOND,FOND)))

print('\n-- titre et losange --')
mesure('losange (diamant)',            460, 212, 620, 235)
mesure('titre LE COMMISSARIAT',        100, 260, 980, 310)

print('\n-- carte 1 --')
mesure("surtitre CE QU'ILS CROIENT",   200, 375, 880, 415)
mesure("valeur Ils vous cherchent",    200, 430, 880, 500)

print('\n-- carte 2 --')
mesure("surtitre LA PATROUILLE",       200, 650, 880, 690)
mesure("valeur Partout",               200, 705, 880, 775)

print('\n-- rangees d action --')
mesure("R1 titre Recruter un greffier",280, 915, 800, 960)
mesure("R1 sous-titre",                280, 962, 800, 990)
mesure("R2 titre Acheter un rens.",    230, 1058, 860, 1104)
mesure("R2 sous-titre",                140, 1106, 940, 1134)

print('\n-- chrome : bandeau --')
mesure("lib ARGENT",                   170, 20, 300, 50)
mesure("val argent",                   170, 55, 460, 105)
mesure("soulignement or",              170, 108, 460, 125)
mesure("JOUR 50",                      920, 20, 1070, 50)
mesure("phase (aile droite)",          960, 55, 1070, 105)

print('\n-- chrome : dock --')
mesure("libelle EMPIRE",               190, 2320, 320, 2350)
mesure("libelle FAMILLE",              370, 2320, 520, 2350)
mesure("libelle FILIERE",              560, 2320, 700, 2350)
mesure("libelle PLUS",                 760, 2320, 880, 2350)
