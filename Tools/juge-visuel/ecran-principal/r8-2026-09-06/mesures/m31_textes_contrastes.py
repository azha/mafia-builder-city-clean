# -*- coding: utf-8 -*-
"""m31 - hauteurs de CAPITALE et CONTRASTES des textes principaux, canon vs jeu.
Capitale = mode des runs verticaux d'encre par colonne (glyphes sans jambage domines).
Contraste = encre mediane du coeur / fond median non-encre de la meme boite."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
from collections import Counter
TOP={'canon':424.52,'j1920':425.39,'j2400':599.61}

def mesure(cle, x0,x1,y0,y1, ink):
    im,f=ouvrir(cle,taire=True); px=im.load()
    E=[];F=[];hs=[]
    for xx in range(int(x0*f),int(x1*f)):
        col=[]
        for yy in range(int(y0*f),int(y1*f)):
            c=px[xx,yy]
            if ink(c): E.append(c); col.append(yy)
            else: F.append(c)
        if col: hs.append((max(col)-min(col)+1)/f)
    if not E or not F: return None
    ce=tuple(int(mediane([c[k] for c in E])) for k in range(3))
    cf=tuple(int(mediane([c[k] for c in F])) for k in range(3))
    m=Counter(round(h*4)/4.0 for h in hs).most_common(2)
    return ce,cf,contraste(ce,cf),m,len(E)

clair=lambda c: min(c)>=120
orv  =lambda c: (c[0]-c[2])>=60 and c[0]>=150
print("=== m31 : capitales et contrastes ===")
CAS=[
 ("ARGENT (lib)",     {'canon':(17,90,10,20),   'j1920':(64,140,12,22),  'j2400':(64,140,12,22)},  clair),
 ("montant",          {'canon':(15,90,20,38),   'j1920':(63,163,24,40),  'j2400':(63,163,24,40)},  orv),
 ("JOUR (lib)",       {'canon':(300,380,10,20), 'j1920':(300,380,12,22), 'j2400':(300,380,12,22)}, clair),
 ("CHALEUR (heatlib)",{'canon':(175,220,52,62), 'j1920':(165,230,57,68), 'j2400':(165,230,57,68)}, clair),
]
for nom,z,ink in CAS:
    out=[]
    for cle in ['canon','j1920','j2400']:
        r=mesure(cle,*z[cle],ink=ink)
        out.append("%s: encre %s fond %s C=%.2f cap %s"%(cle,r[0],r[1],r[2],r[3][0] if r else '-') if r else "%s: -"%cle)
    print("\n-- %s"%nom)
    for o in out: print("     "+o)
print("\n-- textes de la FICHE (offsets depuis le haut de la plaque)")
FICHE=[("sous-titre",44.0,53.0,clair),("libelles de stats",92.0,100.0,clair),("libelles de boutons",125.0,140.0,None)]
for nom,o0,o1,ink in FICHE:
    print("\n-- %s"%nom)
    for cle in ['canon','j1920','j2400']:
        t=TOP[cle]
        f_ink = ink if ink else (lambda c: min(c)>=120 or (c[0]<90 and c[1]<70))
        r=mesure(cle,30,362,t+o0,t+o1,ink=f_ink)
        print("     %-6s : encre %s fond %s C=%.2f cap %s (%d px)"%(cle,r[0],r[1],r[2],r[3],r[4]) if r else "     %s : -"%cle)
print("\n-- libelles du DOCK")
for cle,h in [('canon',696.88),('j1920',696.88),('j2400',871.06)]:
    r=mesure(cle,60,340,h-30.0,h-19.0,ink=clair)
    print("     %-6s : encre %s fond %s C=%.2f cap %s"%(cle,r[0],r[1],r[2],r[3]) if r else "     %s : -"%cle)
print("\n-- separateurs de stats (traits verticaux #ffffff10) et boutons secondaires")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle,taire=True); px=im.load(); t=TOP[cle]
    yy=int((t+80)*f)
    prof=[(xx/f,L(px[xx,yy])) for xx in range(int(30*f),int(362*f))]
    pics=[]
    for k in range(2,len(prof)-2):
        v=prof[k][1]
        if v>prof[k-2][1]+0.6 and v>prof[k+2][1]+0.6 and v<25: pics.append(prof[k][0])
    grp=[]; 
    for p in pics:
        if grp and p-grp[-1][-1]<3: grp[-1].append(p)
        else: grp.append([p])
    print("     %-6s : separateurs a x = %s"%(cle," ".join("%.2f"%(sum(g)/len(g)) for g in grp)))
