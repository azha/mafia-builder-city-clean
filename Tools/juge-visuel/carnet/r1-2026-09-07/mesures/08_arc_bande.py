# -*- coding: utf-8 -*-
"""Arc du manometre : EPAISSEUR RADIALE de la bande coloree, le long de rayons.
Le centre de l arc est ajuste sur le SEUL secteur TEAL (gauche) : le secteur median est GRIS
dans la reference et le canon, donc invisible a un predicat de couleur (portee declaree).
Controle POSITIF : sur la reference, la bande SVG a une epaisseur nominale de 3 unites sur un
viewBox de 40 -> 3/40 du diametre du manometre ; on verifie que la mesure la retrouve.
"""
from lib_mes import *
import math

def teal(c):
    r,g,b = c
    return b > r+15 and g > r+10 and 50 < g < 210

def cercle3(p1,p2,p3):
    (x1,y1),(x2,y2),(x3,y3)=p1,p2,p3
    d=2*(x1*(y2-y3)+x2*(y3-y1)+x3*(y1-y2))
    ux=((x1*x1+y1*y1)*(y2-y3)+(x2*x2+y2*y2)*(y3-y1)+(x3*x3+y3*y3)*(y1-y2))/d
    uy=((x1*x1+y1*y1)*(x3-x2)+(x2*x2+y2*y2)*(x1-x3)+(x3*x3+y3*y3)*(x2-x1))/d
    return ux,uy,math.hypot(x1-ux,y1-uy)

def bord_sup(im, xa, xb, ya, yb):
    p=im.load(); out=[]
    for x in range(xa,xb+1):
        for y in range(ya,yb+1):
            if teal(p[x,y]): out.append((x,y)); break
    return out

def etude(chemin, nom, xa, xb, ya, yb, Dmedaillon):
    im=ouvrir(chemin); p=im.load()
    b=bord_sup(im,xa,xb,ya,yb)
    print('   %-9s secteur TEAL : %d colonnes x=%d..%d' % (nom,len(b),b[0][0],b[-1][0]))
    g,m,d=b[0],b[len(b)//2],b[-1]
    ux,uy,R=cercle3(g,m,d)
    res=[abs(math.hypot(q[0]-ux,q[1]-uy)-R) for q in b]
    print('        cercle du BORD EXTERIEUR : centre=(%.1f,%.1f) R=%.1f px  residu max=%.2f moy=%.2f px'
          % (ux,uy,R,max(res),sum(res)/len(res)))
    # epaisseur radiale le long de rayons dans le secteur teal
    ep=[]
    for adeg in range(105,171,8):
        a=math.radians(adeg); n=0
        for r10 in range(int(R*10)+120, 0, -1):
            r=r10/10.0
            x=int(round(ux+r*math.cos(a))); y=int(round(uy-r*math.sin(a)))
            if 0<=x<im.size[0] and 0<=y<im.size[1] and teal(p[x,y]): n+=1
        ep.append((adeg, n/10.0))
    vals=[v for _,v in ep if v>0]
    moy=sum(vals)/len(vals)
    et=(sum((v-moy)**2 for v in vals)/len(vals))**0.5
    print('        epaisseur radiale par angle : %s' % ' '.join('%d:%.1f'%e for e in ep))
    print('        moyenne=%.2f px  ecart-type=%.2f px  -> %.4f du diametre du medaillon (%d px)'
          % (moy,et,moy/Dmedaillon,Dmedaillon))
    return moy/Dmedaillon

print('   nominal SVG serie 6 / canon : stroke-width 3 sur viewBox 40 de large ; le manometre')
print('   du cadre fait ~ (40/40) de sa boite -> epaisseur attendue ~ 3/40 = 0,075 du diametre')
print()
r1=etude('../reference-1080x2102.png','REFERENCE',478,536,55,130, 180)
print()
r2=etude('../hud-canon-1176.png','CANON',536,586,60,130, 192)
print()
r3=etude('../capture-1080x2400.png','CAPTURE',488,534,50,120, 184)
print()
print('   RECAP epaisseur relative de la bande : reference=%.4f  canon=%.4f  CAPTURE=%.4f' % (r1,r2,r3))
print('   rapport capture/reference = %.2f x' % (r3/r1))
