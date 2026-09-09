# -*- coding: utf-8 -*-
"""m10 — inventaire du canon série 2 (homologue de SUJET) ramené à l'échelle de la capture (x1,2).
Contrôle positif : largeur du canon 900 px x1,2 = 1080 px = largeur de la capture."""
import commun as C

print('== m10 : inventaire du canon serie 2 (etat garni + etat vide) ==')
can = C.ouvrir('canon2'); vid = C.ouvrir('vide2'); cap = C.ouvrir('capture')
K = 1080.0/900.0
print('   facteur canon2 -> capture = %.3f  (controle : 900 x %.3f = %.0f)' % (K,K,900*K))

def mes(im, nom, x0,y0,x1,y1, seuil=55, fond=(10,14,22)):
    bb,n = C.bbox_encre(im, x0,y0,x1,y1, seuil, 'clair')
    if not bb: print('   %-32s AUCUNE ENCRE' % nom); return None
    p=im.load(); pts=[]
    for y in range(bb[1],bb[3]+1):
        for x in range(bb[0],bb[2]+1):
            q=p[x,y]; l=(q[0]*299+q[1]*587+q[2]*114)//1000
            if l>seuil: pts.append((l,q))
    pts.sort(key=lambda t:-t[0]); top=pts[:max(1,len(pts)//10)]
    med=tuple(sorted(v[1][i] for v in top)[len(top)//2] for i in range(3))
    print('   %-32s bbox=(%4d,%4d,%4d,%4d) h=%3d px  -> a l echelle capture h=%5.1f  couleur %s  contraste %4.2f:1'
          % (nom, bb[0],bb[1],bb[2],bb[3], bb[3]-bb[1]+1, (bb[3]-bb[1]+1)*K, C.hx(med), C.contraste(med,fond)))
    return bb, med

print('\n-- ETAT GARNI --')
mes(can, 'titre LES COMMISSARIATS',     140, 55, 780, 105)
mes(can, 'sous-titre JOUR 26 . 6 PREC', 150, 118, 830, 200)
mes(can, "surtitre CE QUE LA POLICE CROIT", 70, 300, 600, 335)
mes(can, 'accroche (2 lignes)',         70, 355, 840, 475)
mes(can, 'carte precinct 1 (bloc)',     40, 685, 865, 840, 30)
mes(can, 'numero 1 (medaillon)',        75, 725, 145, 795)
mes(can, 'PRECINCT 1 (titre)',          170, 705, 500, 755)

print('\n-- ETAT VIDE --')
mes(vid, 'titre',                       140, 55, 780, 105)
mes(vid, 'sous-titre JOUR 1 . LA POLICE', 150, 118, 830, 200)
mes(vid, 'cartouche vide (cadre pointille)', 30, 890, 870, 1080, 25)
mes(vid, 'texte du vide',               90, 935, 810, 1040)

print('\n-- fond du canon garni : zone hors cartes --')
print('   mediane fond canon2 (x=460,y=670) = %s' % C.hx(C.mediane_fenetre(can,460,670,5)))
print('   mediane fond vide2  (x=450,y=600) = %s' % C.hx(C.mediane_fenetre(vid,450,600,5)))
print('   mediane fond capture(x=540,y=1300) = %s' % C.hx(C.mediane_fenetre(cap,540,1300,5)))

print('\n-- surtitre : couleur du canon vs couleur de la capture --')
print('   canon2 surtitre  : voir ci-dessus')
print('   capture surtitre : #777777 (m6)  -> R=G=B, hors palette chaude')
