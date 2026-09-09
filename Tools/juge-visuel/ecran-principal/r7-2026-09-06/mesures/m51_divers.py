import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
DY={'ref':0.0,'c19':0.0,'c24':174.222}
print("=== A) epaisseur de la barre de ratio (coupe verticale au milieu du remplissage) ===")
for key,xc in [('ref',40.0),('c19',100.0),('c24',100.0)]:
    s=sc(key); im=img(key); d=im.load(); xp=int(round(xc*s))
    vals=[]
    for yp in range(int(38*s),int(50*s)):
        p=d[xp,yp]; vals.append((yp/s,p,lum(p)))
    base=min(v[2] for v in vals); pk=max(vals,key=lambda v:v[2]); half=(pk[2]+base)/2
    i=vals.index(pk); a=i
    while a>0 and vals[a-1][2]>=half: a-=1
    b=i
    while b<len(vals)-1 and vals[b+1][2]>=half: b+=1
    coeur=sum(1 for v in vals if v[2]>=base+0.95*(pk[2]-base))/s
    print("   %-4s NOMINAL (mi-alpha) %.2f..%.2f ⇒ %.2f CSS  |  COEUR %.2f CSS  |  couleur %s"%(key,vals[a][0],vals[b][0],vals[b][0]-vals[a][0]+1/s,coeur,str(pk[1])))
print()
print("=== B) separateurs de stats (traits verticaux) ===")
for key in ['ref','c19','c24']:
    s=sc(key); im=img(key); d=im.load(); dy=DY[key]
    yp=int(round((500+dy)*s)); runs=[]
    for xp in range(int(120*s),int(280*s)):
        p=d[xp,yp]
        if lum(p)>lum(d[xp,yp])*0+0 and 35<lum(p)<110 and p[2]>p[0]:
            if runs and xp==runs[-1][1]+1: runs[-1][1]=xp
            else: runs.append([xp,xp])
    print("   %-4s a y=500 : "%key + " · ".join("x %.2f..%.2f (l=%.2f) %s"%(a/s,(b+1)/s,(b+1-a)/s,str(d[(a+b)//2,yp])) for a,b in runs if (b-a+1)/s>0.2))
print()
print("=== C) plaque de fiche : bords et rayon (bord = premiere ligne/colonne du remplissage sombre) ===")
for key in ['ref','c19','c24']:
    s=sc(key); im=img(key); d=im.load(); dy=DY[key]
    # ligne du filet dore superieur : bord haut. bord bas : derniere ligne ou le fond de plaque est present a x=200
    xp=int(round(200*s)); ys=[]
    for yp in range(int((580+dy)*s),int((605+dy)*s)):
        p=d[xp,yp]
        if lum(p)<40: ys.append(yp/s-dy)
    print("   %-4s bord bas de la plaque a x=200 : %.2f CSS"%(key,max(ys) if ys else -1))
    # bord gauche a mi-hauteur
    yp=int(round((505+dy)*s)); xs=[]
    for xp in range(int(5*s),int(40*s)):
        if lum(d[xp,yp])<40: xs.append(xp/s)
    print("        bord gauche a y=505 : %.2f CSS"%(min(xs) if xs else -1))
