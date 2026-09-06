# m20 — (a) le halo du TIRET « ENFREINTES » (compteur 3), (b) la bande interieure haute du cadre.
# Meme instrument que m07 pour (a) ; pour (b), mediane par colonne d'une bande de 20 rangees.
# Controle positif : (a) la meme sonde sur le compteur 3 de la REFERENCE (qui porte « 00 ») doit
#   rendre le profil de la reference, deja mesure sur le compteur 1 (~+28 a d2).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
ENCRE=(127,212,217)
def profil(im, nom, boite, dmax=30):
    p=px(im); X0,Y0,X1,Y1=boite
    encre={(x,y) for y in range(Y0,Y1+1) for x in range(X0,X1+1) if dist(p[x,y],ENCRE)<=30}
    exclus={(x,y) for y in range(Y0,Y1+1) for x in range(X0,X1+1)
            if (x,y) not in encre and p[x,y][0]>80}
    d={q:0 for q in encre}; front=set(encre)
    for k in range(1,dmax+31):
        nf=set()
        for (x,y) in front:
            for dx in (-1,0,1):
                for dy in (-1,0,1):
                    q=(x+dx,y+dy)
                    if q in d or q in exclus: continue
                    if not (X0<=q[0]<=X1 and Y0<=q[1]<=Y1): continue
                    d[q]=k; nf.add(q)
        front=nf
        if not front: break
    par={}
    for q,k in d.items():
        if k: par.setdefault(k,[]).append(lum(p[q]))
    loin=[v for k,vs in par.items() if k>=30 for v in vs]; loin.sort()
    base=loin[len(loin)//2]
    ds=[k for k in range(2,dmax+1,4) if k in par]
    print(f"  {nom} : encre {len(encre)} px ; base {base:.1f}")
    print("     d  : "+" ".join(f"{k:>6}" for k in ds))
    print("     +L : "+" ".join(f"{sum(par[k])/len(par[k])-base:+6.1f}" for k in ds))
ref=ouvrir('reference-1080x2102.png'); cap=ouvrir('capture-1080x2400.png')
print("\n=== (a) compteur 3 : REF « 00 » vs JEU « — » ===")
profil(ref,'REF compteur 3 (00)',(723,706,1027,812))
profil(cap,'JEU compteur 3 (—)',(719,731,1031,837))
print("\n=== (b) bande interieure haute du cadre (entre filet du cadre et panneau d'enseigne) ===")
pr,pc=px(ref),px(cap)
for nm,p,y0,y1 in (('REF',pr,456,479),('JEU',pc,487,509)):
    vals=[]
    for x in range(40,1040,100):
        v=[[],[],[]]
        for y in range(y0,y1):
            c=p[x,y]
            for k in range(3): v[k].append(c[k])
        vals.append((x,tuple(sorted(a)[len(a)//2] for a in v)))
    print(f"  {nm} : "+" ".join(f"x{x}:{c}" for x,c in vals))
