# -*- coding: utf-8 -*-
"""m11 — (a) poids d'encre perçu des paires titre/sous-titre ; (b) part du rect libre laissée vide ;
(c) couleurs de l'accroche du canon (parties or ET blanches).
Contrôle positif : sur le canon, l'accroche doit peser PLUS que son surtitre (hierarchie normale)."""
import commun as C

print('== m11 : hierarchie et vide ==')
cap = C.ouvrir('capture'); can = C.ouvrir('canon2')

def poids(im, nom, x0,y0,x1,y1, fond, seuil=45):
    p=im.load(); n=0; somme=0.0; lm=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            q=p[x,y]; l=(q[0]*299+q[1]*587+q[2]*114)//1000
            if l>seuil:
                n+=1; somme += C.contraste(q,fond); lm=max(lm,l)
    print('   %-36s encre=%5d px  somme de contraste=%9.0f  L max=%3d' % (nom,n,somme,lm))
    return somme

F=(13,13,13)
print('\n-- CAPTURE : rangee 1 (action inerte) --')
a=poids(cap,'R1 TITRE "Recruter un greffier"',   340, 915, 745, 958, F)
b=poids(cap,'R1 SOUS-TITRE "aucune route..."',   340, 959, 745, 990, F)
print('   -> rapport sous-titre / titre = %.2f  (>1 = le sous-titre pese PLUS que le titre)' % (b/a))
print('\n-- CAPTURE : rangee 2 --')
a2=poids(cap,'R2 TITRE "Acheter un renseignement"',270,1060,810,1102, F)
b2=poids(cap,'R2 SOUS-TITRE "la route voisine..."',150,1103,940,1136, F)
print('   -> rapport sous-titre / titre = %.2f' % (b2/a2))

print('\n-- CAPTURE : carte 1, surtitre vs valeur (hierarchie normale attendue) --')
s=poids(cap,'C1 surtitre',  370, 380, 710, 415, F)
v=poids(cap,'C1 valeur',    270, 435, 815, 495, F)
print('   -> rapport valeur / surtitre = %.2f (attendu >> 1)' % (v/s))

print('\n-- CONTRÔLE POSITIF : canon serie 2, surtitre vs accroche --')
FC=(9,14,22)
sc=poids(can,'canon surtitre',  70, 300, 500, 335, FC)
vc=poids(can,'canon accroche',  70, 355, 800, 470, FC)
print('   -> rapport accroche / surtitre = %.2f (attendu >> 1)' % (vc/sc))

print('\n-- couleurs de l accroche du canon (echantillons medians) --')
for x,y,ou in [(150,390,'"Quatre" (debut)'),(430,390,'"chassent" (milieu)'),(300,450,'2e ligne')]:
    print('     %-20s (%3d,%3d) plus clair du voisinage = %s' % (ou,x,y,C.hx(C.mediane_fenetre(can,x,y,2))))
p=can.load()
best={}
for y in range(365,470):
    for x in range(75,800):
        q=p[x,y]; l=(q[0]*299+q[1]*587+q[2]*114)//1000
        if l>150:
            k = 'or' if q[0]-q[2]>60 else 'clair'
            best.setdefault(k,[]).append(q)
for k,v2 in best.items():
    med=tuple(sorted(c[i] for c in v2)[len(v2)//2] for i in range(3))
    print('     accroche canon, famille %-6s : %s  (n=%d)' % (k, C.hx(med), len(v2)))

print('\n-- LE VIDE : part du rect libre (entre bandeau et dock) sans aucune encre --')
# bandeau : filet a y=141 -> bas du bandeau 143 ; dock : trouver le haut
p=cap.load()
haut = 143
# haut du dock = premiere ligne, en remontant depuis 2399, ou apparait le fond chrome (#0d121c) sur >80% de la largeur
bas = None
for y in range(2399, 1200, -1):
    n = sum(1 for x in range(0,1080,4) if abs(p[x,y][2]-p[x,y][0])>=6)
    if n < 200:
        bas = y+1; break
print('   rect libre mesure : y=%d..%d  (hauteur %d px)' % (haut, bas, bas-haut))
# derniere ligne de contenu
dern = 0
for y in range(haut, bas):
    n = sum(1 for x in range(0,1080,2) if (lambda q:(q[0]*299+q[1]*587+q[2]*114)//1000)(p[x,y]) > 45)
    if n > 4: dern = y
print('   derniere ligne d encre du contenu : y=%d' % dern)
print('   -> vide continu du bas : %d px = %.1f %% du rect libre' % (bas-dern, 100.0*(bas-dern)/(bas-haut)))
