# Grandeurs r3 a remesurer : F4 (corps du montant), F8 (blanc libelle->valeur), F9 (crenage des micro-libelles),
# F10 (crenage des libelles de bouton), F15 (fond du boitier), couleur de l'or du montant.
from txt import *
def bande(im,box,scale,label,seuil=40):
    cols,base=colonnes(im,box,seuil)
    segs=segments(cols,gap=20,minw=2)
    if not segs: print(f'  {label}: rien'); return None
    ys=[y for x,yy in cols for y in yy]; xs=[x for x,yy in cols if yy]
    px=im.load()
    best=max(((x,y) for x,yy in cols for y in yy),key=lambda p:lum(px[p]))
    # crenage : blanc median entre traits
    lt=segments(cols,gap=1,minw=1)
    blancs=[lt[i+1][0]-lt[i][1]-1 for i in range(len(lt)-1)]
    bm=sorted(blancs)[len(blancs)//2] if blancs else 0
    print(f'  {label}: x {min(xs)/scale:7.2f}..{(max(xs)+1)/scale:7.2f} (chasse {(max(xs)-min(xs)+1)/scale:6.2f}) ; y {min(ys)/scale:7.2f}..{(max(ys)+1)/scale:7.2f} (h {(max(ys)-min(ys)+1)/scale:5.2f}) ; {len(lt)} traits, blanc median {bm/scale:.2f} CSS ; couleur {px[best]}')
    return min(ys),max(ys),min(xs),max(xs)
print('=== REFERENCE ===')
r=op(REF)
a=bande(r,(40,115,290,135),REF_S,'REF libelle ARGENT')
b=bande(r,(40,55,290,110),REF_S,'REF valeur $ 24 850')
print(f'   blanc libelle->valeur (REF) : de y {a[1]} a y {b[0]} = {(b[0]-a[1]-1)/REF_S:.2f} CSS' if a and b else '')
c1=bande(r,(830,110,1150,130),REF_S,'REF libelle JOUR 12 . SOIREE')
d1=bande(r,(1000,55,1150,110),REF_S,'REF valeur 21:40')
print(f'   blanc libelle->valeur droite (REF) : {(d1[0]-c1[1]-1)/REF_S:.2f} CSS')
bande(r,(100,1650,400,1700),REF_S,'REF COLLECTER')
bande(r,(440,1650,740,1700),REF_S,'REF BLANCHIR')
print('   fond du boitier du medaillon (REF) :',med(r,540,60,565,80),med(r,600,150,625,170))
print('=== CAPTURE 2400 ===')
c=op(C24)
a2=bande(c,(100,28,400,72),CAP_S,'CAP libelle ARGENT')
b2=bande(c,(100,72,470,140),CAP_S,'CAP valeur montant')
print(f'   blanc libelle->valeur (CAP) : {(b2[0]-a2[1]-1)/CAP_S:.2f} CSS')
c2=bande(c,(1000,28,1080,62),CAP_S,'CAP libelle JOUR (tronque)')
d2=bande(c,(1000,72,1080,140),CAP_S,'CAP valeur jour (tronque)')
print(f'   blanc libelle->valeur droite (CAP) : {(d2[0]-c2[1]-1)/CAP_S:.2f} CSS')
print('   fond du boitier du medaillon (CAP) :',med(c,495,60,520,80),med(c,570,155,595,172))
c19=op(C19)
bande(c19,(90,1450,380,1520),CAP_S,'CAP COLLECTER')
bande(c19,(410,1450,690,1520),CAP_S,'CAP BLANCHIR')
