# -*- coding: utf-8 -*-
"""m40 - LA comparaison qui vaut : le PIXEL RESULTANT sur le MEME fond.
Pour chaque pixel de fond REEL (l'art du jeu), on calcule ce que la regle du CANON produirait
(melange sRGB, comme Chrome) et on le compare a ce que le jeu produit vraiment.
Voile du bandeau : canon `.barre` = linear-gradient(180deg,#0b111be8,#0d131ed8) -> voile (11,17,27)
a alpha .910 en y=0 et (13,19,30) a alpha .847 en y=52.
Plaque de fiche : canon `.fiche` = linear-gradient(180deg,#0c1320ef,#080d17f6) -> (12,19,32) a
alpha .937 en haut et (8,13,23) a alpha .965 en bas."""
import sys, math; sys.path.insert(0,'.')
from commun import *
print("=== m40 : pixel resultant, meme fond ===")

# ---- BANDEAU
A,f=ouvrir('j1920'); B,_=ouvrir('j2400')
pa=A.load(); pb=B.load(); DY=87.11
E=[]
for y in [8.0,14.0,20.0,30.0,38.0,44.0,48.0]:
    for x in range(240,392,3):
        art=pb[int(x*f),int((y+DY)*f)]
        obs=pa[int(x*f),int(y*f)]
        t = 0.090 + (0.153-0.090)*(y/52.0)
        voile = tuple(11+(13-11)*(y/52.0) for _ in [0]) # calcule par canal ci-dessous
        v=(11+(13-11)*(y/52.0), 17+(19-17)*(y/52.0), 27+(30-27)*(y/52.0))
        canon=tuple(t*art[k]+(1-t)*v[k] for k in range(3))
        E.append((art,obs,canon,y))
print("\n-- VOILE DU BANDEAU (357 -> %d echantillons ; fond = l'art reel du jeu)"%len(E))
for lab,sel in [("art SOMBRE (L<25)",lambda e:L(e[0])<25),("art MOYEN (25<=L<55)",lambda e:25<=L(e[0])<55),("art CLAIR (L>=55)",lambda e:L(e[0])>=55)]:
    S=[e for e in E if sel(e)]
    if len(S)<8: print("   %-22s : %d ech."%(lab,len(S))); continue
    ma=tuple(int(mediane([e[0][k] for e in S])) for k in range(3))
    mo=tuple(int(mediane([e[1][k] for e in S])) for k in range(3))
    mc=tuple(int(mediane([e[2][k] for e in S])) for k in range(3))
    print("   %-22s (%4d ech.) art %s -> CANON produirait %s (L %.1f) | le JEU produit %s (L %.1f) | ecart max-canal %d, %+.1f L"
          %(lab,len(S),ma,mc,L(mc),mo,L(mo),dist_max(mc,mo),L(mo)-L(mc)))
amp_c=[L(e[2]) for e in E]; amp_o=[L(e[1]) for e in E]
print("   AMPLITUDE de l'art vue a travers le voile : canon %.1f L (p5..p95) | jeu %.1f L"
      %(sorted(amp_c)[int(.95*len(amp_c))]-sorted(amp_c)[int(.05*len(amp_c))],
        sorted(amp_o)[int(.95*len(amp_o))]-sorted(amp_o)[int(.05*len(amp_o))]))

# ---- PLAQUE
A,f=ouvrir('j2400'); B,_=ouvrir('d2400')
pa=A.load(); pb=B.load()
E=[]
h0,h1=599.61,769.11
for y in range(int((h0+6)*f),int((h1-6)*f),2):
    for x in range(int(25*f),int(370*f),3):
        cv=pa[x,y]; cn=pb[x,y]
        if max(cv)>110 or abs(cv[0]-cv[2])>40: continue
        u=(y/f-h0)/(h1-h0)
        t=0.063+(0.035-0.063)*u
        v=(12+(8-12)*u, 19+(13-19)*u, 32+(23-32)*u)
        E.append((cn,cv,tuple(t*cn[k]+(1-t)*v[k] for k in range(3))))
print("\n-- PLAQUE DE FICHE (%d echantillons, encre exclue)"%len(E))
for lab,sel in [("art SOMBRE (L<25)",lambda e:L(e[0])<25),("art MOYEN (25<=L<55)",lambda e:25<=L(e[0])<55),("art CLAIR (L>=55)",lambda e:L(e[0])>=55)]:
    S=[e for e in E if sel(e)]
    if len(S)<20: print("   %-22s : %d ech."%(lab,len(S))); continue
    ma=tuple(int(mediane([e[0][k] for e in S])) for k in range(3))
    mo=tuple(int(mediane([e[1][k] for e in S])) for k in range(3))
    mc=tuple(int(mediane([e[2][k] for e in S])) for k in range(3))
    print("   %-22s (%5d ech.) art %s -> CANON %s (L %.1f) | JEU %s (L %.1f) | ecart max-canal %d, %+.1f L"
          %(lab,len(S),ma,mc,L(mc),mo,L(mo),dist_max(mc,mo),L(mo)-L(mc)))
