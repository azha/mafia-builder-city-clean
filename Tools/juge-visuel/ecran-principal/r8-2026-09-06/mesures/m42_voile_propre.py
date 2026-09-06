# -*- coding: utf-8 -*-
"""m42 - voile du bandeau, mesure PROPRE.
Correction de m40 : la rangee y=8 CSS lisait son 'art nu' a y=95.1 CSS sur la planche 2400,
c'est-a-dire SOUS le fond pose du nom de district (83.5..99.5 CSS) -- fond assombri, donc faux.
On ne garde que y >= 14 CSS (art nu lu a >= 101.1 CSS, hors du fond pose).
Une seule planche fournit l'observation (1920, art natif derriere le voile) ; l'art NU vient de
la planche 2400 (meme art, decalage 240 px, 99.2 % bit-identique -- verifie en m41).
On compare le PIXEL RESULTANT du jeu a celui que la regle du CANON produirait sur le MEME art."""
import sys, math; sys.path.insert(0,'.')
from commun import *
A,f=ouvrir('j1920'); B,_=ouvrir('j2400')
pa=A.load(); pb=B.load()
E=[]
for yc in [14.0,18.0,22.0,26.0,30.0,34.0,38.0,42.0,46.0,49.0]:
    yi=int(yc*f)
    for x in range(0,1080,3):
        art=pb[x,yi+240]; obs=pa[x,yi]
        if max(obs)>150: continue          # encre (montant, libelles, medaillon) exclue
        if abs(obs[0]-obs[2])>35: continue # or / braise exclus
        xc=x/f
        if 150<xc<245: continue            # medaillon et sa lueur
        t=0.090+(0.153-0.090)*(yc/52.0)
        v=(11+2*(yc/52.0), 17+2*(yc/52.0), 27+3*(yc/52.0))
        E.append((art,obs,tuple(t*art[k]+(1-t)*v[k] for k in range(3)),yc))
print("=== m42 : voile du bandeau, %d echantillons (y>=14 CSS, encre et medaillon exclus) ==="%len(E))
for lab,sel in [("art SOMBRE (L<20)",lambda e:L(e[0])<20),("art MOYEN (20..45)",lambda e:20<=L(e[0])<45),
                ("art CLAIR (45..70)",lambda e:45<=L(e[0])<70),("art TRES CLAIR (>=70)",lambda e:L(e[0])>=70)]:
    S=[e for e in E if sel(e)]
    if len(S)<20: print("   %-22s : %d ech."%(lab,len(S))); continue
    ma=tuple(int(mediane([e[0][k] for e in S])) for k in range(3))
    mo=tuple(int(mediane([e[1][k] for e in S])) for k in range(3))
    mc=tuple(int(mediane([e[2][k] for e in S])) for k in range(3))
    print("   %-22s (%5d ech.) art %s | CANON produirait %s L=%.1f | le JEU produit %s L=%.1f | ecart %d/255, %+.1f L"
          %(lab,len(S),ma,mc,L(mc),mo,L(mo),dist_max(mc,mo),L(mo)-L(mc)))
# regression obs = t*art + c sur la planche 1920 seule -> plancher du voile
for k in range(3):
    n=len(E); sx=sum(e[0][k] for e in E); sy=sum(e[1][k] for e in E)
    sxx=sum(e[0][k]**2 for e in E); sxy=sum(e[0][k]*e[1][k] for e in E)
    t=(n*sxy-sx*sy)/float(n*sxx-sx*sx); c=(sy-t*sx)/n
    tc=0.090+(0.153-0.090)*0.6
    print("   canal %s : le JEU rend obs = %.3f*art + %.1f   |  le CANON rend obs = %.3f*art + %.1f"
          %('RGB'[k],t,c,tc,(1-tc)*(11+2*0.6 if k==0 else (17+2*0.6 if k==1 else 27+3*0.6))))
