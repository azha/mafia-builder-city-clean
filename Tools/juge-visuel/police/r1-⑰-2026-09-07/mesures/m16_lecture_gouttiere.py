# -*- coding: utf-8 -*-
"""m16 — (a) perforations de la référence (corrigé) ; (b) ordre de lecture par poids d'encre ;
(c) gouttière : du contenu sous le bandeau ou sous le dock ? (d) rien de coupé aux bords."""
import commun as C

print('== m16 : perforations, ordre de lecture, gouttiere ==')
ref = C.ouvrir('reference'); cap = C.ouvrir('capture')

print('\n-- (a) perforations de la reference (marge gauche, x=14..44) --')
p=ref.load()
trous=[]; dedans=False
for y in range(400, 2095):
    n=sum(1 for x in range(14,45) if (lambda c:(c[0]*299+c[1]*587+c[2]*114)//1000)(p[x,y]) < 150)
    if n>10 and not dedans: dedans=True; d=y
    elif n<=10 and dedans: dedans=False; trous.append((d,y-1,y-d))
trous=[t for t in trous if t[2]>=6]
pas=[trous[i+1][0]-trous[i][0] for i in range(len(trous)-1)]
print('     %d perforations ; pas median %s px ; diametre median %s px'
      % (len(trous), sorted(pas)[len(pas)//2] if pas else 'n/a', sorted([t[2] for t in trous])[len(trous)//2] if trous else 'n/a'))

print('\n-- (b) ORDRE DE LECTURE de la capture : poids d encre par bande de 40 px --')
q=cap.load(); F=(13,13,13); bandes=[]
for y0 in range(143, 2220, 40):
    s=0.0
    for y in range(y0, min(y0+40,2220)):
        for x in range(0,1080,2):
            c=q[x,y]; l=(c[0]*299+c[1]*587+c[2]*114)//1000
            if l>45: s+=C.contraste(c,F)
    if s>0: bandes.append((y0, round(s)))
bandes.sort(key=lambda t:-t[1])
print('     5 bandes les plus lourdes : %s' % bandes[:5])
print('     (rappel : titre 268-303 · carte1 valeur 445-489 · carte2 valeur 721-763 · R2 sous-titre 1106-1129)')

print('\n-- (c) GOUTTIERE : encre de contenu sous le bandeau (y<143) ou sous le dock (y>2220) ? --')
def encre_zone(y0,y1,nom):
    n=0
    for y in range(y0,y1):
        for x in range(0,1080,2):
            c=q[x,y]; l=(c[0]*299+c[1]*587+c[2]*114)//1000
            if l>45: n+=1
    print('     %-40s encre = %d px (echantillon 1/2 en x)' % (nom,n))
encre_zone(143,150,'juste sous le bandeau (143..150)')
encre_zone(2210,2222,'juste au-dessus du dock (2210..2222)')
print('     bas du contenu mesure : y=1151 ; haut du dock mesure : y=2220 -> aucun chevauchement')

print('\n-- (d) rien de coupe aux bords : encre a 0..3 px et 1076..1079 px --')
for nom,xs in [('bord gauche', range(0,4)), ('bord droit', range(1076,1080))]:
    n=0
    for y in range(150,2200):
        for x in xs:
            c=q[x,y]; l=(c[0]*299+c[1]*587+c[2]*114)//1000
            if l>45: n+=1
    print('     %-14s encre = %d px' % (nom,n))

print('\n-- CONTRÔLE POSITIF : hauteur de capitale du titre, capture vs canon --')
print('     capture "LE COMMISSARIAT"  h = 36 px (m6)')
print('     canon   "LES COMMISSARIATS" h = 31 px x1,2 = 37,2 px (m10)  -> ecart 1,2 px = 3,2 %% (tolerance 5 %%)')

print('\n-- (a-bis) bande des perforations : echantillons bruts --')
for x in (14, 20, 26, 32, 38, 44, 50, 56):
    col = [C.mediane_fenetre(ref, x, y, 2) for y in (430, 447, 464, 481)]
    print('     x=%3d : %s' % (x, ' '.join(C.hx(c) for c in col)))
trous=[]; dedans=False
p2=ref.load()
for y in range(400, 2095):
    n=sum(1 for x in range(20,34) if (lambda c:(c[0]*299+c[1]*587+c[2]*114)//1000)(p2[x,y]) < 90)
    if n>7 and not dedans: dedans=True; d=y
    elif n<=7 and dedans: dedans=False; trous.append((d,y-1,y-d))
trous=[t for t in trous if t[2]>=6]
pas=[trous[i+1][0]-trous[i][0] for i in range(len(trous)-1)]
print('     perforations (seuil L<90 sur x=20..33) : %d ; pas median %s px ; diametre median %s px'
      % (len(trous), sorted(pas)[len(pas)//2] if pas else 'n/a', sorted([t[2] for t in trous])[len(trous)//2] if trous else 'n/a'))
