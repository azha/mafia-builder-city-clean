# -*- coding: utf-8 -*-
"""m41 - PREMISSE de m30/m39/m40 : l'art du district est-il le MEME a 1080x1920 et a 1080x2400,
decale de 87.11 CSS (240 px) ? Si non, toute mesure a 'deux fonds' est nulle.
Test : hors chrome, hors plaque, hors scrim -- compter les pixels IDENTIQUES entre
j1920(x,y) et j2400(x,y+240px), et balayer le decalage pour trouver le meilleur."""
import sys, math; sys.path.insert(0,'.')
from commun import *
A,f=ouvrir('j1920'); B,_=ouvrir('j2400')
pa=A.load(); pb=B.load()
print("=== m41 : premisse du 'deux fonds' ===")
print("   zone de test : x 0..1080 px, y 300..1100 px a 1920 (art pur, sous le scrim, au-dessus de la plaque)")
best=[]
for d in range(230,251,1):
    n=0; tot=0; e=0
    for y in range(300,1100,7):
        for x in range(0,1080,7):
            if y+d>=2400: continue
            c1=pa[x,y]; c2=pb[x,y+d]; tot+=1
            if c1==c2: n+=1
            e+=dist_max(c1,c2)
    best.append((n,d,tot,e/float(tot)))
best.sort(reverse=True)
for n,d,tot,e in best[:5]:
    print("   decalage %d px : %d/%d pixels IDENTIQUES (%.1f %%) ; ecart max-canal moyen %.2f"%(d,n,tot,100.0*n/tot,e))
n,d,tot,e=best[0]
print("\n   => meilleur decalage = %d px = %.2f CSS"%(d,d/f))
# zone derriere le bandeau : y 0..145 px a 1920
print("\n   memes comptes pour la zone qui sert de FOND au bandeau (y 20..140 px a 1920) :")
for d in [d, 240]:
    n=0;tot=0;e=0
    for y in range(20,141,2):
        for x in range(0,1080,3):
            c1=pa[x,y]; c2=pb[x,y+d]; tot+=1
            if c1==c2: n+=1
            e+=dist_max(c1,c2)
    print("      decalage %d : %d/%d identiques (%.1f %%) ; ecart moyen %.2f  <- ces pixels sont SOUS le voile a 1920"%(d,n,tot,100.0*n/tot,e/float(tot)))
print("\n   [le second compte doit etre BAS : a 1920 ces pixels sont vus a travers le voile,")
print("    a 2400 ils sont a nu. C'est precisement ce qu'on mesure. Le premier compte, lui,")
print("    doit etre HAUT : il prouve que l'art est le meme et que le decalage est bon.]")
