# Aplat, bord et rayon des 3 cartes de la CAPTURE, confrontes aux jetons ECRITS dans la CSS.
# CSS .parl6 .pl-choix        : fond #1e242b (30,36,43)  bord #303a44 (48,58,68)
#     .parl6 .pl-choix.pris   : fond #22301f (34,48,31)  bord #4f7f3f (79,127,63)
#     .parl6 .pl-choix.risque : fond #2e2114 (46,33,20)  bord #8a6a22 (138,106,34)
# Controle positif : sur la REFERENCE, la meme sonde doit retrouver #1e242b / #303a44 sur .pl-item.
# Controle negatif : la meme sonde sur la vitre .pl-vitre (degrade #232b33->#1a2027) doit rendre
#   des valeurs DIFFERENTES en haut et en bas (donc l instrument voit un degrade).
from PIL import Image
import statistics as st
def med(im,x0,y0,x1,y1):
    px=im.load(); r=[];g=[];b=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]; r.append(c[0]); g.append(c[1]); b.append(c[2])
    return (int(st.median(r)),int(st.median(g)),int(st.median(b)))
def hexs(c): return '#%02x%02x%02x'%c
ref=Image.open('../reference-1080x2102.png').convert('RGB'); print('reference',ref.size)
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture  ',cap.size)
print('CONTROLE POSITIF  ref .pl-item aplat  (x 60..80, y 975..1020) =', med(ref,60,975,80,1020), hexs(med(ref,60,975,80,1020)), ' CSS #1e242b')
print('CONTROLE POSITIF  ref .pl-item bord   (x 50..53, y 985..1020) =', med(ref,50,985,53,1020), hexs(med(ref,50,985,53,1020)), ' CSS #303a44')
print('CONTROLE NEGATIF  ref .pl-vitre haut  (x 700..900, y 655..665) =', hexs(med(ref,700,655,900,665)))
print('CONTROLE NEGATIF  ref .pl-vitre bas   (x 700..900, y 840..855) =', hexs(med(ref,700,840,900,855)))
print()
print('CAPTURE — aplat des 3 cartes (fenetre 120x40 a gauche, hors texte) :')
for nom,y in [('1 Commis d office (=.pris attendu)',690),('2 Un cabinet (=neutre attendu)',871),('3 La filiere (=.risque attendu)',1052)]:
    c=med(cap,60,y,180,y+30); print('   carte %-36s = %s %s' % (nom,c,hexs(c)))
print()
print('CAPTURE — recherche d un BORD : colonne x=55..70 a mi-hauteur de chaque carte')
px=cap.load()
for nom,y in [('carte1',750),('carte2',930),('carte3',1110)]:
    print('   %s y=%d : %s' % (nom,y,[ (x,px[x,y]) for x in range(53,64) ]))
print()
print('CAPTURE — rayon du coin haut-gauche de la carte 1 : premier x non-fond par ligne')
for y in range(668,690):
    xs=None
    for x in range(40,120):
        if px[x,y]!=(13,13,13): xs=x; break
    print('     y=%d  x0=%s  couleur=%s'%(y,xs,px[xs,y] if xs else None))
print()
print('REFERENCE — rayon du coin haut-gauche de l item 1 (CSS radius 2px x3,6=7,2px)')
pr=ref.load()
for y in range(958,975):
    xs=None
    for x in range(40,120):
        c=pr[x,y]
        if abs(c[0]-23)>4 or abs(c[1]-27)>4: xs=x; break
    print('     y=%d  x0=%s  couleur=%s'%(y,xs,pr[xs,y] if xs else None))
