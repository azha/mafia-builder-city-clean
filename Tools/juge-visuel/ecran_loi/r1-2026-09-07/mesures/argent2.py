# RECTIFICATION : la valeur ARGENT n est PAS coupee -- le glyphe euro est entier (crop x8 verifie).
# Ce qui se mesure, c est le DEGAGEMENT entre la derniere encre de la valeur et l anneau du medaillon.
# Et la barre doree : la mesurer SANS le moyeu de l aiguille (borner x < bord gauche de l anneau).
# Controle positif : la barre du CANON doit sortir elle aussi, et plus courte.
# Controle negatif : une ligne au dessus de la barre (y=108) ne doit rendre aucune colonne.
from PIL import Image
def est_or(c):
    r,g,b=c; return r>150 and g>110 and b<140 and (g-b)>25 and (r-g)<90
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture',cap.size)
can=Image.open('../hud-canon-1176.png').convert('RGB'); print('canon  ',can.size)
pc=cap.load(); pn=can.load()
# anneau gauche a chaque y de la bande de la valeur
def anneau_g(y):
    for x in range(300,600):
        c=pc[x,y]
        if c[0]>150 and (c[0]-c[1])>60: return x
print('degagement valeur / anneau, par ligne :')
for y in range(60,105,4):
    enc=[x for x in range(120,600) if est_or(pc[x,y])]
    a=anneau_g(y)
    if enc and a: print('   y=%3d  derniere encre or x=%3d   anneau x=%3d   degagement=%3d px = %.2f CSS-HUD'%(y,max(enc),a,a-max(enc),(a-max(enc))/(1080/392.0)))
print()
print('barre doree sous ARGENT (bornee a x<350 pour exclure le moyeu de l aiguille) :')
for nom,px_,xmax,s,yr in [('capture',pc,350,1080/392.0,(108,135)),('canon',pn,400,1176/392.0,(115,145))]:
    cols={}
    for y in range(*yr):
        for x in range(100,xmax):
            if est_or(px_[x,y]): cols.setdefault(y,[]).append(x)
    for y in sorted(cols):
        v=cols[y]
        if len(v)>50:
            print('   %-8s y=%3d  x %d..%d  longueur %d px = %.1f CSS-HUD'%(nom,y,min(v),max(v),max(v)-min(v)+1,(max(v)-min(v)+1)/s))
            break
print()
print('CONTROLE NEGATIF capture y=108 (au dessus de la barre) :', len([x for x in range(100,350) if est_or(pc[x,108])]))
